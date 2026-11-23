// Dados derivados: itens analisados, matérias, ordem e progresso.
import { parseItem, keyOf, deaccent, nodesText } from './parser.js';
import { Store, save, saveOrder } from './store.js';
import { dayKey } from './util.js';

const parseCache = new Map();
export let ITEMS = [];

export function parseCached(it) {
  const ck = it.id + '|' + (it.atualizado || 0) + '|' + (it.codigo || '').length;
  let p = parseCache.get(ck);
  if (!p) { p = parseItem(it.codigo || ''); parseCache.set(ck, p); }
  return p;
}

// ---------------- Tags (aulas, listas, essenciais e exercícios) ----------------
const TG = () => (Store.state.progresso.tags ||= {});
export const normTags = (arr) => [...new Set((arr || []).flatMap((t) => String(t).split(/[,;]/)).map((t) => t.trim().toLowerCase().replace(/\s+/g, ' ')).filter(Boolean))];
/** Tags de um exercício/checagem (chave "id#idx"). */
export const exTags = (key) => TG()[key] || [];
export function setExTags(key, tags) { tags = normTags(tags); if (tags.length) TG()[key] = tags; else delete TG()[key]; save('progresso'); return tags; }
/** Tags de item que não dá para gravar no código (item da nuvem sem ser administradora). */
export const itemTagOverride = (id) => TG()['item:' + id];
export function setItemTagOverride(id, tags) { if (tags == null) delete TG()['item:' + id]; else TG()['item:' + id] = normTags(tags); save('progresso'); }
export const allTags = () => [...new Set([...ITEMS.flatMap((x) => x.tags), ...Object.entries(TG()).filter(([k]) => !k.startsWith('item:')).flatMap(([, v]) => v)])].sort((a, b) => a.localeCompare(b, 'pt', { numeric: true }));

export function rebuild() {
  const all = { ...Store.items.local, ...Store.items.nuvem };
  ITEMS = Object.values(all).map((it) => {
    const parsed = parseCached(it);
    const m = parsed.meta;
    return { id: it.id, codigo: it.codigo, atualizado: it.atualizado, origem: it.origem, parsed, meta: m, tipo: m.tipo, titulo: m.titulo, materia: m.materia, mkey: m.materiaKey, tags: itemTagOverride(it.id) ?? m.tags,
      ordem: Store.order[it.id] ?? 1e6 + (it.atualizado || 0) / 1e13 };
  }).filter((x) => x.parsed.blocks.length)
    .sort((a, b) => a.mkey.localeCompare(b.mkey) || a.ordem - b.ordem || a.titulo.localeCompare(b.titulo, 'pt'));
}

export const itemById = (id) => ITEMS.find((x) => x.id === id);
/** Itens de um grupo (matéria + tipo), na ordem da trilha. */
export const groupOf = (mkey, tipo) => ITEMS.filter((x) => x.mkey === mkey && x.tipo === tipo);
export const groupKey = (mkey, tipo) => mkey + '|' + tipo;

export function materias() {
  const map = new Map();
  for (const it of ITEMS) {
    let m = map.get(it.mkey);
    if (!m) { m = { key: it.mkey, nome: it.materia, aulas: [], listas: [], essenciais: [], passos: [] }; map.set(it.mkey, m); }
    ({ lista: m.listas, aula: m.aulas, essencial: m.essenciais, passos: m.passos }[it.tipo] || m.aulas).push(it);
  }
  // matérias criadas à mão, ainda sem aulas nem listas
  for (const [k, c] of Object.entries(Store.state.perfil.materias || {})) {
    if (c?.nome && !map.has(k)) map.set(k, { key: k, nome: c.nome, aulas: [], listas: [], essenciais: [], passos: [] });
  }
  return [...map.values()].map((m) => ({ ...m, cfg: matCfg(m.key) }))
    .sort((a, b) => (a.cfg.ordem ?? 1e6) - (b.cfg.ordem ?? 1e6) || a.nome.localeCompare(b.nome, 'pt'));
}
/** Matérias que aparecem na tela principal (não arquivadas). */
export const activeMaterias = () => materias().filter((m) => !m.cfg.arquivada);

