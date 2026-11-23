// Acrescentar exercícios a uma lista que já existe (colando o código gerado pela IA) e o prompt para isso.
import { parseItem } from './parser.js';
import { Store, saveItem, putMedia, getMedia, lsGet, lsSet } from './store.js';
import { rebuild, itemById, materiaByKey, siglaOf, saveLista } from './data.js';
import { collectText, collectFiles, packMediaMap } from './importer.js';
import { promptExerciciosLista, MODOS_LISTA } from './prompts.js';
import { modal, esc, plural, toast, copyText } from './util.js';
import { inl } from './render.js';

const isBlockLine = (l) => /^\s*==\s*[^=\s]/.test(l) && !/^\s*===/.test(l);
/** Tira o cabeçalho (tudo antes do primeiro "== …"). */
const stripHeader = (code) => { const ls = String(code).replace(/\r\n?/g, '\n').split('\n'); const i = ls.findIndex(isBlockLine); return i < 0 ? '' : ls.slice(i).join('\n').trim(); };
/** Renumera "== EXERCICIO | 3" a partir de start (títulos que não são número ficam como estão). */
function renumber(body, start) {
  let n = start;
  return body.split('\n').map((l) => {
    if (!isBlockLine(l)) return l;
    const m = l.match(/^(\s*==\s*[^|]+?)\s*(?:\|\s*(.*?))?\s*$/);
    if (!m) return l;
    const t = (m[2] || '').trim();
    if (!t || /^\d+$/.test(t)) return `${m[1].trim()} | ${n++}`;
    n++; return l;
  }).join('\n');
}

/** Resumo da lista para o prompt (tópicos usados e o que cada exercício treina). */
export function listaResumo(L) {
  const bl = L.parsed.blocks;
  return {
    titulo: L.titulo, id: L.id, n: bl.length,
    topicos: [...new Set(bl.map((b) => [b.topico, b.subtopico].filter(Boolean).join(' › ')).filter(Boolean))],
    resumo: bl.map((b, i) => b.descricao ? `ex. ${i + 1}: ${b.descricao}` : '').filter(Boolean).slice(0, 40),
  };
}
export function promptParaLista(L, { modo = 'descricao', topicos = '', detalhes = '' } = {}) {
  const m = materiaByKey(L.mkey);
  return promptExerciciosLista({ materia: L.materia, sigla: m ? siglaOf(m) : '', divisao: m?.cfg.divisao || '', ementa: m?.cfg.ementa || '', lista: listaResumo(L), modo, topicos, detalhes });
}

async function montar(L, text, files) {
  const pack = files?.length ? await collectFiles(files) : { items: [], media: new Map() };
  if (text.trim()) { const t = collectText(text); pack.items.push(...t.items); t.media.forEach((v, k) => pack.media.set(k, v)); }
  const body = pack.items.map((x) => stripHeader(x.codigo)).filter(Boolean).join('\n\n');
  const N = L.parsed.blocks.length;
  const corpo = renumber(body, N + 1);
  const base = String(L.codigo).replace(/\s+$/, '');
  const novo = base + '\n\n' + corpo + '\n';
  const p = parseItem(novo);
  const linhaBase = base.split('\n').length;
  const novos = p.blocks.slice(N);
  const avisos = p.warnings.filter((w) => w.line > linhaBase + 1);
  const so = parseItem('@tipo: lista\n@materia: x\n@titulo: x\n@id: x\n' + corpo);
  const falta = [];
  for (const nm of so.midias) if (!pack.media.has(nm) && !(await getMedia(nm).catch(() => null))) falta.push(nm);
  return { pack, novo, novos, avisos, falta, vazio: !corpo.trim() };
}

