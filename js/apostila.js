// Apostila da matéria: escolher o que entra (aulas, essenciais, passo a passo, formulário, listas com gabarito comentado)
// e imprimir / salvar em PDF, em Arial, formatada como apostila.
import { materiaByKey, matCfg } from './data.js';
import { lsGet, lsSet, getMedia } from './store.js';
import { esc, plural } from './util.js';
import { richHtml, inl, fitMath } from './render.js';

const has = (n) => n && n.length;
const R = (nodes) => (has(nodes) ? richHtml(nodes) : '');
const romano = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

function defaults(m) {
  const all = (l) => Object.fromEntries(l.map((x) => [x.id, true]));
  return { aulas: all(m.aulas), ess: all(m.essenciais), passos: all(m.passos), listas: all(m.listas), formulario: m.aulas.some((a) => a.parsed.formulas.length), capa: true, sumario: true, respChk: true, gabSep: false };
}
function loadSel(m) {
  const d = defaults(m), s = lsGet('apostila:' + m.key, null);
  if (!s) return d;
  for (const k of ['aulas', 'ess', 'passos', 'listas']) d[k] = Object.fromEntries(Object.keys(d[k]).map((id) => [id, s[k]?.[id] ?? true]));
  for (const k of ['formulario', 'capa', 'sumario', 'respChk', 'gabSep']) if (s[k] != null) d[k] = s[k];
  return d;
}

