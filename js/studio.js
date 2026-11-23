// Estúdio: colar uma aula/lista, importar vários arquivos, gerenciar, prompts e modelo.
import { parseItem, BLOCK_TYPES, mediaKey } from './parser.js';
import { Store, deleteItem, getMedia, putMedia, lsGet, lsSet } from './store.js';
import { ITEMS, rebuild, materias, itemById, matchQuery, itemHay } from './data.js';
import { esc, plural, toast, copyText, confirmBox } from './util.js';
import { hydrate, inl, richHtml } from './render.js';
import { blockHeader, blockBody, answerArea, wireAnswer } from './aula.js';
import { collectText, collectFiles, reviewImport, exportItem, exportMateria, exportBackup, exampleFiles, packMediaMap } from './importer.js';
import { promptPacote, promptPassos, promptListas, MODELO_AULA, MODELO_LISTA, MODELO_ESSENCIAL, MODELO_PASSOS, MODOS_LISTA } from './prompts.js';
import { reorderModal } from './app.js';

const TABS = [['colar', 'Colar uma'], ['importar', 'Importar vários'], ['itens', 'Minhas aulas e listas'], ['prompts', 'Prompts para IA'], ['modelo', 'Modelo do código']];
let tab = 'colar';
let draft = lsGet('rascunho', '');

export function renderStudio(v, { go, params = {} }) {
  if (params.tab) tab = params.tab;
  if (params.id && itemById(params.id)) { draft = itemById(params.id).codigo; tab = 'colar'; }
  v.innerHTML = `<div class="wrap fade-in"><div class="page-head"><div class="kicker">Estúdio</div><h1>Montar a <em class="it">oficina</em></h1>
    <p>Cole uma aula ou lista, importe várias de uma vez, gere com IA e exporte.</p></div>
    <div class="tabs-row">${TABS.map(([k, l]) => `<button class="chip ${tab === k ? 'on' : ''}" data-t="${k}">${l}</button>`).join('')}</div>
    <div data-panel style="margin-top:20px"></div></div>`;
  v.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { tab = b.dataset.t; renderStudio(v, { go }); }));
  const panel = v.querySelector('[data-panel]');
  ({ colar: panelColar, importar: panelImportar, itens: panelItens, prompts: panelPrompts, modelo: panelModelo })[tab](panel, { go, params, v });
}

// ---------------------------------------------------------------
function previewHtml(p) {
  return p.blocks.map((b) => {
    if (b.type === 'secao') return `<div class="card pv-block ess-sec"><h3>${inl(b.title || 'Geral')}</h3>${richHtml(b.nodes)}</div>`;
    if (b.type === 'questao') return `<div class="card pv-block"><div class="caps muted small">${esc(b.subtopico || '')}</div><h3>${inl(b.title || 'Tipo de questão')}</h3>${b.quando.length ? `<div class="caps muted small">Quando usar</div>${richHtml(b.quando)}` : ''}<div class="caps muted small">Passo a passo</div>${richHtml(b.passos)}${b.formula.length ? `<div class="fml">${richHtml(b.formula)}</div>` : ''}${b.cuidado.length ? `<div class="callout warn" style="display:block">${richHtml(b.cuidado)}</div>` : ''}${b.exemplo.length ? `<div class="caps muted small">Exemplo</div>${richHtml(b.exemplo)}` : ''}</div>`;
    const bb = b.type === 'exercicio' ? { ...b, title: b.title || String(b.idx + 1) } : b;
    return `<div class="card pv-block t-${b.type}" data-pv="${b.idx}">${blockHeader(bb, { say: false })}${blockBody(b)}${['checagem', 'exercicio'].includes(b.type) ? answerArea(b, { rate: false }) : ''}</div>`;
  }).join('');
}

