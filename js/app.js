import { CONFIG } from './config.js';
import * as S from './store.js';
import { lsGet, lsSet } from './store.js';
import { Store, save, on } from './store.js';
import * as TTS from './speech.js';
import { $, esc, toast, modal, confirmBox, plural, dayKey, fmtDate, filtToggle, filtBody, wireFilt, setFiltCount } from './util.js';
import { copyContext, itemTagsRow, wireItemTags } from './tags.js';
import { contaBiblioteca, wireContaBiblioteca } from './conta.js';
import { renderApostila } from './apostila.js';
import { rebuild, ITEMS, itemById, materias, materiaByKey, aulaProg, aulaPct, listaStats, streak, dayRec, tagsOf, matchTags, setGroupOrder, bump, groupOf, savedList, exTags, saveKey, topicsOf, matchTopic, matchQuery, itemHay, qNodes, activeMaterias, byPeriodo, setMatCfg, setStudyMat, tempoMateria, fmtTempo } from './data.js';
import { initFocus, refreshFocus } from './focus.js';
import { openMateriaOptions, organizeMaterias, newMateria } from './matcfg.js';
import { renderAcomp, proxima, quando, planHtml } from './acomp.js';
import { BLOCK_TYPES, nodesText } from './parser.js';
const nodesTextOf = (b) => nodesText(b.enunciado || b.pergunta);
import { openAula, teardown, wireSay, blockHeader, blockBody, answerArea, wireAnswer, wireStar, topicLine } from './aula.js';
import { openLista } from './lista.js';
import { renderStudio } from './studio.js';
import { renderBanco, openPratica, srcLine, revisarCard, wireRevisar } from './banco.js';
import { richHtml, hydrate, inl, speechOf } from './render.js';
import { sortable } from './sortable.js';

const view = () => $('#view');
const NAV = [['inicio', 'Início', '☼'], ['materias', 'Matérias', '❦'], ['listas', 'Listas', '✐'], ['formulas', 'Fórmulas', '∑'], ['estudio', 'Estúdio', '✒'], ['ajustes', 'Ajustes', '⚙']];
let current = '', routeName = '';
let pending = {};
export function go(hash, params = {}) { pending = params; if (location.hash === hash) route(); else location.hash = hash; }

function applyPrefs() {
  const p = Store.state.perfil;
  document.documentElement.dataset.fonte = p.fonte || 'm';
  document.documentElement.dataset.tema = p.tema || 'claro';
  document.documentElement.dataset.vista = p.vista === 'compacta' ? 'compacta' : 'normal';
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', p.tema === 'noite' ? '#1f2633' : p.tema === 'grafite' ? '#121212' : '#eef5fc');
  TTS.setPrefs({ voices: p.voz ? { pt: p.voz } : {}, speed: p.vel || 'normal' });
}

const compacta = () => Store.state.perfil.vista === 'compacta';
function toggleVista() {
  const p = Store.state.perfil; p.vista = compacta() ? 'normal' : 'compacta'; save('perfil'); applyPrefs(); shell(); if (!['aula', 'lista', 'pratica'].includes(routeName)) route(true);
  toast(compacta() ? 'Visão compacta' : 'Visão normal');
}
function shell() {
  $('#side').innerHTML = `<div class="brand"><div class="name">${esc(CONFIG.nome)}</div><div class="sub">✦ ✦ ✦</div></div>
    ${NAV.map(([k, l, ic]) => `<a class="nav-link ${current === k ? 'on' : ''}" href="#${k}"><span class="ic">${ic}</span>${l}</a>`).join('')}
    <div class="spacer"></div><button class="nav-link vista-tog" data-vistatog title="Trocar entre a visão normal e a compacta"><span class="ic">${compacta() ? '▢' : '▤'}</span>${compacta() ? 'Visão normal' : 'Visão compacta'}</button><div class="sync">${syncLabel()}</div>`;
  $('#topbar').innerHTML = `<div class="name">${esc(CONFIG.nome)}</div><div class="row nowrap"><span class="small muted">${syncShort()}</span><button class="icon-btn sm" data-vistatog title="${compacta() ? 'Visão normal' : 'Visão compacta'}" aria-label="Trocar visão">${compacta() ? '▢' : '▤'}</button></div>`;
  $('#tabbar').innerHTML = NAV.map(([k, l, ic]) => `<button data-tab="${k}" class="${current === k ? 'on' : ''}"><span class="ic">${ic}</span>${l}</button>`).join('');
}
function syncLabel() {
  if (!Store.configured) return `<span class="dot"></span>Só neste aparelho`;
  const m = { local: ['', 'Não conectada'], conectando: ['warn', 'Conectando…'], sincronizado: ['ok', 'Sincronizado'], pendente: ['warn', 'Salvando…'], offline: ['warn', 'Offline — salvo aqui'], erro: ['err', 'Erro de sincronização'] }[Store.status] || ['', ''];
  return `<span class="dot ${m[0]}"></span>${m[1]}${Store.user ? `<span class="tiny" style="margin-left:auto;opacity:.7">${esc((Store.user.email || '').split('@')[0])}</span>` : ''}`;
}
const syncShort = () => (Store.configured && Store.user ? `<span class="dot ${Store.status === 'sincronizado' ? 'ok' : Store.status === 'erro' ? 'err' : 'warn'}"></span>` : '');

document.addEventListener('click', (e) => {
  const g = e.target.closest('[data-goto]'); if (g) { go('#' + g.dataset.goto); return; }
  if (e.target.closest('[data-vistatog]')) { toggleVista(); return; }
  const a = e.target.closest('a.nav-link'); if (a && a.getAttribute('href') === location.hash) { e.preventDefault(); route(); return; }
  const t = e.target.closest('#tabbar [data-tab]'); if (t) go('#' + t.dataset.tab);
});