// ---------------- Conteúdo ----------------
function topicoLinha(b) {
  const t = [b.topico, b.subtopico].filter(Boolean).map(esc).join(' › ');
  return t || b.origem ? `<div class="ap-top">${t}${b.origem ? `${t ? ' · ' : ''}${esc(b.origem)}` : ''}</div>` : '';
}
function aulaHtml(a, n, sel) {
  let sub = 0, chkN = 0;
  const resp = [];
  const corpo = a.parsed.blocks.map((b) => {
    switch (b.type) {
      case 'explicacao': case 'resumo':
        return `<h3 class="ap-h3">${n}.${++sub} ${b.title ? inl(b.title) : b.type === 'resumo' ? 'Resumo' : 'Explicação'}</h3>${R(b.nodes)}`;
      case 'formula':
        return `<div class="ap-box ap-formula"><div class="ap-lbl">Fórmulas${b.title ? ' — ' + inl(b.title) : ''}</div>${R(b.nodes)}</div>`;
      case 'exemplo':
        return `<div class="ap-box ap-exemplo"><div class="ap-lbl">Exemplo${b.title ? ' — ' + inl(b.title) : ''}</div>${R(b.enunciado)}
          ${has(b.resolucao) ? `<div class="ap-sublbl">Resolução</div>${R(b.resolucao)}` : ''}${has(b.resposta) ? `<div class="ap-sublbl">Resposta</div>${R(b.resposta)}` : ''}</div>`;
      case 'checagem': {
        const k = ++chkN;
        if (sel.respChk && (has(b.resposta) || has(b.resolucao))) resp.push(`<div class="ap-gab-item"><div class="ap-gab-n">Verificação ${n}.${k}</div>${has(b.resposta) ? `<div class="ap-sublbl">Resposta</div>${R(b.resposta)}` : ''}${has(b.resolucao) ? `<div class="ap-sublbl">Resolução</div>${R(b.resolucao)}` : ''}</div>`);
        return `<div class="ap-box ap-check"><div class="ap-lbl">Para verificar ${n}.${k}${b.title ? ' — ' + inl(b.title) : ''}</div>${R(b.pergunta)}</div>`;
      }
    }
    return '';
  }).join('');
  const m = a.meta;
  return `<section class="ap-aula" id="ap-aula-${n}"><h2 class="ap-h2">${n}. ${inl(a.titulo)}</h2>
    ${m.subtopico || m.descricao ? `<p class="ap-desc">${m.subtopico && m.subtopico !== a.titulo ? inl(m.subtopico) + (m.descricao ? ' — ' : '') : ''}${m.descricao ? inl(m.descricao) : ''}</p>` : ''}
    ${corpo}
    ${resp.length ? `<div class="ap-resp"><h4 class="ap-h4">Respostas das verificações da aula ${n}</h4>${resp.join('')}</div>` : ''}</section>`;
}
function essHtml(e, n) {
  return `<section class="ap-ess" id="ap-ess-${n}"><h2 class="ap-h2">${inl(e.meta.topico || e.titulo)}</h2>${e.meta.descricao ? `<p class="ap-desc">${inl(e.meta.descricao)}</p>` : ''}
    ${e.parsed.blocks.map((b) => `<div class="ap-secao"><h3 class="ap-h3">${inl(b.title || 'Geral')}</h3>${R(b.nodes)}</div>`).join('')}</section>`;
}
function passosHtml(p, n) {
  return `<section class="ap-passos" id="ap-pp-${n}"><h2 class="ap-h2">${inl(p.meta.topico || p.titulo)}</h2>
    ${p.parsed.blocks.map((b) => `<div class="ap-questao"><h3 class="ap-h3">${inl(b.title || 'Tipo de questão')}</h3>${b.subtopico ? `<div class="ap-top">${esc(b.subtopico)}</div>` : ''}
      ${has(b.quando) ? `<div class="ap-sublbl">Quando usar</div>${R(b.quando)}` : ''}
      ${has(b.passos) ? `<div class="ap-sublbl">Passo a passo</div>${R(b.passos)}` : ''}
      ${has(b.formula) ? `<div class="ap-box ap-formula">${R(b.formula)}</div>` : ''}
      ${has(b.cuidado) ? `<div class="ap-box ap-cuidado"><div class="ap-lbl">Cuidado</div>${R(b.cuidado)}</div>` : ''}
      ${has(b.exemplo) ? `<div class="ap-box ap-exemplo"><div class="ap-lbl">Exemplo</div>${R(b.exemplo)}</div>` : ''}</div>`).join('')}</section>`;
}
function formularioHtml(m) {
  return m.aulas.filter((a) => a.parsed.formulas.length).map((a) => `<div class="ap-form-aula"><h3 class="ap-h3">${inl(a.titulo)}</h3>
    ${a.parsed.formulas.map((b) => `<div class="ap-box ap-formula">${b.title ? `<div class="ap-lbl">${inl(b.title)}</div>` : ''}${R(b.nodes)}</div>`).join('')}</div>`).join('');
}
function listaHtml(L, n, sel) {
  const ex = L.parsed.blocks;
  const num = (b, i) => esc(b.title && /^\d+$/.test(b.title) ? b.title : String(i + 1));
  const enun = ex.map((b, i) => `<div class="ap-ex"><div class="ap-ex-n">Exercício ${num(b, i)}</div>${topicoLinha(b)}${R(b.enunciado)}</div>`).join('');
  const gab = ex.map((b, i) => `<div class="ap-gab-item"><div class="ap-gab-n">Exercício ${num(b, i)}</div>
      ${has(b.resposta) ? `<div class="ap-sublbl">Resposta</div>${R(b.resposta)}` : ''}
      ${has(b.resolucao) ? `<div class="ap-sublbl">Resolução comentada</div>${R(b.resolucao)}` : ''}
      ${!has(b.resposta) && !has(b.resolucao) ? '<p class="ap-desc">Sem gabarito no material.</p>' : ''}</div>`).join('');
  return `<section class="ap-lista" id="ap-lista-${n}"><h2 class="ap-h2">${inl(L.titulo)}</h2>${L.meta.descricao ? `<p class="ap-desc">${inl(L.meta.descricao)}</p>` : ''}
    ${enun}
    <div class="ap-gab ${sel.gabSep ? 'ap-break' : ''}"><h3 class="ap-h3 ap-gab-t">Gabarito comentado — ${inl(L.titulo)}</h3>${gab}</div></section>`;
}

