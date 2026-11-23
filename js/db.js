// Banco local do aparelho (IndexedDB): itens (aulas e listas) e mídias (figuras e interativos).
const NAME = 'oficina', VER = 1;
let dbp = null;
function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(NAME, VER);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('itens')) db.createObjectStore('itens', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('midia')) db.createObjectStore('midia', { keyPath: 'nome' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
function tx(store, mode, fn) {
  return open().then((db) => new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let out;
    Promise.resolve(fn(s)).then((v) => { out = v; });
    t.oncomplete = () => res(out instanceof IDBRequest ? out.result : out);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  }));
}
export const idbAll = (store) => tx(store, 'readonly', (s) => s.getAll());
export const idbGet = (store, key) => tx(store, 'readonly', (s) => s.get(key));
export const idbPut = (store, val) => tx(store, 'readwrite', (s) => { s.put(val); });
export const idbDel = (store, key) => tx(store, 'readwrite', (s) => { s.delete(key); });
export const idbKeys = (store) => tx(store, 'readonly', (s) => s.getAllKeys());
export const idbClear = (store) => tx(store, 'readwrite', (s) => { s.clear(); });
