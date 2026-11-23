export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const plural = (n, s, p) => `${n} ${n === 1 ? s : p || s + 's'}`;
export const fmtDate = (t) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

let toastT;
export function toast(msg, ms = 2600) {
  $('.toast')?.remove(); clearTimeout(toastT);
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
  document.body.appendChild(el);
  toastT = setTimeout(() => el.remove(), ms);
}
export function modal(html, mount, { wide = false } = {}) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal card ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(bg);
  mount?.(bg.firstElementChild, close);
  return close;
}
export function confirmBox(msg, { ok = 'Confirmar', danger = false } = {}) {
  return new Promise((res) => {
    modal(`<div class="stack"><p style="margin:0">${msg}</p><div class="row" style="justify-content:flex-end">
      <button class="btn ghost" data-close>Cancelar</button><button class="btn ${danger ? 'danger-fill' : 'primary'}" data-ok>${ok}</button></div></div>`,
    (el, close) => {
      el.querySelector('[data-ok]').onclick = () => { close(); res(true); };
      el.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => res(false)));
    });
  });
}
export async function copyText(t) {
  try { await navigator.clipboard.writeText(t); toast('Copiado ✓'); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('Copiado ✓'); } catch (e2) { toast('Não consegui copiar — selecione e copie manualmente.'); }
    ta.remove();
  }
}
/** Baixa texto ou Blob como arquivo. */
export function download(name, data, type = 'text/plain') {
  const blob = data instanceof Blob ? data : new Blob([data], { type: type + ';charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

let jszipP = null;
/** Carrega o JSZip (vendor/jszip.min.js) só quando precisa. */
export function loadZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  jszipP ||= new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = 'vendor/jszip.min.js';
    s.onload = () => res(window.JSZip); s.onerror = () => rej(new Error('Não consegui carregar o JSZip.'));
    document.head.appendChild(s);
  });
  return jszipP;
}

export const readText = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsText(file); });
export const readDataURL = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
export function dataURLtoBlob(d) {
  const [h, b] = d.split(',');
  const mime = h.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
  if (/;base64/.test(h)) { const bin = atob(b); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: mime }); }
  return new Blob([decodeURIComponent(b)], { type: mime });
}

// ---------- Filtros recolhíveis ----------
const FKEY = 'oficina:filtrosAbertos';
const fOpen = () => { try { return JSON.parse(localStorage.getItem(FKEY) || '{}'); } catch (e) { return {}; } };
export const filtIsOpen = (name) => !!fOpen()[name];
/** Botão "Filtros ▾" (com número de filtros ativos). */
export const filtToggle = (name, n = 0) => `<button type="button" class="filt-tog ${filtIsOpen(name) ? 'open' : ''}" data-filttog="${name}" aria-expanded="${filtIsOpen(name)}" title="Mostrar ou recolher os filtros"><span>Filtros</span>${n ? `<b class="filt-n">${n}</b>` : ''}<span class="chev">▾</span></button>`;
/** Atributos para o corpo dos filtros (some quando recolhido). */
export const filtBody = (name) => `data-filtbody="${name}" ${filtIsOpen(name) ? '' : 'hidden'}`;
export function wireFilt(root, name, onToggle) {
  root.querySelectorAll(`[data-filttog="${name}"]`).forEach((b) => (b.onclick = () => {
    const o = fOpen(); o[name] = !o[name];
    try { localStorage.setItem(FKEY, JSON.stringify(o)); } catch (e) {}
    root.querySelectorAll(`[data-filttog="${name}"]`).forEach((x) => { x.classList.toggle('open', o[name]); x.setAttribute('aria-expanded', o[name]); });
    root.querySelectorAll(`[data-filtbody="${name}"]`).forEach((x) => (x.hidden = !o[name]));
    onToggle?.(o[name]);
  }));
}
export function setFiltCount(root, name, n) {
  root.querySelectorAll(`[data-filttog="${name}"]`).forEach((b) => {
    let el = b.querySelector('.filt-n');
    if (!n) { el?.remove(); return; }
    if (!el) { el = document.createElement('b'); el.className = 'filt-n'; b.insertBefore(el, b.querySelector('.chev')); }
    el.textContent = n;
  });
}
