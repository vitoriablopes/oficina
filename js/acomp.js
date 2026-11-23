// Acompanhar a matéria: anotações livres e avaliações (pesos, notas, nota necessária e previsão).
import { esc, plural, toast, confirmBox, fmtDate, modal } from './util.js';
import { Store, save } from './store.js';

const num = (v) => { const t = String(v ?? '').trim().replace(',', '.'); if (t === '') return null; const n = Number(t); return Number.isFinite(n) ? n : null; };
const fmt = (n, d = 2) => (n == null ? '—' : (Math.round(n * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: d }));
const uid = () => 'av' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function acompOf(mkey) {
  const A = (Store.state.progresso.acomp ||= {});
  const a = (A[mkey] ||= { notas: '', media: 5, max: 10, avs: [] }); a.regras ||= []; return a;
}
const persist = () => save('progresso');

/** Todos os cálculos. */
export function calc(ac) {
  const avs = ac.avs;
  const P = avs.reduce((a, x) => a + (num(x.peso) || 0), 0);
  const M = num(ac.media) ?? 5, MAX = num(ac.max) ?? 10;
  const feitas = avs.filter((x) => x.nota != null);
  const faltam = avs.filter((x) => x.nota == null);
  const pontos = feitas.reduce((a, x) => a + x.peso * x.nota, 0);
  const res = { P, M, MAX, feitas: feitas.length, faltam: faltam.length, final: null, parcial: null, necessaria: null, nIncl: 0, semPrev: [], previsao: null, prevFaltando: [] };
  if (!avs.length || P <= 0) return res;
  if (!faltam.length) res.final = pontos / P;
  res.parcial = feitas.length ? pontos / feitas.reduce((a, x) => a + x.peso, 0) : null;
  // nota necessária: as que faltam e estão incluídas recebem a mesma nota x; as deixadas de fora usam a previsão
  const incl = faltam.filter((x) => !x.fora);
  const fora = faltam.filter((x) => x.fora);
  res.nIncl = incl.length;
  res.semPrev = fora.filter((x) => x.prev == null).map((x) => x.nome || 'sem nome');
  const pf = fora.reduce((a, x) => a + x.peso * (x.prev ?? 0), 0);
  const pi = incl.reduce((a, x) => a + x.peso, 0);
  if (incl.length && pi > 0) res.necessaria = (M * P - pontos - pf) / pi;
  // previsão: nota real se houver, senão a previsão
  res.prevFaltando = faltam.filter((x) => x.prev == null).map((x) => x.nome || 'sem nome');
  if (!res.prevFaltando.length) res.previsao = (pontos + faltam.reduce((a, x) => a + x.peso * x.prev, 0)) / P;
  return res;
}
// ---------------- Condições (regras com nome) ----------------
const OPS = { '>=': (a, b) => a >= b - 1e-9, '>': (a, b) => a > b + 1e-9, '<': (a, b) => a < b - 1e-9, '<=': (a, b) => a <= b + 1e-9 };
export const OP_LABEL = { '>=': '≥', '>': '>', '<': '<', '<=': '≤' };
const getReal = (x) => x.nota;
const getPrev = (x) => (x.nota != null ? x.nota : x.prev);
function regraVal(ac, r, get) {
  let W = 0, S = 0;
  for (const [id, w] of Object.entries(r.pesos || {})) {
    if (!w) continue;
    const av = ac.avs.find((a) => a.id === id); if (!av) continue;
    const n = get(av); if (n == null) return null;
    W += w; S += w * n;
  }
  return W > 0 ? S / W : null;
}
function condOk(ac, r, get) {
  const c = r.cond;
  if (!c || !c.regra) return true;
  const ref = ac.regras.find((x) => x.id === c.regra); if (!ref) return true;
  const v = regraVal(ac, ref, get);
  if (v == null || c.valor == null) return null;
  return OPS[c.op || '>='](v, c.valor);
}
/** Qual condição vale e qual é a nota final, com as notas reais ou com as previsões. */
export function finalPorRegras(ac, get) {
  for (const r of ac.regras) {
    const ok = condOk(ac, r, get);
    if (ok === null) return { regra: null, valor: null, pendente: true };
    if (ok) return { regra: r, valor: regraVal(ac, r, get) };
  }
  return { regra: null, valor: null };
}
/** Nota necessária nas avaliações que faltam desta condição (mesma nota em todas). */
export function necessariaRegra(ac, r) {
  const M = num(ac.media) ?? 5;
  let alvo = num(r.minimo) ?? M;
  if (r.cond?.regra === r.id && (r.cond.op === '>=' || r.cond.op === '>') && r.cond.valor != null) alvo = Math.max(alvo, r.cond.valor);
  let W = 0, S = 0, Wi = 0, nIncl = 0, semPrev = [];
  for (const [id, w] of Object.entries(r.pesos || {})) {
    if (!w) continue;
    const av = ac.avs.find((a) => a.id === id); if (!av) continue;
    W += w;
    if (av.nota != null) S += w * av.nota;
    else if (av.fora) { S += w * (av.prev ?? 0); if (av.prev == null) semPrev.push(av.nome || 'sem nome'); }
    else { Wi += w; nIncl++; }
  }
  if (!W) return { alvo, x: null, nIncl: 0, semPrev };
  return { alvo, x: Wi > 0 ? (alvo * W - S) / Wi : null, nIncl, semPrev, atual: Wi === 0 ? S / W : null };
}
export function regraDesc(ac, r) {
  const parts = Object.entries(r.pesos || {}).filter(([, w]) => w).map(([id, w]) => { const av = ac.avs.find((a) => a.id === id); return av ? `${av.nome || '?'}${w !== 1 ? '×' + fmt(w) : ''}` : null; }).filter(Boolean);
  return parts.join(' + ') || 'nenhuma avaliação';
}
export function presetPF(ac) {
  const get = (nome) => ac.avs.find((a) => (a.nome || '').toUpperCase() === nome) || (ac.avs.push({ id: uid(), nome, data: '', peso: 1, nota: null, prev: null, fora: false }), ac.avs[ac.avs.length - 1]);
  const p1 = get('P1'), p2 = get('P2'), pf = get('PF');
  const r1 = { id: uid(), nome: 'Média parcial', pesos: { [p1.id]: 1, [p2.id]: 1 }, cond: null, minimo: 7 };
  r1.cond = { regra: r1.id, op: '>=', valor: 7 };
  const r2 = { id: uid(), nome: 'Com prova final', pesos: { [p1.id]: 1, [p2.id]: 1, [pf.id]: 2 }, cond: { regra: r1.id, op: '<', valor: 7 }, minimo: 5 };
  ac.regras = [r1, r2]; ac.modo = 'condicoes';
}