// ---------------------------------------------------------------
function route(keepScroll) {
  const h = location.hash.replace(/^#/, '') || 'inicio';
  const [name, ...rest] = h.split('/');
  const arg = decodeURIComponent(rest.join('/'));
  teardown();
  document.querySelectorAll('.modal-bg').forEach((m) => m.remove());
  const params = pending; pending = {};
  current = { aula: 'materias', lista: 'listas', materia: 'materias', salvos: 'listas', banco: 'listas', pratica: 'listas', essencial: 'materias', passos: 'materias', apostila: 'materias' }[name] || name;
  routeName = name;
  document.body.classList.toggle('focus', ['aula', 'lista', 'pratica'].includes(name));
  document.body.classList.toggle('ap-mode', name === 'apostila');
  shell();
  const v = view();
  setStudyMat(['aula', 'lista', 'essencial', 'passos'].includes(name) ? itemById(arg)?.mkey : null);
  setTimeout(refreshFocus, 0);
  if (name === 'aula') { openAula(v, arg, { go }); return; }
  if (name === 'lista') { openLista(v, arg, { go }); return; }
  if (name === 'pratica') { openPratica(v, { go }); return; }
  if (name === 'apostila') { setStudyMat(null); renderApostila(v, arg, { go }); window.scrollTo({ top: 0 }); return; }
  if (name === 'essencial') { openEssencial(v, arg); window.scrollTo({ top: 0 }); return; }
  if (name === 'passos') { const it = itemById(arg); if (it) { MF[it.mkey] = { ...(MF[it.mkey] || { tags: [] }), ptopic: it.meta.topico || '' }; renderMateria(v, it.mkey, { aba: 'passos' }); } else renderMaterias(v); window.scrollTo({ top: 0 }); return; }
  const y = window.scrollY;
  const R = { inicio: renderHome, materias: (el) => (arg === 'todas' ? renderTodas(el) : renderMaterias(el)), materia: (el) => renderMateria(el, arg, params), formulas: (el) => renderFormulasPage(el, arg), salvos: (el) => renderListasPage(el, { aba: 'salvos' }), banco: (el) => renderListasPage(el, { aba: 'banco' }), listas: (el) => renderListasPage(el, params), estudio: (el) => renderStudio(el, { go, params }), ajustes: renderSettings }[name] || renderHome;
  R(v, params);
  window.scrollTo({ top: keepScroll === true ? y : 0 });
}
const LIVE = new Set(['inicio', 'materias', 'materia', 'formulas', 'listas', 'ajustes']);
function refreshIfIdle() {
  shell();
  if (LIVE.has(routeName) && !document.activeElement?.matches('input, textarea, select') && !document.querySelector('.modal-bg, [data-busy], .srt-ghost')) route(true);
}

// ---------------------------------------------------------------
//  Início
// ---------------------------------------------------------------
function hello() { const h = new Date().getHours(); return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }
function matStats(m) {
  const aDone = m.aulas.filter((a) => aulaProg(a.id)?.status === 'concluida').length;
  const lDone = m.listas.filter((l) => listaStats(l).done).length;
  const total = m.aulas.length + m.listas.length;
  return { aDone, lDone, pct: total ? Math.round(((aDone + lDone) / total) * 100) : 0 };
}
function matCard(m) {
  const s = matStats(m);
  const next = m.aulas.find((a) => aulaProg(a.id)?.status !== 'concluida');
  return `<a class="card mat-card" href="#materia/${esc(m.key)}">
    <div class="row nowrap between"><div><div class="mat-name">${esc(m.nome)}</div>${m.cfg?.periodo || m.cfg?.arquivada || m.cfg?.codigo ? `<div class="row" style="gap:6px;margin-top:4px">${m.cfg.codigo ? `<span class="per-chip cod">${esc(m.cfg.codigo)}</span>` : ''}${m.cfg.periodo ? `<span class="per-chip">${esc(m.cfg.periodo)}</span>` : ''}${m.cfg.arquivada ? '<span class="per-chip arq">arquivada</span>' : ''}</div>` : ''}</div><div class="mini-ring" style="--p:${s.pct}"><span>${s.pct}%</span></div></div>
    <div class="small muted">${s.aDone}/${m.aulas.length} aulas · ${s.lDone}/${m.listas.length} listas</div>
    ${next ? `<div class="small mat-next">Próxima: <i>${inl(next.titulo)}</i></div>` : m.aulas.length ? '<div class="small mat-next">Todas as aulas concluídas ✦</div>' : !m.listas.length && !m.essenciais.length && !m.passos.length ? '<div class="small mat-next">Vazia — gere o conteúdo no Estúdio › Prompts para IA</div>' : ''}
    ${(() => { const av = proxima(m.key); return av ? `<div class="small mat-av">📅 ${esc(av.nome || 'Avaliação')} ${quando(av.data)}</div>` : ''; })()}
  </a>`;
}
function emptyState() {
  return `<div class="card empty stack"><span class="orn">✦</span><div>Ainda não há aulas nem listas.</div>
    <div class="row" style="justify-content:center"><button class="btn primary" data-newm2>+ Nova matéria</button><button class="btn" data-goto="estudio">Importar aulas</button><button class="btn" data-example>Ver um exemplo</button></div></div>`;
}
function wireExample(v) {
  v.querySelector('[data-example]')?.addEventListener('click', () => go('#estudio', { tab: 'importar', exemplo: true }));
  v.querySelector('[data-newm2]')?.addEventListener('click', () => newMateria((k) => { rebuild(); go('#materia/' + k); }));
}
function renderHome(v) {
  const p = Store.state.perfil;
  const mats = activeMaterias();
  const last = p.ultima && itemById(p.ultima.id);
  const lastPct = last ? (last.tipo === 'aula' ? aulaPct(last) : listaStats(last).pct) : 0;
  const goal = 30;
  const rec = dayRec();
  const st = Store.state.progresso.stats;
  const D = Store.state.progresso.dias;
  const days = []; const d0 = new Date(); d0.setDate(d0.getDate() - (7 * 15 + d0.getDay()));
  for (let i = 0; i < 16 * 7; i++) { const d = new Date(d0); d.setDate(d0.getDate() + i); days.push(d); }
  const lvl = (k) => { const r = D[k]; if (!r) return 0; const m = r.min + r.itens * 2; return m <= 0 ? 0 : m < goal * 0.34 ? 1 : m < goal * 0.67 ? 2 : m < goal ? 3 : 4; };
  const todayK = dayKey();
  const sk = streak();
  setTimeout(() => wireRevisar(v, go), 0);
  v.innerHTML = `<div class="wrap fade-in stack-l">
    <div class="hello page-head" style="margin-bottom:0"><div class="kicker">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      <h1>${hello()}${p.nome ? `, <em>${esc(p.nome)}</em>` : ''}.</h1><p>Um passo de cada vez. Abra uma aula e comece pela primeira parte.</p></div>
    ${Store.configured && !Store.user ? `<div class="banner"><span style="font-size:1.4rem">☁</span><div class="grow">Entre na sua conta para sincronizar entre celular e computador.</div><button class="btn sm" data-goto="ajustes">Entrar</button></div>` : ''}
    ${!mats.length ? emptyState() : ''}
    ${mats.length ? revisarCard() : ''}
    ${(() => { const blocks = mats.map((m) => { const av = proxima(m.key); if (!av) return ''; const h = planHtml(m, av, { compact: true }); return h ? `<div class="hoje-mat"><div class="small"><b>${esc(m.nome)}</b> · ${esc(av.nome || 'avaliação')} ${quando(av.data)}</div>${h}</div>` : ''; }).filter(Boolean);
      return blocks.length ? `<div class="card stack-s hoje-plano"><div class="caps muted">Hoje no plano</div>${blocks.join('')}</div>` : ''; })()}
    ${last ? `<a class="card hero-lesson" href="#${last.tipo}/${esc(last.id)}">
      <div class="grow"><div class="caps">Continuar · ${esc(last.materia)}</div><div class="h">${inl(last.titulo)}</div>
      <div class="progress" style="margin-top:12px;background:rgba(255,255,255,.55)"><i style="width:${lastPct}%"></i></div></div>
      <span class="btn primary">Continuar →</span></a>` : ''}
    ${mats.length ? `<div><div class="row between" style="margin-bottom:12px"><h2>Matérias</h2><a class="small" href="#materias">ver todas</a></div><div class="grid g2">${mats.map(matCard).join('')}</div></div>` : ''}
    ${mats.length ? `<div class="grid g4">
      <div class="card stat"><div class="v">${rec.min}<span class="small muted"> min</span></div><div class="k">estudados hoje</div></div>
      <div class="card stat"><div class="v">${sk}</div><div class="k">${sk === 1 ? 'dia seguido' : 'dias seguidos'}</div></div>
      <div class="card stat"><div class="v">${st.chk ? Math.round((st.chkOk / st.chk) * 100) + '%' : '—'}</div><div class="k">acertos nas checagens</div></div>
      <div class="card stat"><div class="v">${st.ex ? Math.round((st.exOk / st.ex) * 100) + '%' : '—'}</div><div class="k">acertos nas listas</div></div>
    </div>
    <div class="card"><div class="row between" style="margin-bottom:12px"><div class="caps muted">Constância · 16 semanas</div><div class="tiny muted">${Object.values(D).reduce((a, r) => a + (r.min || 0), 0)} min no total</div></div>
      <div class="heat">${days.map((d) => { const k = dayKey(d); return `<i class="l${lvl(k)} ${k === todayK ? 'today' : ''}" title="${d.toLocaleDateString('pt-BR')}: ${D[k]?.min || 0} min"></i>`; }).join('')}</div></div>` : ''}
  </div>`;
  wireExample(v);
}

let MQ = '';
const groupedCards = (mats) => {
  const g = byPeriodo(mats);
  if (g.length === 1 && !g[0][0]) return `<div class="grid g2">${mats.map(matCard).join('')}</div>`;
  return g.map(([per, ms]) => `<div class="per-group"><div class="unit-head"><span class="lvl">${per ? esc(per) : '—'}</span><h2>${per ? 'Período ' + esc(per) : 'Sem período'}</h2><span class="line"></span></div><div class="grid g2">${ms.map(matCard).join('')}</div></div>`).join('');
};
function renderMaterias(v) {
  const all = materias();
  const mats = all.filter((m) => !m.cfg.arquivada);
  const nArq = all.length - mats.length;
  v.innerHTML = `<div class="wrap fade-in"><div class="page-head"><div class="kicker">Matérias</div><h1>Sua <em class="it">oficina</em></h1>
    <p>As matérias em andamento. As arquivadas ficam em “Mais matérias”.</p></div>
    ${all.length ? `<div class="row nowrap" style="margin-bottom:16px"><input class="input search grow" type="search" data-q placeholder="Pesquisar matérias, aulas e listas…" value="${esc(MQ)}">${mats.length > 1 ? '<button class="btn sm" data-org>↕ Organizar</button>' : ''}<button class="btn sm" data-newm>+ Nova</button></div>
      <div data-res></div>
      <a class="card saved-link row nowrap" href="#materias/todas" style="margin-top:18px"><span class="star-big" style="color:var(--accent)">❦</span><div class="grow"><b>Mais matérias</b><div class="small muted">Todas as matérias, separadas por período${nArq ? ` · ${plural(nArq, 'arquivada', 'arquivadas')}` : ''}</div></div><span class="muted">→</span></a>` : emptyState()}</div>`;
  wireExample(v);
  v.querySelector('[data-org]')?.addEventListener('click', () => organizeMaterias(() => renderMaterias(v)));
  v.querySelector('[data-newm]')?.addEventListener('click', () => newMateria((k) => { rebuild(); go('#materia/' + k); }));
  const res = v.querySelector('[data-res]'); if (!res) return;
  const draw = () => {
    if (!MQ.trim()) { res.innerHTML = mats.length ? groupedCards(mats) : '<div class="card empty">Todas as matérias estão arquivadas. Veja em “Mais matérias”.</div>'; return; }
    const ms = all.filter((m) => matchQuery([m.nome, m.cfg.periodo, m.cfg.codigo, m.cfg.professor].join(' '), MQ));
    const its = ITEMS.filter((it) => matchQuery(itemHay(it), MQ));
    const KIND = { aula: 'Aula', lista: 'Lista', essencial: 'Essenciais', passos: 'Passo a passo' };
    res.innerHTML = `${ms.length ? `<div class="grid g2" style="margin-bottom:16px">${ms.map(matCard).join('')}</div>` : ''}
      ${its.length ? `<div class="stack-s">${its.map((it) => `<a class="card lesson-card" href="#${it.tipo}/${esc(it.id)}"><span class="src-kind ${it.tipo}">${KIND[it.tipo]}</span><div class="grow"><div class="t" style="font-size:1.15rem">${inl(it.titulo)}</div><div class="small muted">${esc(it.materia)}${it.tags.length ? ' · ' + it.tags.map(esc).join(', ') : ''}</div></div><span class="muted">→</span></a>`).join('')}</div>` : ''}
      ${!ms.length && !its.length ? '<div class="card empty">Nada encontrado.</div>' : ''}`;
  };
  let t; v.querySelector('[data-q]').oninput = (e) => { clearTimeout(t); t = setTimeout(() => { MQ = e.target.value; draw(); }, 150); };
  draw();
}
function renderTodas(v) {
  const all = materias();
  v.innerHTML = `<div class="wrap fade-in"><div class="page-head"><div class="kicker"><a href="#materias" style="color:inherit">Matérias</a> ›</div><h1>Mais <em class="it">matérias</em></h1>
    <p>Todas as matérias, por período, incluindo as arquivadas.</p></div>
    ${!all.length ? emptyState() : byPeriodo(all).map(([per, ms]) => `<div class="per-group"><div class="unit-head"><span class="lvl">${per ? esc(per) : '—'}</span><h2>${per ? 'Período ' + esc(per) : 'Sem período'}</h2><span class="line"></span></div>
      <div class="stack-s">${ms.map((m) => `<div class="card mat-row ${m.cfg.arquivada ? 'arq' : ''}"><a class="grow" href="#materia/${esc(m.key)}" style="color:inherit;text-decoration:none"><div class="mat-name" style="font-size:1.25rem">${esc(m.nome)}</div><div class="small muted">${plural(m.aulas.length, 'aula')} · ${plural(m.listas.length, 'lista')}${m.cfg.arquivada ? ' · arquivada' : ''}</div></a>
        <div class="row nowrap" style="gap:6px"><button class="btn xs" data-arq="${esc(m.key)}">${m.cfg.arquivada ? 'Desarquivar' : 'Arquivar'}</button><button class="btn xs ghost" data-opt="${esc(m.key)}">⋯</button></div></div>`).join('')}</div></div>`).join('')}</div>`;
  wireExample(v);
  v.querySelectorAll('[data-arq]').forEach((b) => (b.onclick = () => { const m = all.find((x) => x.key === b.dataset.arq); setMatCfg(m.key, { arquivada: !m.cfg.arquivada }); toast(m.cfg.arquivada ? 'Desarquivada ✓' : 'Arquivada ✓'); renderTodas(v); }));
  v.querySelectorAll('[data-opt]').forEach((b) => (b.onclick = () => openMateriaOptions(all.find((x) => x.key === b.dataset.opt), { go, after: () => renderTodas(v) })));
}

// ---------------------------------------------------------------
//  Exercícios salvos
// ---------------------------------------------------------------
const SF = { topico: '', q: '', org: '', tag: '' };
const topicOfSaved = (x) => x.b.topico || (x.b.type === 'checagem' ? x.it.titulo : 'Sem tópico');
function renderSalvos(el, mkey) {
  const all = savedList(mkey);
  if (!all.length) { el.innerHTML = `<div class="card empty">Nenhum exercício salvo${mkey ? ' nesta matéria' : ''} ainda.<div class="small" style="margin-top:8px">Toque na estrelinha ☆ de um exercício (nas listas, no banco) ou de uma checagem (nas aulas) para guardá-lo aqui.</div></div>`; return; }
  el.innerHTML = `<div class="banco-filters card stack-s"><div class="search-row"><input class="input search" type="search" data-q placeholder="Pesquisar nos salvos…" value="${esc(SF.q)}">${filtToggle('salvos', [SF.topico, SF.org, SF.tag].filter(Boolean).length)}</div><div class="filters" data-sels ${filtBody('salvos')}></div></div><div data-list></div>`;
  const listEl = el.querySelector('[data-list]'), sels = el.querySelector('[data-sels]');
  wireFilt(el, 'salvos');
  const tagsX = (x) => [...exTags(saveKey(x.it.id, x.idx)), ...x.it.tags];
  const hay = (x) => [tagsX(x).join(' '), x.b.topico, x.b.subtopico, x.b.descricao, x.b.title, x.it.titulo, x.it.materia, x.it.tags.join(' '), nodesTextOf(x.b)].join(' ');
  const draw = () => {
    const tagList = [...new Set(all.flatMap(tagsX))].sort((a, b) => a.localeCompare(b, 'pt', { numeric: true }));
    if (SF.tag && !tagList.includes(SF.tag)) SF.tag = '';
    const base = all.filter((x) => (!SF.org || x.it.tipo === SF.org) && (!SF.tag || tagsX(x).includes(SF.tag)) && matchQuery(hay(x), SF.q));
    const topics = [...new Set(base.map(topicOfSaved))];
    if (!topics.includes(SF.topico)) SF.topico = '';
    const list = base.filter((x) => !SF.topico || topicOfSaved(x) === SF.topico);
    sels.innerHTML = `<select class="select" data-f="topico"><option value="">Todos os tópicos (${base.length})</option>${topics.map((t) => `<option value="${esc(t)}" ${SF.topico === t ? 'selected' : ''}>${esc(t)} (${base.filter((x) => topicOfSaved(x) === t).length})</option>`).join('')}</select>
      <select class="select" data-f="org"><option value="">Listas e aulas</option><option value="lista" ${SF.org === 'lista' ? 'selected' : ''}>Só das listas</option><option value="aula" ${SF.org === 'aula' ? 'selected' : ''}>Só das aulas</option></select>
      ${tagList.length ? `<select class="select" data-f="tag"><option value="">Todas as tags</option>${tagList.map((t) => `<option value="${esc(t)}" ${SF.tag === t ? 'selected' : ''}>🏷 ${esc(t)}</option>`).join('')}</select>` : ''}`;
    sels.querySelectorAll('[data-f]').forEach((x) => (x.onchange = () => { SF[x.dataset.f] = x.value; renderSalvos(el, mkey); }));
    listEl.innerHTML = !list.length ? '<div class="card empty">Nada encontrado.</div>' : `<div class="stack-s">${list.map((x, k) => `<div class="card saved-card t-${x.b.type}" data-sv="${k}">
      <div class="saved-src small">${srcLine(x, { materia: !mkey })}</div>
      ${blockHeader({ ...x.b, title: x.b.type === 'exercicio' ? x.b.title || String(x.idx + 1) : x.b.title }, { saved: true, ref: { id: x.it.id, idx: x.idx } })}${blockBody(x.b)}${answerArea(x.b, { rate: false })}</div>`).join('')}</div>`;
    listEl.querySelectorAll('[data-sv]').forEach((c) => {
      const x = list[+c.dataset.sv];
      hydrate(c); wireAnswer(c, x.b, {}); wireStar(c, x.it.id, x.idx);
      wireSay(c.querySelector('[data-sayblock]'), () => speechOf(qNodes(x.b)));
    });
  };
  let t; el.querySelector('[data-q]').oninput = (e) => { clearTimeout(t); t = setTimeout(() => { SF.q = e.target.value; draw(); }, 150); };
  draw();
}
const LF = { aba: 'mapas', q: '' };
function renderListasPage(v, params = {}) {
  if (params.aba) LF.aba = params.aba;
  const mats = activeMaterias().filter((m) => m.listas.length);
  const nSalvos = savedList().length;
  v.innerHTML = `<div class="narrow fade-in"><div class="page-head"><div class="kicker">Listas</div><h1>Listas de <em class="it">exercícios</em></h1>
    <p>${LF.aba === 'banco' ? 'Todos os exercícios das listas e as checagens das aulas, num lugar só. Pesquise, filtre, escolha e pratique.' : LF.aba === 'salvos' ? 'Os exercícios e checagens que você marcou com ☆.' : 'O mapa de listas de cada matéria. Dentro de cada lista, dá para escolher o tópico ou subtópico.'}</p></div>
    <div class="seg big" data-aba style="margin-bottom:16px">${[['mapas', 'Mapas'], ['banco', 'Banco de exercícios'], ['salvos', `★ Salvos${nSalvos ? ' (' + nSalvos + ')' : ''}`]].map(([k, l]) => `<button data-v="${k}" class="${LF.aba === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div data-body></div></div>`;
  v.querySelector('[data-aba]').onclick = (e) => { const b = e.target.closest('[data-v]'); if (b) { LF.aba = b.dataset.v; renderListasPage(v); } };
  const body = v.querySelector('[data-body]');
  if (LF.aba === 'banco') { renderBanco(body, { go }); return; }
  if (LF.aba === 'salvos') { renderSalvos(body, null); return; }
  if (!mats.length) { body.innerHTML = `<div class="card empty">Nenhuma lista de exercícios ainda.<div style="margin-top:12px"><button class="btn sm" data-goto="estudio">Importar listas</button></div></div>`; return; }
  body.innerHTML = `<input class="input search" type="search" data-q placeholder="Pesquisar listas por título, tag, tópico…" value="${esc(LF.q)}" style="margin-bottom:14px"><div data-maps></div>`;
  const maps = body.querySelector('[data-maps]');
  const draw = () => {
    const ms = mats.filter((m) => m.listas.some((l) => matchQuery(itemHay(l), LF.q)));
    maps.innerHTML = !ms.length ? '<div class="card empty">Nenhuma lista encontrada.</div>' : ms.map((m) => `<section class="listas-sec"><div class="row between" style="margin:8px 0 10px"><h2>${esc(m.nome)}</h2><a class="small" href="#materia/${esc(m.key)}">abrir matéria</a></div><div data-mapa="${esc(m.key)}"></div></section>`).join('');
    ms.forEach((m) => renderMapa(maps.querySelector(`[data-mapa="${CSS.escape(m.key)}"]`), m, { tags: [], q: LF.q }));
  };
  let t; body.querySelector('[data-q]').oninput = (e) => { clearTimeout(t); t = setTimeout(() => { LF.q = e.target.value; draw(); }, 150); };
  draw();
}

// ---------------------------------------------------------------
//  Matéria: trilha, mapa de listas, fórmulas
// ---------------------------------------------------------------
const MF = {}; // filtros por matéria: {tags:[]}
function renderMateria(v, key, params = {}) {
  const m = materiaByKey(key);
  if (!m) { v.innerHTML = `<div class="empty"><span class="orn">❦</span>Matéria não encontrada.<div style="margin-top:14px"><a class="btn" href="#materias">Voltar</a></div></div>`; return; }
  const p = Store.state.perfil;
  const aba = params.aba || p.aba?.[key] || (m.aulas.length || !m.listas.length ? 'aulas' : 'listas');
  if (p.aba?.[key] !== aba) { p.aba = { ...(p.aba || {}), [key]: aba }; save('perfil'); }
  setStudyMat(aba === 'acomp' ? null : key); setTimeout(refreshFocus, 0);
  const f = (MF[key] ||= { tags: [] });
  const all = [...m.aulas, ...m.listas];
  const tags = tagsOf(all);
  f.tags = f.tags.filter((t) => tags.includes(t));
  const s = matStats(m);
  const nFiltros = f.tags.length + (aba === 'passos' ? [f.ptopic, f.psub, f.pst].filter(Boolean).length : aba === 'formulas' ? (f.ftopic ? 1 : 0) : 0);
  v.innerHTML = `<div class="narrow fade-in"><div class="page-head"><div class="kicker"><a href="#materias" style="color:inherit">Matérias</a> ›</div>
      <div class="row nowrap between" style="align-items:flex-start"><h1>${esc(m.nome)}</h1><div class="row nowrap" style="gap:6px"><button class="btn sm" data-apost title="Gerar apostila em PDF">📄 Apostila</button><button class="btn sm" data-mopt title="Editar nome, período, conteúdo; arquivar, clonar, excluir">✎ Editar</button></div></div>
      <p>${m.cfg.codigo ? `<span class="per-chip cod">${esc(m.cfg.codigo)}</span> ` : ''}${m.cfg.periodo ? `<span class="per-chip">${esc(m.cfg.periodo)}</span> ` : ''}${m.cfg.professor ? `<span class="small muted">${esc(m.cfg.professor)} · </span>` : ''}${m.cfg.arquivada ? '<span class="per-chip arq">arquivada</span> ' : ''}${s.aDone}/${m.aulas.length} aulas · ${s.lDone}/${m.listas.length} listas</p></div>
    <div class="row between" style="margin-bottom:14px">
      <div class="seg big" data-aba>${[['aulas', 'Aulas'], ['essenciais', 'Essenciais'], ['passos', 'Passo a passo'], ['listas', 'Listas'], ['formulas', 'Fórmulas'], ['salvos', '★ Salvos'], ['acomp', 'Acompanhar']].map(([k, l]) => `<button data-v="${k}" class="${aba === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      ${['aulas', 'listas', 'essenciais'].includes(aba) && Store.isAdmin && ({ aulas: m.aulas, listas: m.listas, essenciais: m.essenciais }[aba]).length > 1 ? `<button class="btn sm" data-reorder>↕ Reordenar</button>` : aba === 'formulas' ? `<button class="btn sm" data-print>Imprimir</button>` : ''}
    </div>
    ${!['salvos', 'acomp'].includes(aba) ? `<div class="search-row" style="margin-bottom:12px"><input class="input search" type="search" data-mq placeholder="${{ aulas: 'Pesquisar aulas…', listas: 'Pesquisar listas…', formulas: 'Pesquisar fórmulas…', essenciais: 'Pesquisar nos essenciais…', passos: 'Pesquisar tipos de questão…' }[aba]}" value="${esc(f.q || '')}">${tags.length || ['passos', 'formulas'].includes(aba) ? filtToggle('mat', nFiltros) : ''}</div>` : ''}
    ${tags.length && !['salvos', 'acomp'].includes(aba) ? `<div class="tagbar" data-tags ${filtBody('mat')}><span class="caps muted small">Tags</span>${tags.map((t) => `<button class="tag ${f.tags.includes(t) ? 'on' : ''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}${f.tags.length ? `<button class="btn xs ghost" data-clear>limpar</button>` : ''}</div>` : ''}
    <div data-body></div></div>`;
  const body = v.querySelector('[data-body]');
  const drawBody = () => {
    if (aba === 'aulas') renderTrilha(body, m, f);
    else if (aba === 'listas') renderMapa(body, m, f);
    else if (aba === 'salvos') renderSalvos(body, m.key);
    else if (aba === 'acomp') renderAcomp(body, m);
    else if (aba === 'essenciais') renderEssenciais(body, m, f);
    else if (aba === 'passos') renderPassos(body, m, f);
    else renderFormulas(body, m, f);
  };
  drawBody();
  wireFilt(v, 'mat');
  let mt; v.querySelector('[data-mq]')?.addEventListener('input', (e) => { clearTimeout(mt); mt = setTimeout(() => { f.q = e.target.value; drawBody(); }, 150); });
  v.querySelector('[data-aba]').onclick = (e) => { const b = e.target.closest('[data-v]'); if (b) renderMateria(v, key, { aba: b.dataset.v }); };
  v.querySelectorAll('[data-tag]').forEach((b) => (b.onclick = () => { const t = b.dataset.tag; f.tags = f.tags.includes(t) ? f.tags.filter((x) => x !== t) : [...f.tags, t]; renderMateria(v, key, { aba }); }));
  v.querySelector('[data-clear]')?.addEventListener('click', () => { f.tags = []; renderMateria(v, key, { aba }); });
  v.querySelector('[data-reorder]')?.addEventListener('click', () => reorderModal(m, { aulas: 'aula', listas: 'lista', essenciais: 'essencial' }[aba], () => renderMateria(v, key, { aba })));
  v.querySelector('[data-print]')?.addEventListener('click', () => window.print());
  v.querySelector('[data-mopt]').onclick = () => openMateriaOptions(m, { go, after: () => renderMateria(v, key, { aba }) });
  v.querySelector('[data-apost]').onclick = () => go('#apostila/' + key);
}

function ring(pct) {
  return pct > 0 && pct < 100 ? `<svg viewBox="0 0 60 60" width="60" height="60"><circle cx="30" cy="30" r="28" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-dasharray="${(pct / 100) * 176} 176" transform="rotate(-90 30 30)" stroke-linecap="round"/></svg>` : '';
}
function renderTrilha(el, m, f) {
  const list = m.aulas;
  const ok = (a) => matchTags(a, f.tags) && matchQuery(itemHay(a), f.q);
  let lastTopic = null;
  const shown = list.filter(ok);
  if (!list.length) {
    el.innerHTML = `<div class="card empty">Nenhuma aula nesta matéria ainda.<div class="row" style="margin-top:12px;justify-content:center"><button class="btn sm primary" data-genia>Gerar com IA</button><button class="btn sm" data-goto="estudio">Importar</button></div></div>`;
    el.querySelector('[data-genia]').onclick = () => { lsSet('promptCampos', { ...lsGet('promptCampos', {}), mkey: m.key }); go('#estudio', { tab: 'prompts' }); };
    return;
  }
  el.innerHTML = `${!shown.length ? '<div class="card empty">Nenhuma aula com esse filtro.</div>' : ''}
    <div class="trail">${list.map((a, i) => {
      if (!ok(a)) return '';
      const th = a.meta.topico && a.meta.topico !== lastTopic ? `<div class="unit-sub">${inl((lastTopic = a.meta.topico))}</div>` : '';
      const p = aulaProg(a.id), pct = aulaPct(a);
      const cls = p?.status === 'concluida' ? 'done' : p ? 'doing' : '';
      const nChk = a.parsed.blocks.filter((b) => b.type === 'checagem').length;
      const erros = Object.values(p?.chk || {}).filter((x) => x === 'erro').length;
      return `${th}<a class="card lesson-card" href="#aula/${esc(a.id)}"><div class="lesson-num ${cls}">${ring(pct)}${cls === 'done' ? '✓' : i + 1}</div>
        <div class="grow"><div class="t">${inl(a.titulo)}</div>
        ${a.meta.subtopico && a.meta.subtopico !== a.titulo ? `<div class="small" style="color:var(--accent)">${inl(a.meta.subtopico)}</div>` : ''}
        <div class="small muted">${a.meta.tempo && String(Store.state.perfil.mostrarTempo) !== 'false' ? '≈ ' + a.meta.tempo + ' min · ' : ''}${plural(a.parsed.blocks.length, 'parte')}${nChk ? ' · ' + plural(nChk, 'checagem', 'checagens') : ''}${erros ? ` · <span style="color:var(--bad)">${plural(erros, 'para rever', 'para rever')}</span>` : ''}</div>
        ${a.tags.length ? `<div class="blocks-mini">${a.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : ''}</div><span class="muted">→</span></a>`;
    }).join('')}</div>`;
}

function renderMapa(el, m, f) {
  const list = m.listas.filter((l) => matchTags(l, f.tags) && matchQuery(itemHay(l), f.q));
  if (!m.listas.length) { el.innerHTML = `<div class="card empty">Nenhuma lista de exercícios nesta matéria ainda.<div style="margin-top:12px"><button class="btn sm" data-goto="estudio">Importar listas</button></div></div>`; return; }
  if (!list.length) { el.innerHTML = '<div class="card empty">Nenhuma lista com esse filtro.</div>'; return; }
  const STEP = compacta() ? 112 : 150, TOP = compacta() ? 56 : 70;
  const xs = list.map((_, i) => 50 + 26 * Math.sin(i * 1.25));
  const H = TOP + (list.length - 1) * STEP + 110;
  let path = '';
  xs.forEach((x, i) => {
    const y = TOP + i * STEP;
    if (!i) { path += `M ${x} ${y}`; return; }
    const px = xs[i - 1], py = y - STEP;
    path += ` C ${px} ${py + STEP * 0.55}, ${x} ${y - STEP * 0.55}, ${x} ${y}`;
  });
  const deco = ['✿', '☁', '✦', '❀', '☼', '✧'];
  el.innerHTML = `<div class="mapa card" style="height:${H}px">
    <svg class="mapa-path" viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${path}" fill="none" stroke="var(--line2)" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>
    ${list.map((_, i) => `<span class="mapa-deco" style="top:${TOP + i * STEP + STEP / 2 - 10}px;left:${xs[i] > 50 ? 10 + (i * 7) % 14 : 78 + (i * 5) % 12}%">${deco[i % deco.length]}</span>`).join('')}
    ${list.map((l, i) => {
      const s = listaStats(l);
      const cls = s.done ? 'done' : s.started ? 'doing' : '';
      return `<a class="mapa-node ${cls}" href="#lista/${esc(l.id)}" style="top:${TOP + i * STEP}px;left:${xs[i]}%">
        <span class="mapa-dot" style="--p:${s.pct}"><span>${s.done ? '✓' : s.started ? `${s.ok}/${s.n}` : i + 1}</span></span>
        <span class="mapa-label"><b>${inl(l.titulo)}</b><span class="tiny muted">${plural(s.n, 'exercício')}${s.erros ? ` · ${plural(s.erros, 'erro')}` : ''}</span></span></a>`;
    }).join('')}
  </div>`;
}

// ---------- Essenciais ----------
function renderEssenciais(el, m, f) {
  const list = m.essenciais.filter((e) => matchTags(e, f.tags) && matchQuery(itemHay(e) + ' ' + e.parsed.blocks.map((b) => nodesText(b.nodes)).join(' '), f.q));
  if (!m.essenciais.length) { el.innerHTML = `<div class="card empty">Ainda não há essenciais nesta matéria.<div class="small" style="margin-top:8px">Os essenciais reúnem, por tópico, o mais importante de cada subtópico. Gere com o prompt do pacote da matéria (Estúdio › Prompts para IA).</div></div>`; return; }
  if (!list.length) { el.innerHTML = '<div class="card empty">Nada encontrado.</div>'; return; }
  el.innerHTML = `<div class="stack-s">${list.map((e) => `<a class="card ess-card" href="#essencial/${esc(e.id)}">
    <div class="row nowrap between"><div><div class="caps muted small">Tópico</div><div class="t">${inl(e.meta.topico || e.titulo)}</div></div><span class="muted">→</span></div>
    <div class="ess-subs">${e.parsed.blocks.map((b) => `<span>${inl(b.title || 'Geral')}</span>`).join('')}</div></a>`).join('')}</div>`;
}
function openEssencial(v, id) {
  const e = itemById(id);
  if (!e || e.tipo !== 'essencial') { v.innerHTML = `<div class="empty" data-notfound><span class="orn">◆</span>Essenciais não encontrados.<div style="margin-top:14px"><a class="btn" href="#materias">Voltar</a></div></div>`; return; }
  const grp = groupOf(e.mkey, 'essencial');
  const i = grp.findIndex((x) => x.id === e.id);
  const prev = grp[i - 1], next = grp[i + 1];
  v.innerHTML = `<div class="narrow fade-in"><div class="page-head"><div class="kicker"><a href="#materia/${esc(e.mkey)}" data-back style="color:inherit">${esc(e.materia)}</a> › Essenciais</div>
      <h1>${inl(e.meta.topico || e.titulo)}</h1>${e.meta.descricao ? `<p>${inl(e.meta.descricao)}</p>` : ''}<div class="no-print" style="margin-top:8px">${itemTagsRow(e)}</div></div>
    <div class="row between no-print" style="margin-bottom:12px"><input class="input search" type="search" data-q placeholder="Pesquisar neste tópico…" style="flex:1;min-width:180px"><button class="btn sm" data-print>Imprimir</button></div>
    <div class="ess-toc no-print">${e.parsed.blocks.map((b, k) => `<button class="tag" data-go="${k}">${inl(b.title || 'Geral')}</button>`).join('')}</div>
    <div data-secs>${e.parsed.blocks.map((b, k) => `<section class="card ess-sec" id="ess-${k}" data-k="${k}"><div class="row nowrap between"><h3>${inl(b.title || 'Geral')}</h3><span class="row nowrap no-print" style="gap:6px"><button class="icon-btn sm" data-copyctx title="Copiar contexto (para tirar dúvida no ChatGPT)">⧉</button><button class="icon-btn sm" data-say title="Ouvir">🔊</button></span></div>${richHtml(b.nodes)}</section>`).join('')}</div>
    <div class="row between no-print" style="margin-top:16px">${prev ? `<a class="btn sm" href="#essencial/${esc(prev.id)}">← ${inl(prev.meta.topico || prev.titulo)}</a>` : '<span></span>'}${next ? `<a class="btn sm" href="#essencial/${esc(next.id)}">${inl(next.meta.topico || next.titulo)} →</a>` : ''}</div></div>`;
  v.querySelector('[data-back]').onclick = (ev) => { ev.preventDefault(); go('#materia/' + e.mkey, { aba: 'essenciais' }); };
  wireItemTags(v, e, () => openEssencial(v, id));
  v.querySelectorAll('[data-copyctx]').forEach((b) => (b.onclick = () => copyContext(e, e.parsed.blocks[+b.closest('[data-k]').dataset.k])));
  v.querySelectorAll('[data-say]').forEach((b) => { const sec = e.parsed.blocks[+b.closest('[data-k]').dataset.k]; wireSay(b, () => `${sec.title || ''}. ${speechOf(sec.nodes)}`); });
  v.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => document.getElementById('ess-' + b.dataset.go)?.scrollIntoView({ behavior: 'smooth', block: 'start' })));
  v.querySelector('[data-print]').onclick = () => window.print();
  v.querySelector('[data-q]').oninput = (ev) => v.querySelectorAll('[data-k]').forEach((sec) => { const b = e.parsed.blocks[+sec.dataset.k]; sec.hidden = !matchQuery((b.title || '') + ' ' + nodesText(b.nodes), ev.target.value); });
  hydrate(v);
}

// ---------- Passo a passo ----------
function renderPassos(el, m, f) {
  setFiltCount(document, 'mat', f.tags.length + [f.ptopic, f.psub, f.pst].filter(Boolean).length);
  const cards = m.passos.flatMap((it) => it.parsed.blocks.map((b, k) => ({ it, b, k, topico: it.meta.topico || it.titulo, sub: b.subtopico || '' })));
  if (!cards.length) { el.innerHTML = `<div class="card empty">Ainda não há passo a passo nesta matéria.<div class="small" style="margin-top:8px">Cada tipo de questão ganha um roteiro: quando usar, os passos, a fórmula e os cuidados. Gere com o prompt do pacote da matéria (Estúdio › Prompts para IA).</div></div>`; return; }
  const topics = [...new Set(cards.map((c) => c.topico))];
  if (f.ptopic && !topics.includes(f.ptopic)) f.ptopic = '';
  const subsOf = (t) => [...new Set(cards.filter((c) => c.topico === t && c.sub).map((c) => c.sub))];
  const hay = (c) => [c.topico, c.sub, c.b.title, ...['quando', 'passos', 'formula', 'cuidado', 'exemplo'].map((k) => nodesText(c.b[k]))].join(' ');
  const PS = (Store.state.progresso.passos ||= {});
  const st = (c) => PS[c.it.id + '#' + c.k] || {};
  const passSt = (c) => !f.pst || (f.pst === 'fav' && st(c).fav) || (f.pst === 'todo' && !st(c).ok) || (f.pst === 'ok' && st(c).ok);
  const list = cards.filter((c) => matchTags(c.it, f.tags) && (!f.ptopic || c.topico === f.ptopic) && (!f.psub || c.sub === f.psub) && passSt(c) && matchQuery(hay(c), f.q));
  const nOk = cards.filter((c) => st(c).ok).length, nFav = cards.filter((c) => st(c).fav).length;
  let lastT = null, lastS = null;
  el.innerHTML = `<div class="topic-row" ${filtBody('mat')}>
      <select class="select topic-sel" data-pt><option value="">Todos os tópicos (${cards.length})</option>${topics.map((t) => `<option value="${esc(t)}" ${f.ptopic === t ? 'selected' : ''}>${esc(t)} (${cards.filter((c) => c.topico === t).length})</option>`).join('')}</select>
      ${f.ptopic && subsOf(f.ptopic).length ? `<select class="select topic-sel" data-ps><option value="">Todos os subtópicos</option>${subsOf(f.ptopic).map((t) => `<option value="${esc(t)}" ${f.psub === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>` : ''}
      <select class="select topic-sel" data-pst>${[['', 'Qualquer marcação'], ['fav', `★ Favoritos (${nFav})`], ['todo', `Ainda não aprendidos (${cards.length - nOk})`], ['ok', `✓ Aprendidos (${nOk})`]].map(([v, l]) => `<option value="${v}" ${f.pst === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="small muted" style="margin:-4px 0 10px">${nOk} de ${plural(cards.length, 'tipo de questão', 'tipos de questão')} marcados como aprendidos${nFav ? ` · ${nFav} ${nFav === 1 ? 'favorito' : 'favoritos'}` : ''}.</div>
    ${!list.length ? '<div class="card empty">Nada encontrado.</div>' : list.map((c, n) => {
      const th = c.topico !== lastT ? `<h2 class="pp-topic">${inl((lastT = c.topico))}</h2>` : '';
      if (th) lastS = null;
      const sh = c.sub && c.sub !== lastS ? `<div class="unit-sub">${inl((lastS = c.sub))}</div>` : '';
      const S2 = st(c);
      return `${th}${sh}<details class="card pp-card ${S2.ok ? 'learned' : ''}" data-pp="${n}" data-key="${esc(c.it.id + '#' + c.k)}"><summary><span class="pp-ic">${S2.ok ? '✓' : '↳'}</span><span class="grow"><b>${inl(c.b.title || 'Tipo de questão')}</b>${c.b.quando.length ? `<span class="small muted pp-when">${inl(nodesText(c.b.quando).slice(0, 140))}</span>` : ''}</span>
        <span class="pp-acts"><button type="button" class="icon-btn sm star ${S2.fav ? 'on' : ''}" data-pfav title="${S2.fav ? 'Tirar dos favoritos' : 'Favoritar (para focar)'}">${S2.fav ? '★' : '☆'}</button><button type="button" class="icon-btn sm chk ${S2.ok ? 'on' : ''}" data-pok title="${S2.ok ? 'Desmarcar aprendido' : 'Marcar como aprendido'}">✓</button></span></summary>
        <div class="pp-body">
          ${c.b.quando.length ? `<div class="pp-sec"><div class="caps muted small">Quando usar</div>${richHtml(c.b.quando)}</div>` : ''}
          <div class="pp-sec pp-steps"><div class="row between"><div class="caps muted small">Passo a passo</div><span class="row nowrap no-print" style="gap:6px"><button class="icon-btn sm" data-copyctx title="Copiar contexto (para tirar dúvida no ChatGPT)">⧉</button><button class="icon-btn sm" data-say title="Ouvir">🔊</button></span></div>${richHtml(c.b.passos)}</div>
          ${c.b.formula.length ? `<div class="pp-sec fml"><div class="caps muted small">Fórmula</div>${richHtml(c.b.formula)}</div>` : ''}
          ${c.b.cuidado.length ? `<div class="pp-sec callout warn" style="display:block"><div class="caps muted small">Cuidado</div>${richHtml(c.b.cuidado)}</div>` : ''}
          ${c.b.exemplo.length ? `<details class="steps-box"><summary>Exemplo</summary>${richHtml(c.b.exemplo)}</details>` : ''}
        </div></details>`;
    }).join('')}`;
  el.querySelector('[data-pt]').onchange = (e) => { f.ptopic = e.target.value; f.psub = ''; renderPassos(el, m, f); };
  el.querySelector('[data-ps]')?.addEventListener('change', (e) => { f.psub = e.target.value; renderPassos(el, m, f); });
  el.querySelectorAll('[data-pp]').forEach((d) => {
    const c = list[+d.dataset.pp];
    d.addEventListener('toggle', () => { if (d.open) { hydrate(d); } }, { once: false });
    wireSay(d.querySelector('[data-say]'), () => `${c.b.title}. ${speechOf(c.b.passos)}`);
    d.querySelector('[data-copyctx]').onclick = (ev) => { ev.preventDefault(); copyContext(c.it, c.b); };
    const key = c.it.id + '#' + c.k;
    const tog = (prop) => (e) => {
      e.preventDefault(); e.stopPropagation();
      const cur = { ...(PS[key] || {}) }; cur[prop] = !cur[prop];
      if (!cur.fav && !cur.ok) delete PS[key]; else PS[key] = cur;
      save('progresso');
      toast(prop === 'fav' ? (cur.fav ? 'Favoritado ★' : 'Tirado dos favoritos') : (cur.ok ? 'Marcado como aprendido ✓' : 'Desmarcado'));
      const open = d.open; renderPassos(el, m, f);
      if (open) el.querySelector(`[data-key="${CSS.escape(key)}"]`)?.setAttribute('open', '');
    };
    d.querySelector('[data-pfav]').onclick = tog('fav');
    d.querySelector('[data-pok]').onclick = tog('ok');
  });
  el.querySelector('[data-pst]').onchange = (e) => { f.pst = e.target.value; renderPassos(el, m, f); };
  if (list.length === 1) el.querySelector('[data-pp]').open = true;
}

/** Um bloco FORMULA com várias fórmulas ("### nome") vira um cartão por fórmula. */
function splitFormula(b) {
  const segs = [];
  let cur = null;
  for (const n of b.nodes) {
    if (n.k === 'h') { cur = { title: n.text, nodes: [] }; segs.push(cur); continue; }
    if (!cur) { cur = { title: '', nodes: [] }; segs.push(cur); }
    cur.nodes.push(n);
  }
  if (!segs.length) segs.push({ title: b.title, nodes: b.nodes });
  const L = b.leituras || [];
  segs.forEach((sg, i) => { sg.leitura = segs.length === 1 ? b.leitura : L[i] || ''; });
  return segs.filter((sg) => sg.nodes.length || sg.title);
}
function renderFormulas(el, m, f) {
  setFiltCount(document, 'mat', f.tags.length + (f.ftopic ? 1 : 0));
  const allF = m.aulas.flatMap((a) => a.parsed.formulas);
  const T = topicsOf(allF);
  if (f.ftopic && !allF.some((b) => matchTopic(b, f.ftopic))) f.ftopic = '';
  const fOk = (a, b) => matchTopic(b, f.ftopic) && matchQuery([a.titulo, b.title, b.topico, b.subtopico, b.descricao, b.leitura, nodesText(b.nodes)].join(' '), f.q);
  const aulas = m.aulas.filter((a) => matchTags(a, f.tags) && a.parsed.formulas.some((b) => fOk(a, b)));
  const sel = T.length ? `<div class="topic-row no-print" ${filtBody('mat')}><span class="caps muted small">Tópico</span><select class="select topic-sel" data-ftopic><option value="">Todos os tópicos (${allF.length})</option>
    ${T.map((t) => `<option value="${esc(t.topico)}" ${f.ftopic === t.topico ? 'selected' : ''}>${esc(t.topico)}</option>${t.subs.map((sb) => { const v = t.topico + ' › ' + sb; return `<option value="${esc(v)}" ${f.ftopic === v ? 'selected' : ''}>${esc(v)}</option>`; }).join('')}`).join('')}</select></div>` : '';
  if (!aulas.length) { el.innerHTML = sel + `<div class="card empty">${allF.length ? 'Nenhuma fórmula com esse filtro.' : 'Nenhuma fórmula ainda. Cada bloco "== FORMULA" das aulas entra aqui sozinho.'}</div>`; wireFt(); return; }
  el.innerHTML = `${sel}<div class="folha"><div class="print-only"><h1>${esc(m.nome)} · folha de fórmulas</h1></div>${aulas.map((a) => `<section class="folha-sec">
    <div class="folha-h"><a href="#aula/${esc(a.id)}">${inl(a.titulo)}</a></div>
    ${a.parsed.formulas.map((b, k) => (fOk(a, b) ? splitFormula(b).map((sg, j) => `<div class="card formula-card" data-fk="${esc(a.id)}|${k}|${j}">
      <div class="row nowrap between"><div class="fname">${inl(sg.title || b.title || 'Fórmula')}</div><span class="row nowrap no-print" style="gap:6px"><button class="icon-btn sm" data-copyctx title="Copiar contexto (para tirar dúvida no ChatGPT)">⧉</button><button class="icon-btn sm" data-say title="Ouvir">🔊</button></span></div>
      ${j === 0 ? topicLine(b) : ''}${richHtml(sg.nodes)}</div>`).join('') : '')).join('')}</section>`).join('')}</div>`;
  wireFt();
  function wireFt() { el.querySelector('[data-ftopic]')?.addEventListener('change', (e) => { f.ftopic = e.target.value; renderFormulas(el, m, f); }); }
  el.querySelectorAll('[data-fk]').forEach((c) => {
    const [id, k, j] = c.dataset.fk.split('|');
    const b = itemById(id).parsed.formulas[+k];
    const sg = splitFormula(b)[+j];
    wireSay(c.querySelector('[data-say]'), () => `${sg.title || b.title}. ${sg.leitura || speechOf(sg.nodes)}`);
    c.querySelector('[data-copyctx]').onclick = () => copyContext(itemById(id), b);
  });
  hydrate(el);
}

function renderFormulasPage(v, key) {
  const mats = activeMaterias().filter((m) => m.aulas.some((a) => a.parsed.formulas.length));
  if (!key && mats.length === 1) { renderMateria(v, mats[0].key, { aba: 'formulas' }); current = 'formulas'; shell(); return; }
  if (key) { renderMateria(v, key, { aba: 'formulas' }); return; }
  v.innerHTML = `<div class="narrow fade-in"><div class="page-head"><div class="kicker">Fórmulas</div><h1>Folhas de <em class="it">fórmulas</em></h1><p>Todas as fórmulas das aulas, por matéria, prontas para consultar ou imprimir.</p></div>
    ${mats.length ? `<div class="stack-s">${mats.map((m) => `<a class="card lesson-card" href="#materia/${esc(m.key)}" data-fm="${esc(m.key)}"><div class="lesson-num">∑</div><div class="grow"><div class="t">${esc(m.nome)}</div><div class="small muted">${plural(m.aulas.reduce((a, x) => a + x.parsed.formulas.length, 0), 'fórmula')}</div></div><span class="muted">→</span></a>`).join('')}</div>`
      : '<div class="card empty">Ainda não há fórmulas. Cada bloco "== FORMULA" das aulas entra aqui sozinho.</div>'}</div>`;
  v.querySelectorAll('[data-fm]').forEach((a) => (a.onclick = (e) => { e.preventDefault(); go('#materia/' + a.dataset.fm, { aba: 'formulas' }); }));
}

export function reorderModal(m, tipo, after) {
  const list = { aula: m.aulas, lista: m.listas, essencial: m.essenciais, passos: m.passos }[tipo];
  let ids = list.map((x) => x.id);
  modal(`<div class="stack"><div class="row between"><h3>Reordenar ${{ aula: 'aulas', lista: 'listas', essencial: 'essenciais', passos: 'passo a passo' }[tipo]} · ${esc(m.nome)}</h3></div>
    <p class="small muted" style="margin:0">Arraste pela alça ⠿ ou use ↑ ↓.</p><div data-sort></div>
    <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-ok>Salvar ordem</button></div></div>`, (box, close) => {
    sortable(box.querySelector('[data-sort]'), list.map((x) => ({ id: x.id, label: inl(x.titulo) })), { onChange: (n) => { ids = n; } });
    box.querySelector('[data-ok]').onclick = async () => { await setGroupOrder(ids); rebuild(); close(); toast('Ordem salva ✓'); after?.(); };
  });
}

// ---------------------------------------------------------------
//  Ajustes
// ---------------------------------------------------------------
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; });
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;

function renderSettings(v) {
  const p = Store.state.perfil;
  const voices = TTS.voicesFor('pt');
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const seg = (name, opts) => `<div class="seg" data-seg="${name}">${opts.map(([v2, l]) => `<button data-v="${v2}" class="${String(p[name]) === String(v2) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  let account;
  if (!Store.configured) account = `<p style="margin:0">A sincronização ainda não foi ligada. Enquanto isso, tudo fica salvo <b>neste aparelho</b>.</p>
      <p class="small muted" style="margin:0">Para sincronizar celular e computador, cole a configuração do Firebase no arquivo <code>js/config.js</code> (pode ser o mesmo projeto do Atelier). O passo a passo está no README.</p>`;
  else if (!Store.user) account = `<p style="margin:0">Entre com a sua conta para ter a <b>sua própria biblioteca</b>: as aulas, listas e figuras que você enviar e o seu progresso ficam na sua conta e aparecem em todos os seus aparelhos. Sem entrar, tudo fica só neste aparelho.</p>
      <div class="row"><button class="btn primary" data-google>Entrar com Google</button><button class="btn" data-emailbox>Entrar com e-mail</button></div>
      <form data-emailform hidden class="stack-s"><input class="input" type="email" name="email" placeholder="e-mail" autocomplete="email" required><input class="input" type="password" name="senha" placeholder="senha (mín. 6 caracteres)" autocomplete="current-password" required minlength="6">
        <div class="row"><button class="btn primary" type="submit">Entrar</button><button class="btn" type="button" data-create>Criar conta</button><button class="btn ghost sm" type="button" data-reset>Esqueci a senha</button></div></form>
      ${Store.error ? `<p class="small" style="color:var(--bad)">${esc(Store.error)}</p>` : ''}${contaBiblioteca()}`;
  else account = `<div class="row">${Store.user.foto ? `<img src="${esc(Store.user.foto)}" referrerpolicy="no-referrer" style="width:40px;height:40px;border-radius:50%">` : ''}<div class="grow"><b>${esc(Store.user.nome || Store.user.email)}</b><div class="small muted">${esc(Store.user.email || '')}${Store.isAdmin ? ' · administradora' : ''}</div></div><button class="btn sm" data-out>Sair</button></div>
      <div class="small">${syncLabel()}</div>`;

  v.innerHTML = `<div class="narrow fade-in stack-l"><div class="page-head" style="margin-bottom:0"><div class="kicker">Ajustes</div><h1>Do seu <em class="it">jeito</em></h1></div>
    <div class="card stack"><h3>Conta e sincronização</h3>${account}</div>
    <div class="card stack"><h3>Você</h3>
      <div><label class="lbl">Seu nome</label><input class="input" data-nome value="${esc(p.nome)}" placeholder="Como quer ser chamada?"></div></div>
    <div class="card stack"><h3>Voz da leitura</h3>
      ${!TTS.supported() ? '<p class="small" style="color:var(--bad)">Este navegador não tem leitura em voz alta.</p>' : `
      <div><label class="lbl">Voz</label><div class="row nowrap"><select class="select grow" data-voz><option value="">Automática — melhor disponível${voices[0] ? ` (${esc(voices[0].name)})` : ''}</option>
        ${voices.map((vo) => `<option value="${esc(vo.name)}" ${p.voz === vo.name ? 'selected' : ''}>${esc(vo.name)} · ${esc(vo.lang)}</option>`).join('')}</select>
        <button class="btn" data-test>▶ Testar</button></div>
        ${voices.length ? '' : '<p class="small" style="color:var(--bad)">Nenhuma voz em português instalada neste aparelho.</p>'}</div>
      <div><label class="lbl">Velocidade</label>${seg('vel', TTS.SPEEDS.map((s) => [s.id, s.label]))}</div>
      <details class="small"><summary style="cursor:pointer">Como deixar a voz mais natural</summary><ul>
        <li><b>Android:</b> instale/atualize “Serviços de fala do Google” e baixe a voz de português (Brasil) em Configurações › Idioma › Saída de texto para voz.</li>
        <li><b>iPhone/iPad:</b> Ajustes › Acessibilidade › Conteúdo Falado › Vozes › Português (Brasil) › baixe a Luciana “Aprimorada”.</li>
        <li><b>Computador:</b> no Microsoft Edge aparecem as vozes “Natural” (as melhores, ex.: Francisca, Thalita).</li>
        <li>As fórmulas são lidas pela linha <code>@leitura</code> do bloco; o resto da matemática é lido de forma aproximada.</li></ul></details>`}
    </div>
    <div class="card stack"><h3>Aparência</h3>
      <div><label class="lbl">Tema</label>${seg('tema', [['claro', 'Dia'], ['noite', 'Noite azulada'], ['grafite', 'Escuro grafite']])}</div>
      <div><label class="lbl">Tamanho do texto</label>${seg('fonte', [['p', 'Pequeno'], ['m', 'Médio'], ['g', 'Grande']])}</div>
      <div><label class="lbl">Tempo previsto das aulas</label>${seg('mostrarTempo', [['true', 'Mostrar'], ['false', 'Esconder']])}</div>
      <div><label class="lbl">Visão</label>${seg('vista', [['normal', 'Normal'], ['compacta', 'Compacta']])}<p class="tiny muted" style="margin:4px 0 0">A compacta deixa tudo um pouco menor e menos espaçado, para caber mais coisa na tela. Também dá para trocar pelo botão ▤ no menu.</p></div>
    </div>
    <div class="card stack"><h3>Instalar como app</h3>
      ${isStandalone() ? '<p style="margin:0">✓ Você já está usando o app instalado.</p>' : installEvt ? '<p style="margin:0">Instale para abrir direto da tela inicial, em tela cheia e funcionando offline.</p><div><button class="btn primary" data-install>Instalar app</button></div>'
        : isIOS ? '<p style="margin:0">No Safari, toque em <b>Compartilhar</b> (□↑) e depois em <b>Adicionar à Tela de Início</b>.</p>'
        : '<p style="margin:0">No Chrome do celular: menu <b>⋮</b> › <b>Instalar app</b> (ou “Adicionar à tela inicial”). No computador: ícone de instalar na barra de endereço.</p>'}
    </div>
    <div class="card stack"><h3>Backup</h3><p class="small muted" style="margin:0">Um .zip com todas as matérias, figuras, interativos e o seu progresso. Para restaurar, importe o zip no Estúdio.</p>
      <div class="row"><button class="btn" data-backup>⇩ Baixar backup completo</button><button class="btn ghost" data-goto="estudio">Ir ao Estúdio</button></div></div>
    <div class="card stack"><h3>Cuidado</h3><p class="small muted" style="margin:0">Apaga o progresso de aulas e listas (as aulas e listas ficam). Faça um backup antes, se quiser.</p><div><button class="btn danger" data-reset-all>Zerar meu progresso</button></div></div>
  </div>`;

  const upd = (k, val) => { p[k] = val; save('perfil'); applyPrefs(); };
  v.querySelector('[data-nome]').oninput = (e) => { p.nome = e.target.value; clearTimeout(window.__nt); window.__nt = setTimeout(() => save('perfil'), 600); };
  v.querySelectorAll('[data-seg]').forEach((sg) => (sg.onclick = (e) => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    upd(sg.dataset.seg, b.dataset.v);
    sg.querySelectorAll('[data-v]').forEach((x) => x.classList.toggle('on', x === b));
  }));
  v.querySelector('[data-voz]')?.addEventListener('change', (e) => upd('voz', e.target.value));
  v.querySelector('[data-test]')?.addEventListener('click', () => TTS.speak('Olá! A integral dupla de f sobre a região R é igual à integral de alfa até beta, de r d r d teta.', { lang: 'pt' }));
  v.querySelector('[data-install]')?.addEventListener('click', async () => { installEvt.prompt(); await installEvt.userChoice; installEvt = null; renderSettings(v); });
  v.querySelector('[data-backup]').onclick = async (e) => { e.target.disabled = true; try { const { exportBackup } = await import('./importer.js'); await exportBackup(); } finally { e.target.disabled = false; } };
  v.querySelector('[data-reset-all]').onclick = async () => { if (await confirmBox('Zerar todo o progresso? Isso não pode ser desfeito.', { ok: 'Zerar', danger: true })) { await S.resetProgress(); toast('Progresso zerado'); route(); } };
  const err = (e) => { const msg = ({ 'auth/popup-closed-by-user': 'Janela fechada antes de concluir.', 'auth/unauthorized-domain': 'Domínio não autorizado no Firebase (Authentication › Configurações › Domínios autorizados).', 'auth/invalid-credential': 'E-mail ou senha incorretos.', 'auth/email-already-in-use': 'Esse e-mail já tem conta — use Entrar.', 'auth/weak-password': 'Senha muito curta (mín. 6).' })[e.code] || e.message; toast(msg, 5000); };
  v.querySelector('[data-google]')?.addEventListener('click', () => S.signInGoogle().catch(err));
  v.querySelector('[data-emailbox]')?.addEventListener('click', () => { v.querySelector('[data-emailform]').hidden = false; });
  const form = v.querySelector('[data-emailform]');
  form?.addEventListener('submit', (e) => { e.preventDefault(); S.signInEmail(form.email.value, form.senha.value).catch(err); });
  v.querySelector('[data-create]')?.addEventListener('click', () => { if (form.reportValidity()) S.signInEmail(form.email.value, form.senha.value, true).catch(err); });
  v.querySelector('[data-reset]')?.addEventListener('click', () => { if (!form.email.value) return toast('Digite seu e-mail primeiro.'); S.resetPassword(form.email.value).then(() => toast('Enviamos um e-mail para redefinir a senha.')).catch(err); });
  v.querySelector('[data-out]')?.addEventListener('click', () => S.signOut());
  wireContaBiblioteca(v, () => renderSettings(v));
}

// ---------------------------------------------------------------
async function boot() {
  on('items', () => { rebuild(); if (['aula', 'lista'].includes(routeName) && document.querySelector('[data-notfound]')) route(); else refreshIfIdle(); });
  on('change', (n) => { if (n === 'perfil' || n === '*') applyPrefs(); if (n === '*' || (n === 'progresso' && routeName === 'inicio')) refreshIfIdle(); else shell(); });
  on('status', () => { shell(); if (routeName === 'ajustes' && !document.activeElement?.matches('input')) route(true); });
  on('auth', () => { rebuild(); applyPrefs(); route(); });
  TTS.onVoices(() => { if (routeName === 'ajustes' && !document.activeElement?.matches('input, select')) route(true); });
  window.addEventListener('hashchange', () => route());
  document.addEventListener('pointerdown', bump, { passive: true });
  await S.init();
  rebuild(); applyPrefs(); route(); initFocus();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();