export function apostilaHtml(m, sel) {
  const c = matCfg(m.key) || {};
  const A = m.aulas.filter((x) => sel.aulas[x.id]), E = m.essenciais.filter((x) => sel.ess[x.id]), P = m.passos.filter((x) => sel.passos[x.id]), L = m.listas.filter((x) => sel.listas[x.id]);
  const partes = [];
  if (A.length) partes.push({ id: 'aulas', t: 'Aulas', itens: A.map((a, i) => ({ id: `ap-aula-${i + 1}`, t: `${i + 1}. ${a.titulo}` })), html: A.map((a, i) => aulaHtml(a, i + 1, sel)).join('') });
  if (E.length) partes.push({ id: 'ess', t: 'Essenciais', itens: E.map((e, i) => ({ id: `ap-ess-${i + 1}`, t: e.meta.topico || e.titulo })), html: E.map((e, i) => essHtml(e, i + 1)).join('') });
  if (P.length) partes.push({ id: 'pp', t: 'Passo a passo dos tipos de questão', itens: P.map((p, i) => ({ id: `ap-pp-${i + 1}`, t: p.meta.topico || p.titulo })), html: P.map((p, i) => passosHtml(p, i + 1)).join('') });
  if (sel.formulario && m.aulas.some((a) => a.parsed.formulas.length)) partes.push({ id: 'form', t: 'Formulário', itens: [], html: formularioHtml(m) });
  if (L.length) partes.push({ id: 'listas', t: 'Listas de exercícios', itens: L.map((l, i) => ({ id: `ap-lista-${i + 1}`, t: `${l.titulo} (com gabarito comentado)` })), html: L.map((l, i) => listaHtml(l, i + 1, sel)).join('') });
  if (!partes.length) return '<div class="ap-vazio">Escolha pelo menos uma parte para a apostila.</div>';
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const capa = sel.capa ? `<section class="ap-capa"><div class="ap-capa-k">Apostila</div><h1 class="ap-capa-t">${esc(m.nome)}</h1>
    <div class="ap-capa-info">${[c.codigo, c.professor ? 'Prof. ' + c.professor : '', c.periodo ? 'Período ' + c.periodo : ''].filter(Boolean).map(esc).join('<br>')}</div>
    <div class="ap-capa-c">${partes.map((p) => esc(p.t)).join(' · ')}</div><div class="ap-capa-d">${esc(hoje)}</div></section>` : '';
  const sum = sel.sumario ? `<section class="ap-sumario"><h2 class="ap-h2">Sumário</h2><ol class="ap-sum">${partes.map((p, k) => `<li><a href="#ap-parte-${p.id}"><b>Parte ${romano[k]} — ${esc(p.t)}</b></a>${p.itens.length ? `<ol>${p.itens.map((x) => `<li><a href="#${x.id}">${inl(x.t)}</a></li>`).join('')}</ol>` : ''}</li>`).join('')}</ol></section>` : '';
  return `${capa}${sum}${partes.map((p, k) => `<section class="ap-parte" id="ap-parte-${p.id}"><h1 class="ap-h1"><span>Parte ${romano[k]}</span>${esc(p.t)}</h1>${p.html}</section>`).join('')}`;
}

/** Figuras: carrega já (sem lazy) para sair na impressão; interativos viram um aviso. */
async function prepararMidia(doc) {
  doc.querySelectorAll('figure.inter').forEach((fg) => {
    const cap = fg.querySelector('figcaption');
    fg.outerHTML = `<div class="ap-inter">◆ Visualização interativa disponível no app Oficina${cap ? ': ' + cap.innerHTML : '.'}</div>`;
  });
  await Promise.all([...doc.querySelectorAll('figure.fig[data-midia]')].map(async (fg) => {
    const m = await getMedia(fg.dataset.midia).catch(() => null);
    const ph = fg.querySelector('.media-ph');
    if (!m || /\.html?$/i.test(fg.dataset.midia)) { ph.outerHTML = `<div class="ap-inter">Figura “${esc(fg.dataset.midia)}” não encontrada.</div>`; return; }
    const img = new Image(); img.src = m.dados; img.alt = '';
    ph.replaceWith(img);
    if (!img.complete) await new Promise((r) => { img.onload = img.onerror = r; });
  }));
}