function panelColar(el, { go }) {
  el.innerHTML = `<div class="editor">
    <div class="stack-s">
      <div class="row between"><label class="lbl" style="margin:0">Código de UMA aula ou lista</label>
        <div class="row" style="gap:6px"><button class="btn xs" data-tpl="aula">Modelo de aula</button><button class="btn xs" data-tpl="essencial">de essenciais</button><button class="btn xs" data-tpl="passos">de passo a passo</button><button class="btn xs" data-tpl="lista">de lista</button><button class="btn xs ghost" data-clear>Limpar</button></div></div>
      <textarea class="textarea code-area" data-code spellcheck="false" placeholder="Cole aqui o código gerado pela IA (começa com @tipo: aula ou @tipo: lista).&#10;&#10;Se vierem arquivos colados no formato&#10;=== ARQUIVO: nome.html ===&#10;…&#10;=== FIM DO ARQUIVO ===&#10;eles entram junto.">${esc(draft)}</textarea>
      <div class="row" style="justify-content:flex-end"><button class="btn primary lg" data-review>Revisar e importar →</button></div>
    </div>
    <div class="preview stack-s" data-preview></div></div>
    <div data-review-box></div>`;
  const ta = el.querySelector('[data-code]');
  const pv = el.querySelector('[data-preview]');
  let t = null;
  const update = async () => {
    draft = ta.value; lsSet('rascunho', draft);
    if (!draft.trim()) { pv.innerHTML = '<div class="card empty small">A pré-visualização aparece aqui.</div>'; return; }
    const pack = collectText(draft);
    const p = parseItem(pack.items[0]?.codigo || '');
    const media = await packMediaMap(pack);
    pv.innerHTML = `<div class="card soft stack-s"><div class="caps muted small">${{ aula: 'Aula', lista: 'Lista', essencial: 'Essenciais', passos: 'Passo a passo' }[p.meta.tipo]} · ${esc(p.meta.materia)}${p.meta.topico ? ' · ' + esc(p.meta.topico) : ''}</div><h3>${inl(p.meta.titulo)}</h3>
        <div class="row">${p.meta.tags.map((x) => `<span class="tag">${esc(x)}</span>`).join('')}</div>
        <div class="tiny muted">id: <code>${esc(p.meta.id)}</code> · ${plural(p.blocks.length, { lista: 'exercício', essencial: 'subtópico', passos: 'tipo de questão' }[p.meta.tipo] || 'parte', { passos: 'tipos de questão' }[p.meta.tipo])}${pack.items.length > 1 ? ` · <b>o texto tem ${pack.items.length} itens</b> (vão todos juntos)` : ''}${itemById(p.meta.id) ? ' · <b>vai substituir a versão atual</b>' : ''}</div>
        ${p.warnings.length ? `<ul class="warns">${p.warnings.map((w) => `<li class="${w.level}" data-line="${w.line}">linha ${w.line}: ${esc(w.msg)}</li>`).join('')}</ul>` : '<div class="small" style="color:var(--ok)">✓ Nenhum problema no formato.</div>'}</div>
      ${previewHtml(p)}`;
    hydrate(pv, { media });
    p.blocks.forEach((b) => { if (['checagem', 'exercicio'].includes(b.type)) { const c = pv.querySelector(`[data-pv="${b.idx}"]`); c && wireAnswer(c, b, {}); } });
    pv.querySelectorAll('[data-line]').forEach((li) => (li.onclick = () => goLine(ta, +li.dataset.line)));
  };
  ta.oninput = () => { clearTimeout(t); t = setTimeout(update, 350); };
  update();
  el.querySelectorAll('[data-tpl]').forEach((b) => (b.onclick = () => { if (ta.value.trim() && !confirm('Trocar o texto atual pelo modelo?')) return; ta.value = { lista: MODELO_LISTA, essencial: MODELO_ESSENCIAL, passos: MODELO_PASSOS }[b.dataset.tpl] || MODELO_AULA; update(); }));
  el.querySelector('[data-clear]').onclick = () => { ta.value = ''; update(); };
  el.querySelector('[data-review]').onclick = () => {
    if (!ta.value.trim()) return toast('Cole o código primeiro.');
    const box = el.querySelector('[data-review-box]');
    el.querySelector('.editor').hidden = true;
    box.innerHTML = '<div class="card" data-busy></div>';
    reviewImport(box.firstElementChild, collectText(ta.value), {
      onCancel: () => { box.innerHTML = ''; el.querySelector('.editor').hidden = false; },
      onDone: (items) => { draft = ''; lsSet('rascunho', ''); const it = items[0]; go(it ? `#${it.p.meta.tipo}/${it.id}` : '#materias'); },
    });
  };
}
function goLine(ta, n) {
  const lines = ta.value.split('\n');
  const pos = lines.slice(0, n - 1).join('\n').length + (n > 1 ? 1 : 0);
  ta.focus(); ta.setSelectionRange(pos, pos + (lines[n - 1] || '').length);
  const lh = parseFloat(getComputedStyle(ta).lineHeight) || 22;
  ta.scrollTop = Math.max(0, (n - 4) * lh);
}

