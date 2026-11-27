// =============================================================
//  Dados: aulas e listas (aparelho + nuvem), mídias e progresso.
//  Sem Firebase configurado → tudo fica no aparelho.
//  Com Firebase → cada pessoa entra com a própria conta (Google ou e-mail)
//  e tem a SUA biblioteca de aulas, listas e figuras, sincronizada entre
//  os aparelhos dela: usuarios/{uid}/oficina_itens, …/oficina_midia,
//  …/oficina/ordem, …/oficina/perfil e …/oficina/progresso.
// =============================================================
import { CONFIG } from './config.js';
import { idbAll, idbGet, idbPut, idbDel } from './db.js';

const FB = '10.12.2';
const LS = 'oficina:';
const DOC_NAMES = ['perfil', 'progresso'];
export const DEFAULTS = {
  perfil: { nome: '', tema: 'claro', fonte: 'm', vista: 'normal', mostrarTempo: true, voz: '', vel: 'normal', ultima: null, aba: {}, materias: {} },
  progresso: { aulas: {}, listas: {}, salvos: {}, passos: {}, acomp: {}, tempo: {}, dias: {}, stats: { chk: 0, chkOk: 0, ex: 0, exOk: 0 } },
};
export const CLOUD_MEDIA_MAX = 900000; // caracteres por mídia na nuvem (limite de 1 MB por documento do Firestore)

const clone = (o) => JSON.parse(JSON.stringify(o));
export const lsGet = (k, d) => { try { const v = localStorage.getItem(LS + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
export const lsSet = (k, v) => { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) { console.warn('localStorage cheio?', e); } };
const merge = (def, v) => {
  const o = { ...clone(def), ...(v || {}) };
  for (const k of Object.keys(def)) if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k])) o[k] = { ...def[k], ...(v?.[k] || {}) };
  return o;
};

const listeners = {};
export const on = (ev, fn) => ((listeners[ev] ||= new Set()).add(fn), () => listeners[ev].delete(fn));
const emit = (ev, d) => listeners[ev]?.forEach((f) => { try { f(d); } catch (e) { console.error(e); } });

export const Store = {
  configured: !!CONFIG.firebase,
  user: null,
  status: 'local',     // local | conectando | sincronizado | pendente | offline | erro
  error: '',
  state: {},
  items: { local: {}, nuvem: {} },
  order: {},
  orderSrc: { local: {}, nuvem: null },
  /** Cada pessoa edita a própria biblioteca (nome antigo mantido para o resto do código). */
  get isAdmin() { return true; },
  /** Quem estava na lista de administradoras da versão antiga (biblioteca compartilhada). */
  get isLegacyAdmin() { return !!(this.user && (CONFIG.admins || []).map((e) => e.toLowerCase()).includes((this.user.email || '').toLowerCase())); },
  get target() { return this.configured && this.user && fb ? 'nuvem' : 'local'; },
};

let fb = null;
let unsubs = [];
let itemUnsubs = [];
/** Caminhos da biblioteca da pessoa logada. */
const U = {
  itens: () => fb.fs.collection(fb.db, 'usuarios', Store.user.uid, 'oficina_itens'),
  item: (id) => fb.fs.doc(fb.db, 'usuarios', Store.user.uid, 'oficina_itens', id),
  midia: (id) => fb.fs.doc(fb.db, 'usuarios', Store.user.uid, 'oficina_midia', id),
  ordem: () => fb.fs.doc(fb.db, 'usuarios', Store.user.uid, 'oficina', 'ordem'),
};
const timers = {};
const scope = () => (Store.user ? 'u:' + Store.user.uid + ':' : 'local:');

function loadLocalState() { for (const n of DOC_NAMES) Store.state[n] = merge(DEFAULTS[n], lsGet(scope() + n, null)); }

export function save(name) {
  const d = Store.state[name];
  d._t = Date.now();
  lsSet(scope() + name, d);
  emit('change', name);
  if (fb && Store.user) {
    clearTimeout(timers[name]);
    timers[name] = setTimeout(() => pushDoc(name), 1200);
    setStatus('pendente');
  }
}
async function pushDoc(name) {
  if (!fb || !Store.user) return;
  const { doc, setDoc } = fb.fs;
  clearTimeout(timers[name]); timers[name] = null;
  try {
    await setDoc(doc(fb.db, 'usuarios', Store.user.uid, 'oficina', name), clone(Store.state[name]));
    if (!Object.values(timers).some(Boolean)) setStatus(navigator.onLine ? 'sincronizado' : 'offline');
  } catch (e) { console.error(e); Store.error = e.message; setStatus('erro'); }
}
function setStatus(s) { if (Store.status !== s) { Store.status = s; emit('status', s); } }

// ---------------- Aulas e listas ----------------
async function loadLocalItems() {
  try {
    const all = await idbAll('itens');
    Store.items.local = Object.fromEntries(all.map((x) => [x.id, { ...x, origem: 'local' }]));
  } catch (e) { console.warn('IndexedDB indisponível', e); Store.items.local = {}; }
  Store.orderSrc.local = lsGet('ordem', {});
  mergeOrder();
}
function mergeOrder() { Store.order = { ...Store.orderSrc.local, ...(Store.orderSrc.nuvem || {}) }; }