/** Modal: gerar o prompt e colar os exercícios novos no fim da lista. */
export function openAddExercicios(L, { after } = {}) {
  const pode = Store.isAdmin || L.origem === 'local';
  const f = { modo: 'descricao', topicos: '', detalhes: '', ...lsGet('addexCampos', {}) };
  if (!MODOS_LISTA[f.modo]) f.modo = 'descricao';
  let files = [];
  modal(`<div class="stack addex">
    <div class="row between nowrap"><div><div class="caps muted small">Adicionar exercícios</div><h3>${inl(L.titulo)}</h3><div class="tiny muted">${esc(L.materia)} · já tem ${plural(L.parsed.blocks.length, 'exercício')}; os novos entram no fim, a partir do ${L.parsed.blocks.length + 1}.</div></div><button class="btn sm ghost" data-close>Fechar</button></div>
    ${!pode ? '<div class="card soft small" style="color:var(--bad)">Esta lista está na nuvem: só a administradora pode alterá-la. Entre com a conta de administradora em Ajustes.</div>' : ''}
    <details class="card flat soft addex-ia" ${lsGet('addexIaAberto', true) ? 'open' : ''}><summary><b>1. Gerar os exercícios com IA</b> <span class="tiny muted">(opcional)</span></summary>
      <div class="stack-s" style="margin-top:10px">
        <div class="stack-s" data-modo>${Object.entries(MODOS_LISTA).map(([k, l]) => `<label class="radio-row ${f.modo === k ? 'on' : ''}"><input type="radio" name="addexModo" value="${k}" ${f.modo === k ? 'checked' : ''}><span><b>${l}</b></span></label>`).join('')}</div>
        <div data-top ${f.modo === 'descricao' ? '' : 'hidden'}><label class="lbl">Tópicos e subtópicos (opcional)</label><input class="input" data-f="topicos" value="${esc(f.topicos)}" placeholder="vazio = os mesmos tópicos da lista"></div>
        <div><label class="lbl">Detalhes</label><textarea class="textarea" data-f="detalhes" style="min-height:70px" placeholder="ex.: mais 5 exercícios de coordenadas polares, nível de prova; 2 com figura">${esc(f.detalhes)}</textarea></div>
        <p class="tiny muted" data-anexo style="margin:0" ${f.modo === 'descricao' ? 'hidden' : ''}>Lembre de anexar os exercícios junto com o prompt na conversa.</p>
        <div class="row"><button class="btn primary sm" data-cprompt>Copiar prompt</button><button class="btn ghost sm" data-vprompt>Ver prompt</button></div>
        <pre class="ref" data-pre hidden></pre>
        <p class="tiny muted" style="margin:0">Mande o prompt no projeto da matéria no ChatGPT. Ele devolve só os blocos <code>== EXERCICIO</code>, já numerados a partir do próximo número.</p>
      </div></details>
    <div class="stack-s"><b>2. Colar os exercícios novos</b>
      <textarea class="textarea code-area" data-code spellcheck="false" style="min-height:160px" placeholder="Cole aqui os blocos == EXERCICIO | … (se vier com cabeçalho @tipo/@id, eu ignoro o cabeçalho). Arquivos colados com === ARQUIVO: … === também entram."></textarea>
      <label class="btn sm" style="align-self:flex-start">📎 Anexar zip, .txt ou figuras<input type="file" data-files multiple accept=".txt,.md,.zip,.png,.jpg,.jpeg,.gif,.svg,.webp,.html,.htm" hidden></label>
      <div class="tiny muted" data-fnames></div>
      <div data-pv></div>
      <div class="row" style="justify-content:flex-end"><button class="btn primary" data-add disabled>Adicionar à lista</button></div>
    </div></div>`, (el, close) => {
    const gen = () => promptParaLista(L, f);
    const keep = () => lsSet('addexCampos', f);
    el.querySelector('.addex-ia').addEventListener('toggle', (e) => lsSet('addexIaAberto', e.target.open));
    el.querySelectorAll('input[name=addexModo]').forEach((r) => (r.onchange = () => {
      f.modo = r.value; keep();
      el.querySelectorAll('[data-modo] .radio-row').forEach((x) => x.classList.toggle('on', x.querySelector('input').checked));
      el.querySelector('[data-top]').hidden = f.modo !== 'descricao'; el.querySelector('[data-anexo]').hidden = f.modo === 'descricao';
      const pre = el.querySelector('[data-pre]'); if (!pre.hidden) pre.textContent = gen();
    }));
    el.querySelectorAll('[data-f]').forEach((i) => (i.oninput = () => { f[i.dataset.f] = i.value; keep(); const pre = el.querySelector('[data-pre]'); if (!pre.hidden) pre.textContent = gen(); }));
    el.querySelector('[data-cprompt]').onclick = () => copyText(gen());
    el.querySelector('[data-vprompt]').onclick = () => { const pre = el.querySelector('[data-pre]'); pre.hidden = !pre.hidden; pre.textContent = gen(); };

    const ta = el.querySelector('[data-code]'), pv = el.querySelector('[data-pv]'), addBtn = el.querySelector('[data-add]');
    let res = null, t = null, seq = 0;
    const update = async () => {
      const my = ++seq;
      if (!ta.value.trim() && !files.length) { pv.innerHTML = ''; addBtn.disabled = true; res = null; return; }
      const r = await montar(L, ta.value, files);
      if (my !== seq) return;
      res = r;
      addBtn.disabled = !pode || !r.novos.length;
      addBtn.textContent = r.novos.length ? `Adicionar ${plural(r.novos.length, 'exercício')} à lista` : 'Adicionar à lista';
      pv.innerHTML = `<div class="card soft stack-s small">
        ${r.novos.length ? `<div><b>${plural(r.novos.length, 'exercício novo', 'exercícios novos')}</b> (do ${L.parsed.blocks.length + 1} ao ${L.parsed.blocks.length + r.novos.length}):</div>
        <ul style="margin:0;padding-left:1.2em">${r.novos.map((b) => `<li>${esc(b.title || '')}${b.topico ? ` <span class="muted">· ${esc(b.topico)}${b.subtopico ? ' › ' + esc(b.subtopico) : ''}</span>` : ''}${b.descricao ? ` — ${inl(b.descricao)}` : ''}</li>`).join('')}</ul>` : '<div style="color:var(--bad)">Não encontrei nenhum bloco "== EXERCICIO | n" no texto.</div>'}
        ${r.avisos.length ? `<ul class="warns">${r.avisos.map((w) => `<li class="${w.level}">${esc(w.msg)}</li>`).join('')}</ul>` : r.novos.length ? '<div style="color:var(--ok)">✓ Formato certo.</div>' : ''}
        ${r.falta.length ? `<div style="color:var(--bad)">Figuras que não vieram junto: ${r.falta.map(esc).join(', ')}. Dá para adicionar agora e importar as figuras depois.</div>` : ''}
      </div>`;
    };
    ta.oninput = () => { clearTimeout(t); t = setTimeout(update, 300); };
    el.querySelector('[data-files]').onchange = (e) => { files = [...e.target.files]; el.querySelector('[data-fnames]').textContent = files.map((x) => x.name).join(', '); update(); };
    addBtn.onclick = async () => {
      if (!res?.novos.length) return;
      addBtn.disabled = true; addBtn.textContent = 'Adicionando…';
      try {
        const media = [...(await packMediaMap(res.pack)).values()];
        if (media.length) await putMedia(media);
        const N = L.parsed.blocks.length;
        await saveItem({ id: L.id, codigo: res.novo }, { silent: true });
        const q = Store.state.progresso.listas?.[L.id];
        if (q) { for (let i = N; i < N + res.novos.length; i++) if (!q.fila.includes(i)) q.fila.push(i); q.concluida = null; saveLista(); }
        rebuild();
        toast(`${plural(res.novos.length, 'exercício adicionado', 'exercícios adicionados')} ✓`);
        close(); after?.(itemById(L.id));
      } catch (e) { console.error(e); toast('Não consegui adicionar: ' + e.message, 6000); addBtn.disabled = false; addBtn.textContent = 'Adicionar à lista'; }
    };
  }, { wide: true });
}