export function renderApostila(v, key, { go } = {}) {
  const m = materiaByKey(key);
  if (!m) { v.innerHTML = '<div class="empty">Matéria não encontrada.</div>'; return; }
  const sel = loadSel(m);
  const grupo = (k, lab, list, nome) => !list.length ? '' : `<div class="ap-grp"><div class="row between nowrap"><b>${lab}</b><span class="row nowrap" style="gap:4px"><button class="btn xs ghost" data-all="${k}">todas</button><button class="btn xs ghost" data-none="${k}">nenhuma</button></span></div>
    <div class="ap-checks">${list.map((x, i) => `<label class="ap-chk"><input type="checkbox" data-k="${k}" value="${esc(x.id)}" ${sel[k][x.id] ? 'checked' : ''}><span>${k === 'aulas' ? `<span class="muted">${i + 1}.</span> ` : ''}${inl(nome(x))}</span></label>`).join('')}</div></div>`;
  v.innerHTML = `<div class="ap-page fade-in">
    <div class="ap-config no-print stack">
      <div class="page-head" style="margin-bottom:0"><div class="kicker"><a href="#materia/${esc(key)}">${esc(m.nome)}</a> ›</div><h1>Apostila</h1>
        <p class="small muted" style="margin:6px 0 0">Escolha o que entra. Cada lista vem seguida do gabarito comentado dela. Depois toque em “Imprimir / salvar PDF” e escolha <b>Salvar como PDF</b> (no celular: Compartilhar › Imprimir).</p></div>
      <div class="card stack-s ap-sel">
        ${grupo('aulas', 'Aulas', m.aulas, (x) => x.titulo)}
        ${grupo('ess', 'Essenciais', m.essenciais, (x) => x.meta.topico || x.titulo)}
        ${grupo('passos', 'Passo a passo', m.passos, (x) => x.meta.topico || x.titulo)}
        ${grupo('listas', 'Listas (com gabarito comentado)', m.listas, (x) => `${x.titulo} <span class="muted">(${plural(x.parsed.blocks.length, 'exercício')})</span>`)}
        <div class="ap-grp"><b>Opções</b><div class="ap-checks">
          ${m.aulas.some((a) => a.parsed.formulas.length) ? `<label class="ap-chk"><input type="checkbox" data-o="formulario" ${sel.formulario ? 'checked' : ''}><span>Formulário com todas as fórmulas da matéria</span></label>` : ''}
          <label class="ap-chk"><input type="checkbox" data-o="capa" ${sel.capa ? 'checked' : ''}><span>Capa</span></label>
          <label class="ap-chk"><input type="checkbox" data-o="sumario" ${sel.sumario ? 'checked' : ''}><span>Sumário</span></label>
          <label class="ap-chk"><input type="checkbox" data-o="respChk" ${sel.respChk ? 'checked' : ''}><span>Respostas das verificações no fim de cada aula</span></label>
          <label class="ap-chk"><input type="checkbox" data-o="gabSep" ${sel.gabSep ? 'checked' : ''}><span>Gabarito de cada lista começando em página nova</span></label>
        </div></div>
        <div class="row between"><span class="small muted" data-resumo></span><button class="btn primary" data-print>🖨 Imprimir / salvar PDF</button></div>
      </div>
      <div class="caps muted small">Prévia</div>
    </div>
    <article class="apostila-doc" data-doc></article>
  </div>`;
  const doc = v.querySelector('[data-doc]');
  let t = null, seq = 0;
  const draw = async () => {
    const my = ++seq;
    lsSet('apostila:' + key, sel);
    const n = ['aulas', 'ess', 'passos', 'listas'].map((k) => Object.values(sel[k]).filter(Boolean).length);
    v.querySelector('[data-resumo]').textContent = [n[0] && plural(n[0], 'aula'), n[1] && `${n[1]} essenciais`, n[2] && `${n[2]} passo a passo`, n[3] && plural(n[3], 'lista')].filter(Boolean).join(' · ') || 'Nada escolhido';
    doc.innerHTML = apostilaHtml(m, sel);
    await prepararMidia(doc);
    if (my !== seq) return;
    fitMath(doc);
  };
  v.querySelectorAll('[data-k]').forEach((c) => (c.onchange = () => { sel[c.dataset.k][c.value] = c.checked; clearTimeout(t); t = setTimeout(draw, 250); }));
  v.querySelectorAll('[data-o]').forEach((c) => (c.onchange = () => { sel[c.dataset.o] = c.checked; clearTimeout(t); t = setTimeout(draw, 250); }));
  const setAll = (k, on) => { for (const id of Object.keys(sel[k])) sel[k][id] = on; v.querySelectorAll(`[data-k="${k}"]`).forEach((c) => (c.checked = on)); draw(); };
  v.querySelectorAll('[data-all]').forEach((b) => (b.onclick = () => setAll(b.dataset.all, true)));
  v.querySelectorAll('[data-none]').forEach((b) => (b.onclick = () => setAll(b.dataset.none, false)));
  doc.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#ap-"]'); if (!a) return;
    e.preventDefault(); doc.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' });
  });
  v.querySelector('[data-print]').onclick = async () => {
    await draw();
    const old = document.title; document.title = `Apostila — ${m.nome}`;
    window.print();
    setTimeout(() => (document.title = old), 1000);
  };
  draw();
}