/** Próxima avaliação sem nota, com data. */
export function proxima(mkey) {
  const ac = Store.state.progresso.acomp?.[mkey];
  if (!ac) return null;
  const hoje = new Date().toISOString().slice(0, 10);
  return ac.avs.filter((x) => x.nota == null && x.data && x.data >= hoje).sort((a, b) => a.data.localeCompare(b.data))[0] || null;
}
const dias = (d) => Math.round((new Date(d + 'T12:00') - new Date(new Date().toISOString().slice(0, 10) + 'T12:00')) / 864e5);
export const quando = (d) => { const n = dias(d); return n === 0 ? 'hoje' : n === 1 ? 'amanhã' : n > 1 ? `em ${n} dias` : `há ${-n} dias`; };

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const SEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export function renderAcomp(el, m) {
  const ac = acompOf(m.key);
  el.innerHTML = `<div class="stack">
    <div class="card stack-s acomp-main">
      <div class="row between"><h3>Avaliações</h3><button class="btn sm primary" data-add>+ Avaliação</button></div>
      <div data-summary></div>
      <div data-table></div>
      <details class="acomp-cfg-box" data-cfgbox ${ac.avs.length ? '' : 'open'}><summary>Configurar o cálculo <span class="tiny muted" data-cfgdesc></span></summary>
        <div class="stack-s" style="padding-top:10px">
          <div class="row" style="gap:14px">
            <div><label class="lbl">Média para passar</label><input class="input" data-cfg="media" inputmode="decimal" style="width:100px" value="${esc(fmt(num(ac.media)))}"></div>
            <div><label class="lbl">Nota máxima</label><input class="input" data-cfg="max" inputmode="decimal" style="width:100px" value="${esc(fmt(num(ac.max)))}"></div>
          </div>
          <div><label class="lbl">Como a nota é calculada</label><div class="seg" data-modo><button data-v="simples" class="${ac.modo !== 'condicoes' ? 'on' : ''}">Média ponderada</button><button data-v="condicoes" class="${ac.modo === 'condicoes' ? 'on' : ''}">Com condições</button></div></div>
          <div data-regras-box ${ac.modo === 'condicoes' ? '' : 'hidden'} class="stack-s">
            <p class="small muted" style="margin:0">Cada condição é uma média com nome. A nota final é a da <b>primeira condição que valer</b>, de cima para baixo.</p>
            <div data-regras class="stack-s"></div>
            <div class="row" style="gap:6px"><button class="btn sm" data-addr>+ Condição</button><button class="btn sm ghost" data-preset>Usar modelo P1, P2 e PF</button></div>
          </div>
        </div></details>
    </div>
    <div class="card stack-s"><div class="row between"><h3>Anotações</h3><span class="tiny muted" data-saved></span></div>
      <textarea class="textarea notas-livres" data-notas placeholder="Escreva aqui o que quiser sobre a matéria: combinados com o professor, sala, monitoria, o que cai na prova…">${esc(ac.notas || '')}</textarea></div>
  </div>`;
  const sum = el.querySelector('[data-summary]'), tbl = el.querySelector('[data-table]'), rl = el.querySelector('[data-regras]');
  const M = () => num(ac.media) ?? 5, MAX = () => num(ac.max) ?? 10;
  const tag = (v, ok) => `<span class="${ok ? 'ok-t' : 'bad-t'}">${fmt(v)}</span>`;
  const need = (x, nIncl, alvo) => x == null ? null : x <= 0 ? '<b class="ok-t">garantido</b>' : x > MAX() ? `<b class="bad-t">${fmt(x)}</b> <span class="tiny muted">acima do máximo</span>` : `<b>${fmt(x)}</b> <span class="tiny muted">${nIncl === 1 ? 'na que falta' : `em cada uma das ${nIncl}`}${alvo != null ? ` para chegar a ${fmt(alvo)}` : ''}</span>`;

  // ---------- resumo ----------
  function drawSummary() {
    el.querySelector('[data-cfgdesc]').textContent = `· média ${fmt(M())}${ac.modo === 'condicoes' ? ` · ${plural(ac.regras.length, 'condição', 'condições')}` : ' · média ponderada'}`;
    if (!ac.avs.length) { sum.innerHTML = '<p class="small muted" style="margin:0">Adicione as avaliações da matéria (provas, trabalhos, listas) e configure o cálculo.</p>'; return; }
    let finalH, prevH, needH;
    if (ac.modo === 'condicoes' && ac.regras.length) {
      const fr = finalPorRegras(ac, getReal), fp = finalPorRegras(ac, getPrev);
      const ok = (f) => f.valor != null && f.valor >= (num(f.regra?.minimo) ?? M());
      finalH = fr.valor != null ? `${tag(fr.valor, ok(fr))}<small>${esc(fr.regra.nome)}</small>` : `—<small>${fr.regra ? 'vale “' + esc(fr.regra.nome) + '”' : 'faltam notas'}</small>`;
      prevH = fp.valor != null ? `${tag(fp.valor, ok(fp))}<small>${esc(fp.regra.nome)}</small>` : '—<small>faltam previsões</small>';
      needH = ac.regras.map((r) => { const n = necessariaRegra(ac, r); const h = n.x == null ? (n.atual != null ? tag(n.atual, n.atual >= n.alvo) : '<span class="muted">—</span>') : need(n.x, n.nIncl, n.alvo); return `<div class="need-row"><span class="need-k">${esc(r.nome || 'Condição')}</span><span>${h}</span></div>`; }).join('');
    } else {
      const r = calc(ac);
      finalH = r.final != null ? `${tag(r.final, r.final >= r.M)}<small>${r.final >= r.M ? 'aprovada ✦' : 'abaixo da média'}</small>` : `—<small>falta${r.faltam === 1 ? '' : 'm'} ${plural(r.faltam, 'nota')}</small>`;
      prevH = r.previsao != null ? `${tag(r.previsao, r.previsao >= r.M)}<small>com suas previsões</small>` : '—<small>faltam previsões</small>';
      const h = !r.faltam ? '<span class="muted">nenhuma faltando</span>' : !r.nIncl ? '<span class="muted">todas fora do cálculo</span>' : need(r.necessaria, r.nIncl, null);
      needH = `<div class="need-row"><span class="need-k">Para a média ${fmt(r.M)}</span><span>${h}</span></div>`;
    }
    sum.innerHTML = `<div class="acomp-sum3"><div class="as-box"><div class="k">Nota final</div><div class="v">${finalH}</div></div><div class="as-box"><div class="k">Previsão</div><div class="v">${prevH}</div></div></div>
      <div class="as-need"><div class="k">Nota que precisa tirar</div>${needH}</div>`;
  }

  // ---------- tabela compacta ----------
  function drawTable() {
    const P = ac.avs.reduce((a, x) => a + (num(x.peso) || 0), 0);
    const hoje = new Date().toISOString().slice(0, 10);
    const sorted = [...ac.avs].sort((a, b) => (a.data || '9999').localeCompare(b.data || '9999'));
    tbl.innerHTML = !sorted.length ? '' : `<div class="av-table">${sorted.map((x) => {
      const d = x.data ? new Date(x.data + 'T12:00') : null;
      const passada = x.data && x.data < hoje;
      const peso = ac.modo === 'condicoes' ? '' : P ? `${fmt(((num(x.peso) || 0) / P) * 100, 0)}%` : '';
      return `<button class="av-row ${x.nota != null ? 'done' : ''} ${x.fora && x.nota == null ? 'fora' : ''} ${passada && x.nota == null ? 'late' : ''}" data-edit="${x.id}">
        <span class="av-date">${d ? `<b>${d.getDate()}</b><i>${MESES[d.getMonth()]}</i>` : '<b>?</b><i>data</i>'}</span>
        <span class="av-name"><b>${esc(x.nome || 'Avaliação')}</b><small>${d ? `${SEM[d.getDay()]} · ${x.nota == null ? quando(x.data) : 'feita'}` : 'sem data'}${x.fora && x.nota == null ? ' · fora do cálculo' : ''}</small></span>
        ${peso ? `<span class="av-peso">${peso}</span>` : ''}
        <span class="av-nota">${x.nota != null ? `<b>${fmt(x.nota)}</b>` : x.prev != null ? `<em title="previsão">~${fmt(x.prev)}</em>` : '<span class="muted">—</span>'}</span>
      </button>`;
    }).join('')}</div>`;
    tbl.querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => editAv(ac.avs.find((x) => x.id === b.dataset.edit))));
  }
  const all = () => { drawTable(); drawSummary(); drawRegras(); };

  // ---------- editar avaliação (janela) ----------
  function editAv(x, nova = false) {
    const cond = ac.modo === 'condicoes';
    modal(`<div class="stack"><h3>${nova ? 'Nova avaliação' : 'Avaliação'}</h3>
      <div><label class="lbl">Nome</label><input class="input" data-f="nome" value="${esc(x.nome || '')}" placeholder="ex.: P1, Trabalho, PF"></div>
      <div class="av-grid">
        <div><label class="lbl">Data</label><input class="input" type="date" data-f="data" value="${esc(x.data || '')}"></div>
        ${cond ? '' : `<div><label class="lbl">Peso</label><input class="input" data-f="peso" inputmode="decimal" value="${esc(fmt(x.peso))}"></div>`}
        <div><label class="lbl">Nota</label><input class="input" data-f="nota" inputmode="decimal" placeholder="ainda não" value="${x.nota != null ? esc(fmt(x.nota)) : ''}"></div>
        <div><label class="lbl">Previsão</label><input class="input" data-f="prev" inputmode="decimal" placeholder="quanto acha" value="${x.prev != null ? esc(fmt(x.prev)) : ''}"></div>
      </div>
      ${cond ? '<p class="tiny muted" style="margin:0">Os pesos desta avaliação ficam em Configurar o cálculo › Condições.</p>' : ''}
      <label class="switch"><input type="checkbox" data-incl ${x.fora ? '' : 'checked'}><span class="tg"></span>Conta na nota que precisa tirar <span class="tiny muted">(desligado: usa a previsão)</span></label>
      <div class="row between">${nova ? '<span></span>' : '<button class="btn danger" data-del>Excluir</button>'}<div class="row" style="gap:6px"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-ok>Salvar</button></div></div></div>`, (box, close) => {
      box.querySelector('[data-f="nome"]').focus();
      box.querySelector('[data-ok]').onclick = () => {
        const g = (k) => box.querySelector(`[data-f="${k}"]`);
        x.nome = g('nome').value.trim() || 'Avaliação';
        x.data = g('data').value;
        if (g('peso')) x.peso = num(g('peso').value) ?? 0;
        x.nota = num(g('nota').value); x.prev = num(g('prev').value);
        x.fora = !box.querySelector('[data-incl]').checked;
        if (nova) {
          ac.avs.push(x);
          if (ac.modo === 'condicoes') ac.regras.forEach((r) => { if (!r.cond) (r.pesos ||= {})[x.id] = 1; });
        }
        persist(); close(); all();
      };
      box.querySelector('[data-del]')?.addEventListener('click', async () => {
        close();
        if (!(await confirmBox(`Excluir a avaliação “${esc(x.nome || 'sem nome')}”?`, { ok: 'Excluir', danger: true }))) return;
        ac.avs = ac.avs.filter((a) => a !== x); ac.regras.forEach((r) => { if (r.pesos) delete r.pesos[x.id]; });
        persist(); all();
      });
    });
  }
  el.querySelector('[data-add]').onclick = () => editAv({ id: uid(), nome: `P${ac.avs.filter((x) => /^P\d+$/.test(x.nome || '')).length + 1}`, data: '', peso: 1, nota: null, prev: null, fora: false }, true);

  // ---------- condições ----------
  function drawRegras() {
    if (!rl) return;
    rl.innerHTML = !ac.regras.length ? '<p class="small muted" style="margin:0">Nenhuma condição ainda.</p>' : ac.regras.map((r, i) => {
      const c = r.cond?.regra ? ac.regras.find((x) => x.id === r.cond.regra) : null;
      return `<button class="regra-row" data-rid="${r.id}"><span class="n-chip">${i + 1}</span><span class="grow" style="text-align:left"><b>${esc(r.nome || 'Condição')}</b><small>${esc(regraDesc(ac, r))} · ${c ? `vale se ${esc(c.nome)} ${OP_LABEL[r.cond.op || '>=']} ${fmt(r.cond.valor)}` : 'vale sempre'} · passa com ${fmt(num(r.minimo) ?? M())}</small></span><span class="muted">›</span></button>`;
    }).join('');
    rl.querySelectorAll('[data-rid]').forEach((b) => (b.onclick = () => editRegra(ac.regras.find((x) => x.id === b.dataset.rid))));
  }
  function editRegra(r, nova = false) {
    const i = ac.regras.indexOf(r);
    modal(`<div class="stack"><h3>${nova ? 'Nova condição' : 'Condição'}</h3>
      <div><label class="lbl">Nome</label><input class="input" data-n value="${esc(r.nome || '')}" placeholder="ex.: Média parcial"></div>
      <div><label class="lbl">Pesos (vazio = não entra)</label><div class="pesos-grid">${ac.avs.map((a) => `<label class="peso-in"><span>${esc(a.nome || '?')}</span><input class="input" data-w="${a.id}" inputmode="decimal" value="${r.pesos?.[a.id] ? esc(fmt(r.pesos[a.id])) : ''}" placeholder="—"></label>`).join('') || '<span class="small muted">Adicione as avaliações primeiro.</span>'}</div></div>
      <div><label class="lbl">Vale quando</label><div class="row" style="gap:6px">
        <select class="select" data-cr style="width:auto"><option value="">sempre</option>${ac.regras.concat(nova ? [r] : []).map((x) => `<option value="${x.id}" ${r.cond?.regra === x.id ? 'selected' : ''}>${x === r ? 'esta condição' : esc(x.nome || 'condição')}</option>`).join('')}</select>
        <select class="select" data-cop style="width:auto">${Object.entries(OP_LABEL).map(([k, l]) => `<option value="${k}" ${(r.cond?.op || '>=') === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <input class="input" data-cv inputmode="decimal" style="width:80px" value="${r.cond?.valor != null ? esc(fmt(r.cond.valor)) : esc(fmt(M()))}"></div></div>
      <div class="row" style="gap:8px"><label class="lbl" style="margin:0">Passa com</label><input class="input" data-rmin inputmode="decimal" style="width:80px" value="${r.minimo != null ? esc(fmt(r.minimo)) : ''}" placeholder="${esc(fmt(M()))}"></div>
      <div class="row between">${nova ? '<span></span>' : `<div class="row" style="gap:6px"><button class="btn danger" data-del>Excluir</button><button class="icon-btn sm" data-mv="-1" ${i <= 0 ? 'disabled' : ''} title="Subir">↑</button><button class="icon-btn sm" data-mv="1" ${i >= ac.regras.length - 1 ? 'disabled' : ''} title="Descer">↓</button></div>`}
        <div class="row" style="gap:6px"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-ok>Salvar</button></div></div></div>`, (box, close) => {
      const cr = box.querySelector('[data-cr]');
      const sync = () => { box.querySelector('[data-cop]').hidden = box.querySelector('[data-cv]').hidden = !cr.value; };
      cr.onchange = sync; sync();
      box.querySelector('[data-ok]').onclick = () => {
        r.nome = box.querySelector('[data-n]').value.trim() || 'Condição';
        r.pesos = {}; box.querySelectorAll('[data-w]').forEach((w) => { const v = num(w.value); if (v) r.pesos[w.dataset.w] = v; });
        r.cond = cr.value ? { regra: cr.value, op: box.querySelector('[data-cop]').value, valor: num(box.querySelector('[data-cv]').value) } : null;
        r.minimo = num(box.querySelector('[data-rmin]').value);
        if (nova) ac.regras.push(r);
        persist(); close(); all();
      };
      box.querySelectorAll('[data-mv]').forEach((b) => (b.onclick = () => { const j = i + +b.dataset.mv; [ac.regras[i], ac.regras[j]] = [ac.regras[j], ac.regras[i]]; persist(); close(); all(); }));
      box.querySelector('[data-del]')?.addEventListener('click', async () => {
        close();
        if (!(await confirmBox(`Excluir a condição “${esc(r.nome || 'sem nome')}”?`, { ok: 'Excluir', danger: true }))) return;
        ac.regras = ac.regras.filter((x) => x !== r); ac.regras.forEach((x) => { if (x.cond?.regra === r.id) x.cond = null; });
        persist(); all();
      });
    });
  }
  el.querySelector('[data-addr]').onclick = () => editRegra({ id: uid(), nome: `Condição ${ac.regras.length + 1}`, pesos: Object.fromEntries(ac.avs.map((a) => [a.id, 1])), cond: null, minimo: null }, true);
  el.querySelector('[data-preset]').onclick = async () => {
    if (ac.regras.length && !(await confirmBox('Trocar as condições atuais pelo modelo P1, P2 e PF?', { ok: 'Trocar' }))) return;
    presetPF(ac); persist(); all(); toast('Modelo aplicado. Ajuste os valores se a sua matéria for diferente.', 4000);
  };
  el.querySelector('[data-modo]').onclick = (e) => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    ac.modo = b.dataset.v; persist();
    el.querySelectorAll('[data-modo] [data-v]').forEach((x) => x.classList.toggle('on', x === b));
    el.querySelector('[data-regras-box]').hidden = ac.modo !== 'condicoes';
    all();
  };
  el.querySelectorAll('[data-cfg]').forEach((inp) => (inp.oninput = () => { const v = num(inp.value); if (v != null) { ac[inp.dataset.cfg] = v; persist(); drawSummary(); } }));
  const ta = el.querySelector('[data-notas]'), sv = el.querySelector('[data-saved]');
  let t;
  ta.oninput = () => { sv.textContent = 'salvando…'; clearTimeout(t); t = setTimeout(() => { ac.notas = ta.value; persist(); sv.textContent = 'salvo ✓'; }, 500); };
  all();
}