/** Salva o mapa de ordem (id → posição). */
export async function saveOrder(changes) {
  if (Store.target === 'nuvem') {
    Store.orderSrc.nuvem = { ...(Store.orderSrc.nuvem || {}), ...changes };
    mergeOrder(); emit('items');
    await fb.fs.setDoc(U.ordem(), { mapa: Store.orderSrc.nuvem, atualizado: Date.now() });
  } else {
    Store.orderSrc.local = { ...Store.orderSrc.local, ...changes };
    lsSet('ordem', Store.orderSrc.local);
    mergeOrder(); emit('items');
  }
}

export async function saveItem({ id, codigo }, { silent = false } = {}) {
  const data = { id, codigo, atualizado: Date.now() };
  if (Store.target === 'nuvem') {
    Store.items.nuvem[id] = { ...data, origem: 'nuvem' };
    if (!silent) emit('items');
    await fb.fs.setDoc(U.item(id), data);
  } else {
    Store.items.local[id] = { ...data, origem: 'local' };
    await idbPut('itens', data);
    if (!silent) emit('items');
  }
  return id;
}
export const touchItems = () => emit('items');
/** Tira só a cópia do aparelho (depois de enviar para a conta). */
export async function removeLocalItem(id) { if (Store.items.local[id]) { delete Store.items.local[id]; await idbDel('itens', id); } }
export function clearLocalOrder(ids) { for (const id of ids) delete Store.orderSrc.local[id]; lsSet('ordem', Store.orderSrc.local); mergeOrder(); }

export async function deleteItem(id) {
  if (Store.items.nuvem[id] && Store.target === 'nuvem') {
    delete Store.items.nuvem[id]; emit('items');
    await fb.fs.deleteDoc(U.item(id));
  }
  if (Store.items.local[id]) { delete Store.items.local[id]; await idbDel('itens', id); emit('items'); }
}