// ---------------------------------------------------------------
function panelImportar(el, { go, params }) {
  el.innerHTML = `<div class="stack">
    <label class="drop card" data-drop>
      <input type="file" multiple hidden data-files accept=".zip,.txt,.md,.png,.jpg,.jpeg,.gif,.svg,.webp,.html,.htm">
      <div class="drop-ic">⇪</div>
      <div><b>Escolher arquivos</b> ou arrastar para cá</div>
      <div class="small muted">Um .zip, ou vários .txt de uma vez (junto com as figuras e os .html dos interativos).</div>
    </label>
    <div class="card soft small stack-s">
      <div><b>Ordem:</b> no zip ou nos arquivos, o número do começo do nome (01-, 02-…) define a ordem inicial. Antes de importar, você confirma a ordem arrastando.</div>
      <div><b>Mídias:</b> as figuras e os interativos podem estar soltos ou dentro de uma pasta <code>midia/</code> do zip.</div>
      <div><b>Restaurar backup:</b> importe aqui o zip do backup completo.</div>
    </div>
    <div class="row"><button class="btn" data-example>✦ Carregar o exemplo (aula, essenciais, passo a passo e lista de Cálculo 3)</button></div>
  </div><div data-review-box></div>`;
  const box = el.querySelector('[data-review-box]');
  const start = async (files) => {
    if (!files.length) return;
    el.firstElementChild.hidden = true;
    box.innerHTML = '<div class="card" data-busy><div class="muted">Lendo arquivos…</div></div>';
    try {
      const pack = await collectFiles(files);
      if (!pack.items.length && pack.media.size) {
        const recs = [...(await packMediaMap(pack)).values()];
        const local = await putMedia(recs);
        toast(`${plural(recs.length, 'mídia salva', 'mídias salvas')} ✓${local.length ? ' (algumas só neste aparelho)' : ''}`);
        box.innerHTML = ''; el.firstElementChild.hidden = false; return;
      }
      await reviewImport(box.firstElementChild, pack, {
        onCancel: () => { box.innerHTML = ''; el.firstElementChild.hidden = false; },
        onDone: (items) => { const m = items[0]?.p.meta; go(m ? '#materia/' + m.materiaKey : '#materias', { aba: { lista: 'listas', essencial: 'essenciais', passos: 'passos' }[m?.tipo] || 'aulas' }); },
      });
      if (pack.ignored.length) toast(`Ignorei ${plural(pack.ignored.length, 'arquivo')} que não é aula, lista nem mídia.`, 4000);
    } catch (e) { console.error(e); toast('Não consegui ler: ' + e.message, 6000); box.innerHTML = ''; el.firstElementChild.hidden = false; }
  };
  el.querySelector('[data-files]').onchange = (e) => start([...e.target.files]);
  const drop = el.querySelector('[data-drop]');
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); start([...e.dataTransfer.files]); });
  const ex = async () => { try { start(await exampleFiles()); } catch (e) { toast(e.message, 5000); } };
  el.querySelector('[data-example]').onclick = ex;
  if (params.exemplo) ex();
}