// ---------------- Configuração das matérias (período, arquivada, ordem) ----------------
export const PERIODO_RE = /^\d{2}\.[1-3]$/;
export const matCfg = (k) => Store.state.perfil.materias?.[k] || {};
/** Sigla usada nos ids e nomes de arquivo (a salva ou uma gerada do nome). */
export function siglaOf(m) {
  if (m.cfg?.sigla) return m.cfg.sigla;
  const w = deaccent(m.nome).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((x) => x && !['de', 'da', 'do', 'dos', 'das', 'e', 'a', 'o'].includes(x));
  const num = w.filter((x) => /^\d+$/.test(x)).join('');
  const letras = w.filter((x) => !/^\d+$/.test(x));
  return ((letras.length === 1 ? letras[0].slice(0, 6) : letras.map((x) => x.slice(0, 3)).join('').slice(0, 9)) + num) || 'materia';
}
export function setMatCfg(k, patch) {
  const P = (Store.state.perfil.materias ||= {});
  P[k] = { ...(P[k] || {}), ...patch };
  for (const x of Object.keys(P[k])) if (P[k][x] === '' || P[k][x] == null || P[k][x] === false) delete P[k][x];
  save('perfil');
}
export const periodoKey = (p) => (PERIODO_RE.test(p || '') ? parseInt(p, 10) * 10 + parseInt(p.split('.')[1], 10) : -1);
/** Agrupa matérias por período, do mais recente para o mais antigo ("Sem período" no fim). */
export function byPeriodo(mats) {
  const g = new Map();
  for (const m of mats) { const p = m.cfg.periodo || ''; if (!g.has(p)) g.set(p, []); g.get(p).push(m); }
  return [...g].sort((a, b) => periodoKey(b[0]) - periodoKey(a[0]));
}
export const materiaByKey = (k) => materias().find((m) => m.key === k);