// ---------------- Mídias (figuras e interativos) ----------------
const mediaMem = new Map();
/** {nome, tipo, dados, t} — dados é dataURL (imagens) ou texto (html). */
export async function getMedia(nome) {
  if (mediaMem.has(nome)) return mediaMem.get(nome);
  let m = null;
  try { m = await idbGet('midia', nome); } catch (e) {}
  if (!m && fb) {
    const { doc, getDoc } = fb.fs;
    const refs = [...(Store.user ? [U.midia(docIdOf(nome))] : []), doc(fb.db, 'oficina_midia', docIdOf(nome))];
    for (const ref of refs) {
      try { const snap = await getDoc(ref); if (snap.exists()) { m = snap.data(); idbPut('midia', m).catch(() => {}); break; } }
      catch (e) { /* sem permissão ou offline */ }
    }
  }
  if (m) mediaMem.set(nome, m);
  return m;
}
export async function hasMedia(nome) { return !!(await getMedia(nome)); }
const docIdOf = (nome) => nome.replace(/[\/#?\[\]*]/g, '_');

/** Guarda mídias no aparelho e, com a conta conectada, na nuvem da pessoa. Retorna os nomes que ficaram só no aparelho. */
export async function putMedia(list) {
  const localOnly = [];
  for (const m of list) {
    const rec = { nome: m.nome, tipo: m.tipo, dados: m.dados, t: Date.now() };
    mediaMem.set(m.nome, rec);
    await idbPut('midia', rec);
    if (Store.target === 'nuvem') {
      if (rec.dados.length > CLOUD_MEDIA_MAX) { localOnly.push(m.nome); continue; }
      try { await fb.fs.setDoc(U.midia(docIdOf(m.nome)), rec); }
      catch (e) { console.warn(e); localOnly.push(m.nome); }
    }
  }
  emit('media');
  return localOnly;
}

// ---------------- Login ----------------
export async function signInGoogle() {
  const { GoogleAuthProvider, signInWithPopup } = fb.auth;
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  await signInWithPopup(fb.authI, p);
}
export async function signInEmail(email, senha, criar = false) {
  const A = fb.auth;
  if (criar) await A.createUserWithEmailAndPassword(fb.authI, email, senha);
  else await A.signInWithEmailAndPassword(fb.authI, email, senha);
}
export async function resetPassword(email) { await fb.auth.sendPasswordResetEmail(fb.authI, email); }
export async function signOut() { await fb.auth.signOut(fb.authI); }

function subscribeUser() {
  unsubs.forEach((u) => u()); unsubs = [];
  if (!Store.user) return;
  const { doc, onSnapshot } = fb.fs;
  setStatus('conectando');
  let pending = DOC_NAMES.length;
  for (const n of DOC_NAMES) {
    const ref = doc(fb.db, 'usuarios', Store.user.uid, 'oficina', n);
    let first = true;
    unsubs.push(onSnapshot(ref, (snap) => {
      if (snap.metadata.hasPendingWrites) return;
      const remote = snap.exists() ? snap.data() : null;
      if (!remote && snap.metadata.fromCache) return;
      const local = Store.state[n];
      if (first) {
        first = false;
        if (!remote) {
          const guest = lsGet('local:' + n, null);
          if (guest && guest._t && (!local._t || guest._t > local._t)) Store.state[n] = merge(DEFAULTS[n], guest);
          if (Store.state[n]._t) pushDoc(n);
        }
        if (--pending === 0) setStatus(navigator.onLine ? 'sincronizado' : 'offline');
      }
      if (remote && (remote._t || 0) > (local._t || 0) && !timers[n]) {
        Store.state[n] = merge(DEFAULTS[n], remote);
        lsSet(scope() + n, Store.state[n]);
        emit('change', n);
      } else if (remote && (local._t || 0) > (remote._t || 0) && !timers[n]) pushDoc(n);
    }, (err) => { console.error(err); Store.error = err.message; setStatus('erro'); }));
  }
}

function subscribeItems() {
  itemUnsubs.forEach((u) => u()); itemUnsubs = [];
  Store.items.nuvem = {}; Store.orderSrc.nuvem = null; mergeOrder();
  if (!Store.user) { emit('items'); return; }
  const { onSnapshot } = fb.fs;
  itemUnsubs.push(onSnapshot(U.ordem(), (snap) => {
    Store.orderSrc.nuvem = snap.exists() ? snap.data().mapa || {} : null;
    mergeOrder(); emit('items');
  }, (err) => console.warn('ordem', err)));
  itemUnsubs.push(onSnapshot(U.itens(), (snap) => {
    const out = {};
    snap.forEach((d) => { out[d.id] = { ...d.data(), id: d.id, origem: 'nuvem' }; });
    Store.items.nuvem = out;
    emit('items');
  }, (err) => { console.warn('itens', err); Store.error = err.message; }));
}

// ---------------- Biblioteca compartilhada da versão antiga ----------------
/** Quantos itens há na biblioteca antiga (coleção oficina_itens, da época em que só a administradora enviava). */
export async function legacyCount() {
  if (!fb) return 0;
  try { const { collection, getDocs } = fb.fs; return (await getDocs(collection(fb.db, 'oficina_itens'))).size; } catch (e) { return 0; }
}
/** Copia a biblioteca antiga (aulas, listas, figuras e ordem) para a conta de quem está logada. Itens com o mesmo id não são sobrescritos. */
export async function importLegacy(onProg = () => {}) {
  const { collection, getDocs, getDoc, doc, setDoc } = fb.fs;
  const its = await getDocs(collection(fb.db, 'oficina_itens'));
  let n = 0, pulados = 0, i = 0;
  for (const d of its.docs) {
    onProg(`Aulas e listas: ${++i}/${its.size}`);
    if (Store.items.nuvem[d.id]) { pulados++; continue; }
    await setDoc(U.item(d.id), { ...d.data(), id: d.id }); n++;
  }
  const md = await getDocs(collection(fb.db, 'oficina_midia'));
  i = 0;
  for (const d of md.docs) { onProg(`Figuras: ${++i}/${md.size}`); await setDoc(U.midia(d.id), d.data()); }
  try {
    const o = await getDoc(doc(fb.db, 'oficina_config', 'ordem'));
    if (o.exists()) await setDoc(U.ordem(), { mapa: { ...(o.data().mapa || {}), ...(Store.orderSrc.nuvem || {}) }, atualizado: Date.now() });
  } catch (e) {}
  return { n, pulados, midias: md.size };
}

async function initFirebase() {
  setStatus('conectando');
  const base = `https://www.gstatic.com/firebasejs/${FB}/`;
  const [app, auth, fs] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]);
  const a = app.initializeApp(CONFIG.firebase);
  let db;
  try { db = fs.initializeFirestore(a, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) }); }
  catch (e) { db = fs.getFirestore(a); }
  const authI = auth.getAuth(a);
  fb = { app: a, auth, fs, db, authI };
  auth.onAuthStateChanged(authI, (u) => {
    Store.user = u ? { uid: u.uid, email: u.email, nome: u.displayName || '', foto: u.photoURL || '' } : null;
    loadLocalState();
    if (Store.user && !Store.state.perfil.nome && Store.user.nome) Store.state.perfil.nome = Store.user.nome.split(' ')[0];
    if (!Store.user) setStatus('local');
    subscribeUser();
    subscribeItems();
    emit('auth', Store.user);
    emit('change', '*');
  });
  window.addEventListener('online', () => Store.user && setStatus('sincronizado'));
  window.addEventListener('offline', () => Store.user && setStatus('offline'));
}

export async function init() {
  loadLocalState();
  await loadLocalItems();
  if (Store.configured) {
    try { await initFirebase(); }
    catch (e) { console.error(e); Store.error = 'Não foi possível carregar o Firebase: ' + e.message; setStatus('erro'); }
  }
}

export function setState(name, data) { Store.state[name] = merge(DEFAULTS[name], data); save(name); }
export async function resetProgress() { Store.state.progresso = clone(DEFAULTS.progresso); save('progresso'); }