// ---------------------------------------------------------------
async function panelItens(el, { go, v }) {
  rebuild();
  const mats = materias();
  el.innerHTML = `<div class="stack">
    <div class="row between"><div class="small muted">${plural(ITEMS.filter((x) => x.tipo === 'aula').length, 'aula')} · ${plural(ITEMS.filter((x) => x.tipo === 'lista').length, 'lista')} · ${ITEMS.filter((x) => x.tipo === 'essencial').length} essenciais · ${ITEMS.filter((x) => x.tipo === 'passos').length} passo a passo · ${plural(mats.length, 'matéria')}</div>
      <button class="btn sm" data-backup>⇩ Backup completo (.zip)</button></div>
    ${!mats.length ? '<div class="card empty">Nada por aqui ainda. Use “Colar uma” ou “Importar vários”.</div>' : `<input class="input search" type="search" data-iq placeholder="Pesquisar por título, matéria, tag, id…">`}
    ${mats.map((m) => `<div class="card stack-s" data-mcard><div class="row between"><h3>${esc(m.nome)}</h3>
        <div class="row" style="gap:6px"><button class="btn xs" data-expm="${esc(m.key)}">⇩ Exportar matéria</button>${Store.isAdmin ? `<button class="btn xs ghost danger" data-delm="${esc(m.key)}">Apagar matéria</button>` : ''}</div></div>
      ${[['aula', 'Aulas', m.aulas], ['essencial', 'Essenciais', m.essenciais], ['passos', 'Passo a passo', m.passos], ['lista', 'Listas', m.listas]].filter(([, , l]) => l.length).map(([tipo, lab, l]) => `<div><div class="row between" style="margin-top:6px"><div class="caps muted small">${lab}</div>${l.length > 1 && Store.isAdmin ? `<button class="btn xs ghost" data-reo="${esc(m.key)}|${tipo}">↕ Reordenar</button>` : ''}</div>
        ${l.map((it, i) => `<div class="lesson-row" data-hay="${esc(itemHay(it) + ' ' + it.id)}"><span class="n-chip">${i + 1}</span><div class="grow"><div>${inl(it.titulo)}</div><div class="tiny muted">${it.tags.map(esc).join(' · ')}${it.parsed.warnings.length ? ` · <span style="color:var(--butter-d)">${plural(it.parsed.warnings.length, 'aviso')}</span>` : ''}${Store.configured ? ` · <span class="src">${it.origem === 'nuvem' ? 'nuvem' : 'aparelho'}</span>` : ''}</div></div>
          <div class="row nowrap" style="gap:4px"><a class="btn xs" href="#${tipo}/${esc(it.id)}">Abrir</a>${Store.isAdmin || it.origem === 'local' ? `<button class="btn xs" data-edit="${esc(it.id)}">Editar</button>` : ''}<button class="btn xs" data-exp="${esc(it.id)}|${i + 1}" title="Exportar">⇩</button>${Store.isAdmin || it.origem === 'local' ? `<button class="btn xs ghost danger" data-del="${esc(it.id)}" title="Apagar">✕</button>` : ''}</div></div>`).join('')}</div>`).join('')}
    </div>`).join('')}
    <div class="card stack-s" data-media><h3>Figuras e interativos</h3><div class="small muted">Verificando…</div></div>
  </div>`;
  el.querySelector('[data-iq]')?.addEventListener('input', (e) => {
    const q = e.target.value;
    el.querySelectorAll('[data-hay]').forEach((r) => { r.hidden = !matchQuery(r.dataset.hay, q); });
    el.querySelectorAll('[data-mcard]').forEach((c) => { c.hidden = !!q.trim() && !c.querySelector('[data-hay]:not([hidden])'); });
  });
  el.querySelector('[data-backup]').onclick = async (e) => { e.target.disabled = true; try { await exportBackup(); } finally { e.target.disabled = false; } };
  el.querySelectorAll('[data-expm]').forEach((b) => (b.onclick = async () => { b.disabled = true; try { await exportMateria(mats.find((m) => m.key === b.dataset.expm)); } finally { b.disabled = false; } }));
  el.querySelectorAll('[data-exp]').forEach((b) => (b.onclick = () => { const [id, n] = b.dataset.exp.split('|'); exportItem(itemById(id), +n); }));
  el.querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => { draft = itemById(b.dataset.edit).codigo; lsSet('rascunho', draft); tab = 'colar'; renderStudio(v, { go }); window.scrollTo({ top: 0 }); }));
  el.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
    const it = itemById(b.dataset.del);
    if (await confirmBox(`Apagar “${esc(it.titulo)}”? O progresso nela também deixa de aparecer.`, { ok: 'Apagar', danger: true })) { await deleteItem(it.id); toast('Apagado'); panelItens(el, { go, v }); }
  }));
  el.querySelectorAll('[data-delm]').forEach((b) => (b.onclick = async () => {
    const m = mats.find((x) => x.key === b.dataset.delm);
    const n = m.aulas.length + m.listas.length + m.essenciais.length + m.passos.length;
    if (await confirmBox(`Apagar a matéria “${esc(m.nome)}” inteira (${plural(n, 'item', 'itens')})? Se quiser guardar, exporte antes.`, { ok: 'Apagar tudo', danger: true })) {
      for (const it of [...m.aulas, ...m.listas, ...m.essenciais, ...m.passos]) await deleteItem(it.id);
      toast('Matéria apagada'); panelItens(el, { go, v });
    }
  }));
  el.querySelectorAll('[data-reo]').forEach((b) => (b.onclick = () => { const [k, tipo] = b.dataset.reo.split('|'); reorderModal(mats.find((m) => m.key === k), tipo, () => panelItens(el, { go, v })); }));
  // mídias faltando
  const box = el.querySelector('[data-media]');
  const need = [...new Set(ITEMS.flatMap((x) => x.parsed.midias))];
  const miss = [];
  for (const n of need) if (!(await getMedia(n))) miss.push(n);
  box.innerHTML = `<h3>Figuras e interativos</h3>
    <div class="small">${plural(need.length, 'arquivo usado', 'arquivos usados')} nas aulas e listas${miss.length ? ` · <b style="color:var(--bad)">${plural(miss.length, 'faltando', 'faltando')}</b>` : ' · ✓ todos aqui'}</div>
    ${miss.length ? `<div class="stack-s">${miss.map((n) => `<code class="small">${esc(n)}</code>`).join('')}</div>` : ''}
    <label class="btn sm" style="align-self:flex-start">📎 Adicionar ou trocar figuras / interativos<input type="file" multiple hidden data-addm accept=".png,.jpg,.jpeg,.gif,.svg,.webp,.html,.htm"></label>
    <p class="tiny muted" style="margin:0">O nome do arquivo precisa ser igual ao do marcador [figura: …] ou [interativo: …].</p>`;
  box.querySelector('[data-addm]').onchange = async (e) => {
    const pack = await collectFiles([...e.target.files]);
    const recs = [...(await packMediaMap(pack)).values()];
    const local = await putMedia(recs);
    toast(`${plural(recs.length, 'arquivo salvo', 'arquivos salvos')} ✓${local.length ? ' (algum ficou só neste aparelho por ser grande)' : ''}`);
    panelItens(el, { go, v });
  };
}