/** Grava a ordem completa de um grupo (lista de ids, do 1º ao último). */
export async function setGroupOrder(ids) {
  const changes = {};
  ids.forEach((id, i) => { if (Store.order[id] !== i + 1) changes[id] = i + 1; });
  if (Object.keys(changes).length) await saveOrder(changes);
}
/** Move um item dentro do grupo (dir = -1 sobe, 1 desce). */
export async function moveItem(id, dir) {
  const it = itemById(id); if (!it) return;
  const ids = groupOf(it.mkey, it.tipo).map((x) => x.id);
  const i = ids.indexOf(id), j = i + dir;
  if (j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await setGroupOrder(ids);
}

// ---------------- Atividade ----------------
export function dayRec(d = dayKey()) {
  const D = Store.state.progresso.dias;
  return (D[d] ||= { min: 0, itens: 0 });
}
export function streak() {
  const D = Store.state.progresso.dias;
  const active = (k) => D[k] && (D[k].min > 0 || D[k].itens > 0);
  let n = 0; const d = new Date();
  if (!active(dayKey(d))) d.setDate(d.getDate() - 1);
  while (active(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
let activeUntil = 0, acc = 0, studyMat = null;
const pendSec = {};
export const bump = () => { activeUntil = Date.now() + 120000; };
/** Matéria que está sendo estudada agora (null fora das telas de estudo). */
export const setStudyMat = (k) => { if (k !== studyMat) { flushTempo(); studyMat = k || null; } if (k) bump(); };
export const getStudyMat = () => studyMat;
function flushTempo() {
  const ks = Object.keys(pendSec); if (!ks.length) return;
  const T = (Store.state.progresso.tempo ||= {}); const d = dayKey();
  for (const k of ks) { (T[k] ||= {})[d] = (T[k][d] || 0) + pendSec[k]; delete pendSec[k]; }
  save('progresso');
}
setInterval(() => {
  if (typeof document === 'undefined' || document.visibilityState !== 'visible' || Date.now() > activeUntil) return;
  acc += 15;
  if (studyMat) pendSec[studyMat] = (pendSec[studyMat] || 0) + 15;
  if (acc >= 60) { acc = 0; dayRec().min++; flushTempo(); save('progresso'); }
}, 15000);
if (typeof window !== 'undefined') window.addEventListener('pagehide', flushTempo);
/** Segundos estudados numa matéria: {hoje, semana, total, dias: {dia: seg}} */
export function tempoMateria(k) {
  const T = { ...(Store.state.progresso.tempo?.[k] || {}) };
  if (pendSec[k]) T[dayKey()] = (T[dayKey()] || 0) + pendSec[k];
  const hoje = dayKey(); const d7 = new Date(); d7.setDate(d7.getDate() - 6); const k7 = dayKey(d7);
  let semana = 0, total = 0;
  for (const [d, sec] of Object.entries(T)) { total += sec; if (d >= k7) semana += sec; }
  return { hoje: T[hoje] || 0, semana, total, dias: T };
}
export const fmtTempo = (sec) => { const m = Math.round(sec / 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`; };

// ---------------- Aulas ----------------
export const aulaProg = (id) => Store.state.progresso.aulas[id];
export function setAulaProg(id, patch) {
  const P = Store.state.progresso.aulas;
  P[id] = { ...(P[id] || { feitos: [], chk: {}, inicio: Date.now() }), ...patch };
  save('progresso');
  return P[id];
}
export function aulaPct(A) {
  const p = aulaProg(A.id);
  if (!p) return 0;
  if (p.status === 'concluida') return 100;
  return Math.round(((p.feitos || []).length / A.parsed.blocks.length) * 100);
}
/** Marca uma checagem da aula como acertada/errada (ok = true/false). */
export function markCheck(A, idx, ok) {
  const p = aulaProg(A.id) || setAulaProg(A.id, {});
  const chk = { ...(p.chk || {}) };
  const first = chk[idx] == null;
  chk[idx] = ok ? 'ok' : 'erro';
  const chkErros = { ...(p.chkErros || {}) };
  if (!ok) chkErros[idx] = (chkErros[idx] || 0) + 1;
  const st = Store.state.progresso.stats;
  if (first) { st.chk++; if (ok) st.chkOk++; }
  dayRec().itens++;
  setAulaProg(A.id, { chk, chkErros });
}

// ---------------- Listas ----------------
/** Progresso da lista, já ajustado ao número atual de exercícios. */
export function listaProg(L, { create = false } = {}) {
  const P = Store.state.progresso.listas;
  const n = L.parsed.blocks.length;
  let p = P[L.id];
  if (!p) {
    if (!create) return null;
    p = P[L.id] = { fila: [...Array(n).keys()], res: {}, inicio: Date.now(), rodada: 1 };
  }
  // reconciliar com a versão atual (exercícios novos ou removidos)
  p.fila = (p.fila || []).filter((i) => i < n);
  for (let i = 0; i < n; i++) if (!p.fila.includes(i) && p.res[i]?.st !== 'ok') p.fila.push(i);
  for (const k of Object.keys(p.res)) if (+k >= n) delete p.res[k];
  return p;
}
export function listaStats(L) {
  const p = listaProg(L);
  const n = L.parsed.blocks.length;
  if (!p) return { n, ok: 0, erros: 0, pct: 0, done: false, started: false };
  const ok = Object.values(p.res).filter((r) => r.st === 'ok').length;
  const erros = Object.values(p.res).reduce((a, r) => a + (r.erros || 0), 0);
  return { n, ok, erros, pct: n ? Math.round((ok / n) * 100) : 0, done: ok >= n, started: true };
}
export function saveLista() { save('progresso'); }

// ---------------- Tags ----------------
export const tagsOf = (items) => [...new Set(items.flatMap((x) => x.tags))].sort((a, b) => a.localeCompare(b, 'pt', { numeric: true }));
export const matchTags = (it, sel) => !sel?.length || sel.every((t) => it.tags.includes(t));
export const mkeyOf = (nome) => keyOf(nome);

// ---------------- Exercícios salvos ----------------
export const saveKey = (id, idx) => id + '#' + idx;
export const isSaved = (id, idx) => !!Store.state.progresso.salvos?.[saveKey(id, idx)];
export function toggleSaved(id, idx) {
  const S = (Store.state.progresso.salvos ||= {});
  const k = saveKey(id, idx);
  if (S[k]) delete S[k]; else S[k] = { t: Date.now() };
  save('progresso');
  return !!S[k];
}
/** Salvos que ainda existem → [{it, b, idx, t}] (mais recentes primeiro). */
export function savedList(mkey) {
  const out = [];
  for (const [k, v] of Object.entries(Store.state.progresso.salvos || {})) {
    const i = k.lastIndexOf('#');
    const it = itemById(k.slice(0, i)); const idx = +k.slice(i + 1);
    const b = it?.parsed.blocks[idx];
    if (!b || (mkey && it.mkey !== mkey)) continue;
    out.push({ it, b, idx, t: v.t });
  }
  return out.sort((a, b) => b.t - a.t);
}
/** Tópicos e subtópicos dos exercícios → [{topico, subs:[...]}] na ordem em que aparecem. */
export function topicsOf(blocks) {
  const map = new Map();
  for (const b of blocks) {
    if (!b.topico) continue;
    if (!map.has(b.topico)) map.set(b.topico, []);
    if (b.subtopico && !map.get(b.topico).includes(b.subtopico)) map.get(b.topico).push(b.subtopico);
  }
  return [...map].map(([topico, subs]) => ({ topico, subs }));
}
/** filtro = '' | 'Tópico' | 'Tópico › Subtópico' */
export function matchTopic(b, filtro) {
  if (!filtro) return true;
  const [t, s] = filtro.split(' › ');
  return b.topico === t && (!s || b.subtopico === s);
}

// ---------------- Busca ----------------
export const norm = (s) => deaccent(String(s ?? '')).toLowerCase();
/** Todas as palavras da busca precisam aparecer no texto. */
export function matchQuery(hay, q) {
  const t = norm(q).trim();
  if (!t) return true;
  const h = norm(hay);
  return t.split(/\s+/).every((w) => h.includes(w));
}
export const itemHay = (it) => [it.titulo, it.materia, it.tags.join(' '), it.meta.descricao, it.meta.topico, it.meta.subtopico, it.parsed.blocks.map((b) => [b.title, b.topico, b.subtopico, b.descricao].join(' ')).join(' ')].join(' ');

// ---------------- Banco de exercícios ----------------
/** Todos os exercícios de todas as listas → [{key, it, idx, b, status, erros, salvo, hay}] */
export const qNodes = (b) => b.enunciado || b.pergunta || [];
export const origemLabel = (it) => (it.tipo === 'lista' ? 'Lista' : 'Aula') + ': ' + it.titulo;
export function exerciseBank() {
  const out = [];
  for (const it of ITEMS) {
    const lp = it.tipo === 'lista' ? listaProg(it) : null;
    const ap = it.tipo === 'aula' ? aulaProg(it.id) : null;
    it.parsed.blocks.forEach((b, idx) => {
      if (b.type !== 'exercicio' && b.type !== 'checagem') return;
      let ok, erros, feito;
      if (lp || it.tipo === 'lista') { const r = lp?.res?.[idx] || {}; ok = r.st === 'ok'; erros = r.erros || 0; feito = !!r.st; }
      else { const c = ap?.chk?.[idx]; const e = ap?.chkErros?.[idx] || (c === 'erro' ? 1 : 0); ok = c === 'ok'; erros = e; feito = !!c; }
      const key = saveKey(it.id, idx), tags = exTags(key);
      out.push({ key, it, idx, b, ok, erros, feito, salvo: isSaved(it.id, idx), origem: it.tipo, tags,
        hay: [tags.join(' '), b.topico, b.subtopico, b.descricao, b.origem, b.title, it.titulo, it.materia, it.tags.join(' '), nodesText(qNodes(b))].join(' ') });
    });
  }
  return out;
}
export function bankEntry(key) {
  const i = key.lastIndexOf('#');
  const it = itemById(key.slice(0, i)); const idx = +key.slice(i + 1);
  const b = it?.parsed.blocks[idx];
  return b ? { key, it, idx, b } : null;
}
/** Registra acerto/erro no progresso da lista de origem (o banco e as listas ficam sempre iguais). */
export function recordInList(it, idx, ok) {
  if (it.tipo === 'aula') { markCheck(it, idx, ok); return; }
  const q = listaProg(it, { create: true });
  const prev = q.res[idx] || {};
  if (ok) { q.res[idx] = { ...prev, st: 'ok', em: Date.now() }; q.fila = q.fila.filter((x) => x !== idx); }
  else { q.res[idx] = { ...prev, st: 'erro', erros: (prev.erros || 0) + 1 }; q.fila = [...q.fila.filter((x) => x !== idx), idx]; }
  const st = Store.state.progresso.stats; st.ex++; if (ok) st.exOk++;
  dayRec().itens++;
}
