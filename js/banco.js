// Banco de exercícios: todos os exercícios de todas as listas, com busca, filtros e prática dos escolhidos.
import { esc, plural, toast } from './util.js';
import { inl, hydrate } from './render.js';
import * as TTS from './speech.js';
import { Store, save } from './store.js';
import { exerciseBank, bankEntry, recordInList, matchQuery, materias, bump, qNodes } from './data.js';
import { blockHeader, blockBody, answerArea, wireAnswer, wireSay, wireStar, topicLine } from './aula.js';
import { speechOf } from './render.js';
import { isSaved } from './data.js';

const F = { q: '', mat: '', top: '', sub: '', st: '', org: '', sel: new Set(), shown: 60 };
const STATUS = [['', 'Qualquer situação'], ['pendente', 'Ainda não acertei'], ['nunca', 'Nunca feitos'], ['errado', 'Já errei'], ['ok', 'Acertados'], ['salvo', '★ Salvos']];
const passStatus = (e, st) => !st || (st === 'pendente' && !e.ok) || (st === 'nunca' && !e.feito) || (st === 'errado' && e.erros > 0) || (st === 'ok' && e.ok) || (st === 'salvo' && e.salvo);
const opts = (list, cur, all) => `<option value="">${all}</option>${list.map(([v, l]) => `<option value="${esc(v)}" ${cur === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}`;
const count = (arr, fn) => arr.filter(fn).length;
const exName = (b, i, it) => {
  if (b.type === 'checagem') { const n = it ? it.parsed.blocks.slice(0, i + 1).filter((x) => x.type === 'checagem').length : i + 1; return b.title ? 'Checagem: ' + b.title : 'Checagem ' + n; }
  return b.title ? (/^\d+$/.test(b.title) ? 'Exercício ' + b.title : b.title) : 'Exercício ' + (i + 1);
};
export const srcLine = (e, { materia = true } = {}) => `<span class="src-kind ${e.it.tipo}">${e.it.tipo === 'lista' ? 'Lista' : 'Aula'}</span> ${materia ? esc(e.it.materia) + ' · ' : ''}<a href="#${e.it.tipo}/${esc(e.it.id)}">${inl(e.it.titulo)}</a> · ${esc(exName(e.b, e.idx, e.it))}`;

export function renderBanco(el, { go }) {
  const all = exerciseBank();
  if (!all.length) { el.innerHTML = `<div class="card empty">O banco junta os exercícios de todas as listas. Ainda não há nenhuma lista.<div style="margin-top:12px"><button class="btn sm" data-goto="estudio">Importar listas</button></div></div>`; return; }
  el.innerHTML = `<div class="banco-filters card stack-s">
      <input class="input search" type="search" data-q placeholder="Pesquisar por tópico, subtópico, descrição, enunciado…" value="${esc(F.q)}">
      <div class="filters" data-sels></div>
    </div>
    <div class="banco-bar row between" data-bar></div>
    <div class="stack-s" data-list></div>`;
  const sels = el.querySelector('[data-sels]'), bar = el.querySelector('[data-bar]'), listEl = el.querySelector('[data-list]');

  function filtered({ skip } = {}) {
    return all.filter((e) => (skip === 'org' || !F.org || e.origem === F.org) && (skip === 'mat' || !F.mat || e.it.mkey === F.mat) && (skip === 'top' || !F.top || e.b.topico === F.top) && (skip === 'sub' || !F.sub || e.b.subtopico === F.sub)
      && (skip === 'st' || passStatus(e, F.st)) && matchQuery(e.hay, F.q));
  }
  function drawSelects() {
    const mats = materias().filter((m) => m.listas.length);
    const base = filtered({ skip: 'top' });
    const tops = [...new Set(base.map((e) => e.b.topico).filter(Boolean))];
    if (F.top && !tops.includes(F.top)) F.top = '';
    const baseS = filtered({ skip: 'sub' });
    const subs = [...new Set(baseS.map((e) => e.b.subtopico).filter(Boolean))];
    if (F.sub && !subs.includes(F.sub)) F.sub = '';
    const baseSt = filtered({ skip: 'st' });
    sels.innerHTML = `${mats.length > 1 ? `<select class="select" data-f="mat">${opts(mats.map((m) => [m.key, `${m.nome} (${count(filtered({ skip: 'mat' }), (e) => e.it.mkey === m.key)})`]), F.mat, 'Todas as matérias')}</select>` : ''}
      <select class="select" data-f="top">${opts(tops.map((t) => [t, `${t} (${count(base, (e) => e.b.topico === t)})`]), F.top, 'Todos os tópicos')}</select>
      ${subs.length ? `<select class="select" data-f="sub">${opts(subs.map((t) => [t, `${t} (${count(baseS, (e) => e.b.subtopico === t)})`]), F.sub, 'Todos os subtópicos')}</select>` : ''}
      <select class="select" data-f="org"><option value="">Listas e aulas (${filtered({ skip: 'org' }).length})</option><option value="lista" ${F.org === 'lista' ? 'selected' : ''}>Só das listas (${count(filtered({ skip: 'org' }), (e) => e.origem === 'lista')})</option><option value="aula" ${F.org === 'aula' ? 'selected' : ''}>Só checagens das aulas (${count(filtered({ skip: 'org' }), (e) => e.origem === 'aula')})</option></select>
      <select class="select" data-f="st">${STATUS.map(([v, l]) => `<option value="${v}" ${F.st === v ? 'selected' : ''}>${l} (${count(baseSt, (e) => passStatus(e, v))})</option>`).join('')}</select>
      ${F.q || F.mat || F.top || F.sub || F.st || F.org ? `<button class="btn xs ghost" data-clear>limpar filtros</button>` : ''}`;
    sels.querySelectorAll('[data-f]').forEach((s) => (s.onchange = () => { F[s.dataset.f] = s.value; F.shown = 60; draw(); }));
    sels.querySelector('[data-clear]')?.addEventListener('click', () => { Object.assign(F, { q: '', mat: '', top: '', sub: '', st: '', org: '', shown: 60 }); el.querySelector('[data-q]').value = ''; draw(); });
  }
  function drawBar(list) {
    const selIn = list.filter((e) => F.sel.has(e.key)).length;
    const allSel = list.length && selIn === list.length;
    bar.innerHTML = `<label class="row nowrap small" style="gap:8px;cursor:pointer"><input type="checkbox" data-all ${allSel ? 'checked' : ''}> ${plural(list.length, 'exercício', 'exercícios')}${F.sel.size ? ` · <b>${F.sel.size} ${F.sel.size === 1 ? 'escolhido' : 'escolhidos'}</b>` : ''}</label>
      <div class="row" style="gap:6px">${F.sel.size ? `<button class="btn xs ghost" data-none>desmarcar</button>` : ''}
      <button class="btn sm primary" data-practice ${!list.length && !F.sel.size ? 'disabled' : ''}>${F.sel.size ? `Praticar os ${F.sel.size} escolhidos →` : `Praticar estes ${list.length} →`}</button></div>`;
    bar.querySelector('[data-all]').onchange = (e) => { list.forEach((x) => (e.target.checked ? F.sel.add(x.key) : F.sel.delete(x.key))); draw(); };
    bar.querySelector('[data-none]')?.addEventListener('click', () => { F.sel.clear(); draw(); });
    bar.querySelector('[data-practice]').onclick = () => {
      const keys = F.sel.size ? all.filter((e) => F.sel.has(e.key)).map((e) => e.key) : list.map((e) => e.key);
      if (!keys.length) return;
      startPractice(keys, describe()); go('#pratica');
    };
  }
  function describe() {
    const parts = [F.top, F.sub, F.q && `“${F.q}”`, F.org === 'aula' ? 'checagens das aulas' : F.org === 'lista' ? 'só listas' : '', STATUS.find((s) => s[0] === F.st && s[0])?.[1]].filter(Boolean);
    return F.sel.size ? 'Exercícios escolhidos' : parts.length ? parts.join(' · ') : 'Banco de exercícios';
  }
  function drawList(list) {
    const shown = list.slice(0, F.shown);
    listEl.innerHTML = !list.length ? '<div class="card empty">Nenhum exercício com esses filtros.</div>' : shown.map((e) => `<div class="bank-row card ${F.sel.has(e.key) ? 'sel' : ''}" data-k="${esc(e.key)}">
        <div class="row nowrap" style="align-items:flex-start;gap:12px">
          <input type="checkbox" data-pick ${F.sel.has(e.key) ? 'checked' : ''} aria-label="Escolher">
          <div class="grow" data-open style="cursor:pointer">
            <div class="tiny muted">${srcLine(e)}</div>
            ${topicLine({ topico: e.b.topico, subtopico: e.b.subtopico, descricao: e.b.descricao })}
            ${!e.b.descricao ? `<div class="small bank-prev">${inl(previewText(e.b))}</div>` : ''}
          </div>
          <div class="bank-st">${e.ok ? '<span class="status ok">✓</span>' : ''}${e.erros ? `<span class="status erro">${e.erros}✗</span>` : ''}${e.salvo ? '<span class="star-mini">★</span>' : ''}</div>
        </div><div data-full hidden></div></div>`).join('')
      + (list.length > shown.length ? `<button class="btn block" data-more>Mostrar mais ${Math.min(60, list.length - shown.length)}</button>` : '');
    listEl.querySelectorAll('[data-k]').forEach((row) => {
      const e = all.find((x) => x.key === row.dataset.k);
      row.querySelector('[data-pick]').onchange = (ev) => { ev.target.checked ? F.sel.add(e.key) : F.sel.delete(e.key); row.classList.toggle('sel', ev.target.checked); drawBar(filtered()); };
      row.querySelector('[data-open]').onclick = () => {
        const full = row.querySelector('[data-full]');
        if (!full.hidden) { full.hidden = true; full.innerHTML = ''; return; }
        full.hidden = false;
        full.innerHTML = `<div class="bank-full t-${e.b.type}">${blockHeader(hdr(e), { saved: isSaved(e.it.id, e.idx) })}${blockBody({ ...e.b, topico: '', subtopico: '', descricao: '', origem: '' })}${answerArea(e.b, { rate: false })}</div>`;
        hydrate(full); wireAnswer(full, e.b, {}); wireStar(full, e.it.id, e.idx);
        wireSay(full.querySelector('[data-sayblock]'), () => speechOf(qNodes(e.b)));
      };
    });
    listEl.querySelector('[data-more]')?.addEventListener('click', () => { F.shown += 60; drawList(list); });
  }
  function draw() { drawSelects(); const list = filtered(); drawBar(list); drawList(list); }
  let t;
  el.querySelector('[data-q]').oninput = (e) => { clearTimeout(t); t = setTimeout(() => { F.q = e.target.value; F.shown = 60; draw(); }, 180); };
  draw();
}
const hdr = (e) => (e.b.type === 'exercicio' ? { ...e.b, title: e.b.title || String(e.idx + 1) } : e.b);
function previewText(b) {
  const n = qNodes(b).find((x) => x.k === 'p' || x.k === 'list');
  const s = n ? (n.k === 'p' ? n.lines.join(' ') : n.items[0]) : '';
  return s.length > 160 ? s.slice(0, 157).replace(/\$[^$]*$/, '') + '…' : s;
}

// ---------------------------------------------------------------
//  Prática com os exercícios escolhidos (mesma mecânica das listas)
// ---------------------------------------------------------------
export function startPractice(keys, titulo) {
  Store.state.progresso.pratica = { fila: [...keys], res: {}, titulo, inicio: Date.now() };
  save('progresso');
}
export function openPratica(view, { go }) {
  TTS.stop();
  const back = () => go('#listas', { aba: 'banco' });
  function render() {
    TTS.stop(); window.scrollTo({ top: 0 });
    const P = Store.state.progresso.pratica;
    if (!P) { view.innerHTML = `<div class="empty"><span class="orn">✐</span>Nenhuma prática em andamento.<div style="margin-top:14px"><button class="btn" data-b>Ir ao banco de exercícios</button></div></div>`; view.querySelector('[data-b]').onclick = back; return; }
    P.fila = P.fila.filter((k) => bankEntry(k));
    const total = Object.keys(P.res).length + P.fila.filter((k) => !P.res[k]).length;
    const okN = Object.values(P.res).filter((r) => r.st === 'ok').length;
    if (!P.fila.length) return renderDone(P);
    const e = bankEntry(P.fila[0]);
    const r = P.res[e.key] || {};
    const pct = total ? Math.round((okN / total) * 100) : 0;
    view.innerHTML = `<div class="lesson-shell fade-in">
      <div class="lesson-top"><button class="icon-btn" data-close title="Sair">✕</button>
        <div class="grow"><div class="small muted" style="line-height:1.2">${esc(P.titulo || 'Prática')}</div><div class="progress" style="margin-top:6px"><i style="width:${pct}%"></i></div></div>
        <span class="small muted">${okN}/${total}</span></div>
      <div class="card block-card t-${e.b.type}" data-block>
        <div class="saved-src small">${srcLine(e)}</div>
        ${r.erros || r.pulos ? `<div class="selos">${r.erros ? `<span class="selo erro">✗ Você errou este ${r.erros === 1 ? 'uma vez' : r.erros + ' vezes'}</span>` : ''}${r.pulos ? `<span class="selo pulo">↷ pulado ${r.pulos === 1 ? 'uma vez' : r.pulos + ' vezes'}</span>` : ''}</div>` : ''}
        ${blockHeader(hdr(e), { saved: isSaved(e.it.id, e.idx) })}${blockBody(e.b)}${answerArea(e.b, { rateLabel: 'Como foi?' })}
      </div>
      <div class="lesson-foot"><span class="small muted" style="align-self:center">${P.fila.length === 1 ? 'Último que falta' : plural(P.fila.length, 'exercício na fila', 'exercícios na fila')}</span><button class="btn lg" data-skip>Pular ↷</button></div></div>`;
    const card = view.querySelector('[data-block]');
    hydrate(card);
    wireSay(card.querySelector('[data-sayblock]'), () => speechOf(qNodes(e.b)));
    wireStar(card, e.it.id, e.idx);
    wireAnswer(card, e.b, { onRate: (ok) => rate(e, ok) });
    card.addEventListener('click', bump);
    view.querySelector('[data-close]').onclick = back;
    view.querySelector('[data-skip]').onclick = () => {
      if (P.fila.length === 1) { toast('Este é o último que falta 🙂'); return; }
      P.res[e.key] = { ...(P.res[e.key] || {}), pulos: (P.res[e.key]?.pulos || 0) + 1 };
      P.fila.push(P.fila.shift()); save('progresso'); render();
    };
  }
  function rate(e, ok) {
    const P = Store.state.progresso.pratica;
    const prev = P.res[e.key] || {};
    if (ok) { P.res[e.key] = { ...prev, st: 'ok' }; P.fila = P.fila.filter((k) => k !== e.key); }
    else { P.res[e.key] = { ...prev, st: 'erro', erros: (prev.erros || 0) + 1 }; P.fila = [...P.fila.filter((k) => k !== e.key), e.key]; }
    recordInList(e.it, e.idx, ok);
    save('progresso');
    toast(ok ? 'Boa! ✓' : 'Foi para o fim, marcado como errado.');
    setTimeout(render, 450);
  }
  function renderDone(P) {
    const res = Object.entries(P.res);
    const first = res.filter(([, r]) => r.st === 'ok' && !r.erros).length;
    const errados = res.filter(([, r]) => r.erros).map(([k]) => k);
    view.innerHTML = `<div class="lesson-shell fade-in"><div class="card end stack">
      <div class="orn">✦</div><h1>Prática concluída</h1><p class="muted" style="margin:0">${esc(P.titulo || '')}</p>
      <div class="grid g2" style="margin:22px 0 8px">
        <div class="card flat stat"><div class="v">${first}<span class="small muted">/${res.length}</span></div><div class="k">de primeira</div></div>
        <div class="card flat stat"><div class="v">${errados.length}</div><div class="k">com algum erro</div></div>
      </div>
      <p class="small muted" style="margin:0">Os acertos e erros também foram marcados nas listas de origem.</p>
      <div class="row" style="justify-content:center"><button class="btn" data-b>Voltar ao banco</button>${errados.length ? '<button class="btn primary" data-err>Praticar de novo os que errei</button>' : ''}</div></div></div>`;
    view.querySelector('[data-b]').onclick = back;
    view.querySelector('[data-err]')?.addEventListener('click', () => { startPractice(errados, 'Os que errei · ' + (P.titulo || '')); render(); });
  }
  render();
}