// ---------------------------------------------------------------
function panelPrompts(el) {
  const f = { materia: '', sigla: '', ementa: '', topicos: '', parteA: '', focoA: '', topicosL: '', detalhesL: '', modoL: 'descricao', incA: true, incE: true, incP: true, incL: false, detA: '', detE: '', detP: '', detL: '', parteP: '', detalhesP: '', ...lsGet('promptCampos', {}) };
  if (!MODOS_LISTA[f.modoL]) f.modoL = 'descricao';
  const mats = materias();
  const ta = (k, label, ph, h = 90, hint = '') => `<div><label class="lbl">${label}</label><textarea class="textarea" data-f="${k}" style="min-height:${h}px" placeholder="${ph}">${esc(f[k] || '')}</textarea>${hint ? `<p class="tiny muted" style="margin:4px 0 0">${hint}</p>` : ''}</div>`;
  el.innerHTML = `<div class="stack">
    <div class="card soft small stack-s">
      <div><b>Como usar:</b> crie um projeto no ChatGPT (ou no Claude) para a matéria e ponha nas <b>fontes do projeto</b> tudo o que deve ser considerado: livros-texto, slides do professor, notas de aula, listas de exercícios e provas.</div>
      <div>Depois preencha aqui, copie o prompt e mande dentro desse projeto. O prompt manda a IA usar <b>só</b> o que está nas fontes. A resposta (zip ou texto) entra pelo “Importar vários” ou pelo “Colar uma”.</div>
    </div>
    <div class="card stack-s"><h3>A matéria</h3>
      <div class="grid g2">
        <div><label class="lbl">Matéria</label><input class="input" data-f="materia" list="mats" value="${esc(f.materia)}" placeholder="ex.: Mecânica dos Sólidos 1"><datalist id="mats">${mats.map((m) => `<option value="${esc(m.nome)}">`).join('')}</datalist></div>
        <div><label class="lbl">Sigla curta (para os ids e arquivos)</label><input class="input" data-f="sigla" value="${esc(f.sigla)}" placeholder="ex.: mecsol1"></div>
      </div>
      ${ta('ementa', 'Ementa (opcional)', 'Cole aqui a ementa da matéria', 110, 'Sem ementa, a IA usa todo o material das fontes do projeto e cobre a matéria inteira, a não ser que o foco diga para excluir ou acrescentar algo.')}
      ${ta('topicos', 'Divisão da matéria (tópicos e subtópicos)', '1. Tensão (P1)&#10;   1.1 Tensão normal&#10;   1.2 Tensão de cisalhamento&#10;2. Deformação (P1)…', 110, 'Opcional. Vazio = a IA monta a divisão a partir da ementa e das fontes. Os nomes daqui viram os tópicos e subtópicos usados nos filtros do app.')}
    </div>
    <div class="card stack-s"><h3>Pacote da matéria (zip)</h3>
      <p class="small muted" style="margin:0">Um prompt só, que gera um zip com tudo o que você marcar. Cada arquivo já sai dizendo o que é (aula, essenciais, passo a passo ou lista), e o app põe cada um no lugar certo ao importar. Cada parte marcada tem o seu campo de detalhes.</p>
      <div class="stack-s">${[['incA', 'Aulas', 'uma por subtópico, em partes, com checagens', 'detA', 'ex.: aulas curtas; mais exemplos numéricos; uma checagem depois de cada conceito'], ['incE', 'Essenciais', 'um por tópico: o mais importante de cada subtópico', 'detE', 'ex.: incluir unidades e convenções de sinal; no máximo uma tela por subtópico'], ['incP', 'Passo a passo', 'um por tópico: o roteiro de cada tipo de questão das listas e provas', 'detP', 'ex.: incluir as questões da P2 de 2023.2; exemplo resolvido em todos'], ['incL', 'Listas de exercícios', 'exercícios novos no estilo das listas e provas das fontes', 'detL', 'ex.: 10 exercícios por tópico, do fácil ao difícil; no estilo da P1']].map(([k, l, d, dk, ph]) => `<div class="inc-box ${f[k] ? 'on' : ''}"><label class="radio-row ${f[k] ? 'on' : ''}"><input type="checkbox" data-inc="${k}" ${f[k] ? 'checked' : ''}><span><b>${l}</b><span class="tiny muted" style="display:block">${d}</span></span></label>
        ${f[k] ? `<textarea class="textarea inc-det" data-f="${dk}" placeholder="Detalhes de ${l.toLowerCase()} (opcional) — ${ph}">${esc(f[dk] || '')}</textarea>` : ''}</div>`).join('')}</div>
      ${ta('parteA', 'Parte da matéria que quero agora', 'ex.: só o tópico 2 (Deformação); vazio = a matéria toda', 60)}
      ${ta('focoA', 'Foco e instruções específicas', 'ex.: focar no que caiu na P1 de 2024.1; seguir os slides da aula 5; mais exemplos numéricos', 70)}
      <div class="row"><button class="btn primary" data-copy="aulas">Copiar prompt do pacote</button><button class="btn ghost sm" data-show="aulas">Ver prompt</button></div>
      <pre class="ref" data-pre="aulas" hidden></pre></div>
    <div class="card stack-s"><h3>Passo a passo</h3>
      <p class="small muted" style="margin:0">Só o passo a passo, do jeito que você descrever. Os tipos de questão vêm das listas e provas das fontes (ou, sem elas, dos exercícios do livro-texto).</p>
      ${ta('parteP', 'Parte da matéria', 'ex.: tópicos 1 e 2; vazio = a matéria toda', 60)}
      ${ta('detalhesP', 'O que eu quero exatamente', 'ex.: todos os tipos de questão da P1 e da Lista 3; com exemplo resolvido em cada um; destacar as pegadinhas de sinal', 90)}
      <div class="row"><button class="btn primary" data-copy="passos">Copiar prompt de passo a passo</button><button class="btn ghost sm" data-show="passos">Ver prompt</button></div>
      <pre class="ref" data-pre="passos" hidden></pre></div>
    <div class="card stack-s"><h3>Listas de exercícios</h3>
      <div><label class="lbl">Tipo de prompt</label><div class="stack-s" data-modo>${Object.entries(MODOS_LISTA).map(([k, l]) => `<label class="radio-row ${f.modoL === k ? 'on' : ''}"><input type="radio" name="modoL" value="${k}" ${f.modoL === k ? 'checked' : ''}><span><b>${l}</b><span class="tiny muted" style="display:block">${{ anexados: 'Transcreve e resolve os exercícios que você anexar junto com o prompt.', inspirados: 'Cria exercícios novos, parecidos com os que você anexar.', descricao: 'Cria exercícios novos a partir dos tópicos, subtópicos e detalhes que você escrever.' }[k]}</span></span></label>`).join('')}</div></div>
      ${f.modoL === 'descricao' ? ta('topicosL', 'Tópicos e subtópicos', 'ex.: 1.1 Tensão normal; 1.2 Tensão de cisalhamento', 70) : ''}
      ${ta('detalhesL', f.modoL === 'anexados' ? 'Detalhes (opcional)' : 'Detalhes', { anexados: 'ex.: só as questões 1 a 10; separar em duas listas, uma por tópico', inspirados: 'ex.: 3 exercícios novos para cada anexado, um pouco mais difíceis', descricao: 'ex.: 12 exercícios; do fácil ao difícil; no estilo da P1 de 2024.1; incluir 2 com figura' }[f.modoL], 80)}
      ${f.modoL !== 'descricao' ? '<p class="tiny muted" style="margin:0">Lembre de anexar os exercícios (PDF, foto ou texto) junto com o prompt na conversa.</p>' : ''}
      <div class="row"><button class="btn primary" data-copy="listas">Copiar prompt de listas</button><button class="btn ghost sm" data-show="listas">Ver prompt</button></div>
      <pre class="ref" data-pre="listas" hidden></pre></div>
  </div>`;
  const gen = (k) => (k === 'aulas'
    ? promptPacote({ materia: f.materia, sigla: f.sigla, topicos: f.topicos, ementa: f.ementa, parte: f.parteA, foco: f.focoA, incluir: { aulas: f.incA, essenciais: f.incE, passos: f.incP, listas: f.incL }, detalhes: { aulas: f.detA, essenciais: f.detE, passos: f.detP, listas: f.detL } })
    : k === 'passos' ? promptPassos({ materia: f.materia, sigla: f.sigla, topicos: f.topicos, ementa: f.ementa, parte: f.parteP, detalhes: f.detalhesP })
    : promptListas({ materia: f.materia, sigla: f.sigla, divisao: f.topicos, ementa: f.ementa, topicos: f.topicosL, detalhes: f.detalhesL, modo: f.modoL }));
  const refresh = () => { lsSet('promptCampos', f); el.querySelectorAll('[data-pre]').forEach((p) => { if (!p.hidden) p.textContent = gen(p.dataset.pre); }); };
  el.querySelectorAll('[data-f]').forEach((i) => (i.oninput = () => { f[i.dataset.f] = i.value; refresh(); }));
  el.querySelectorAll('[data-inc]').forEach((c) => (c.onchange = () => { f[c.dataset.inc] = c.checked; lsSet('promptCampos', f); panelPrompts(el); }));
  el.querySelectorAll('input[name=modoL]').forEach((r) => (r.onchange = () => { f.modoL = r.value; lsSet('promptCampos', f); panelPrompts(el); }));
  el.querySelectorAll('[data-copy]').forEach((b) => (b.onclick = () => copyText(gen(b.dataset.copy))));
  el.querySelectorAll('[data-show]').forEach((b) => (b.onclick = () => { const p = el.querySelector(`[data-pre="${b.dataset.show}"]`); p.hidden = !p.hidden; p.textContent = gen(b.dataset.show); }));
}

function panelModelo(el) {
  el.innerHTML = `<div class="stack">
    <div class="card stack-s"><h3>Como o código funciona</h3>
      <ul class="small" style="margin:0;padding-left:1.2em">
        <li>O topo tem os metadados. O primeiro é sempre <code>@tipo</code>: <code>aula</code>, <code>lista</code>, <code>essencial</code> ou <code>passo-a-passo</code> — é ele que diz ao app onde pôr o arquivo. Depois: <code>@id</code>, <code>@materia</code>, <code>@topico</code>, <code>@subtopico</code>, <code>@titulo</code>, <code>@tags</code>, e opcionais <code>@tempo</code> e <code>@descricao</code>.</li>
        <li>Cada parte começa com <code>== TIPO | título</code>. Aulas: EXPLICACAO, FORMULA, EXEMPLO, CHECAGEM, RESUMO. Essenciais (um arquivo por tópico): SUBTOPICO. Passo a passo (um arquivo por tópico): QUESTAO, com <code>@subtopico</code>, <code>@quando</code>, <code>@passos</code>, <code>@formula</code>, <code>@cuidado</code>, <code>@exemplo</code>. Listas: EXERCICIO.</li>
        <li>Campos dentro das partes: <code>@topico</code>, <code>@subtopico</code>, <code>@descricao</code> (opcionais) e <code>@leitura</code> (fórmula); <code>@enunciado</code>, <code>@resolucao</code>, <code>@resposta</code> (exemplo); <code>@pergunta</code>, <code>@dica</code>, <code>@formula</code>, <code>@resposta</code>, <code>@resolucao</code> (checagem); <code>@topico</code>, <code>@subtopico</code>, <code>@descricao</code>, <code>@origem</code>, <code>@enunciado</code>, <code>@dica</code>, <code>@formula</code>, <code>@resposta</code>, <code>@resolucao</code> (exercício; tópico e subtópico com os nomes da divisão da matéria, para o filtro da lista). <code>@dica</code> e <code>@formula</code> viram os botões “Mostrar dica” e “Mostrar fórmula”; sem eles, o botão não aparece.</li>
        <li>Matemática: <code>$...$</code> no texto e <code>$$...$$</code> em destaque. Figuras: <code>[figura: arquivo.png | legenda]</code>. Interativos: <code>[interativo: arquivo.html | 400 | legenda]</code>.</li>
        <li>Texto: <code>- lista</code>, <code>1. lista</code>, <code>### subtítulo</code>, tabelas com <code>|</code>, <code>! dica</code>, <code>!! atenção</code>, <code>**negrito**</code>, <code>*itálico*</code>. Linhas com <code>//</code> são comentários.</li>
        <li>Arquivos colados no texto: <code>=== ARQUIVO: nome.html ===</code> … <code>=== FIM DO ARQUIVO ===</code>.</li>
      </ul></div>
    <div class="card stack-s"><div class="row between"><h3>Modelo de aula</h3><button class="btn sm" data-cp="a">Copiar</button></div><pre class="ref">${esc(MODELO_AULA)}</pre></div>
    <div class="card stack-s"><div class="row between"><h3>Modelo de essenciais</h3><button class="btn sm" data-cp="e">Copiar</button></div><pre class="ref">${esc(MODELO_ESSENCIAL)}</pre></div>
    <div class="card stack-s"><div class="row between"><h3>Modelo de passo a passo</h3><button class="btn sm" data-cp="p">Copiar</button></div><pre class="ref">${esc(MODELO_PASSOS)}</pre></div>
    <div class="card stack-s"><div class="row between"><h3>Modelo de lista</h3><button class="btn sm" data-cp="l">Copiar</button></div><pre class="ref">${esc(MODELO_LISTA)}</pre></div>
  </div>`;
  el.querySelector('[data-cp="a"]').onclick = () => copyText(MODELO_AULA);
  el.querySelector('[data-cp="l"]').onclick = () => copyText(MODELO_LISTA);
  el.querySelector('[data-cp="e"]').onclick = () => copyText(MODELO_ESSENCIAL);
  el.querySelector('[data-cp="p"]').onclick = () => copyText(MODELO_PASSOS);
}
