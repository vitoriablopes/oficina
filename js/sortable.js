// Lista reordenável: arrastar pela alça (mouse ou toque) ou usar as setas ↑ ↓.
import { esc } from './util.js';

/**
 * items: [{id, label, sub, novo}]  → monta dentro de el e chama onChange(ids) a cada mudança.
 */
export function sortable(el, items, { onChange } = {}) {
  let list = [...items];
  const draw = () => {
    el.innerHTML = `<ol class="sortable">${list.map((it, i) => `<li class="srt ${it.novo ? 'novo' : ''}" data-id="${esc(it.id)}">
      <span class="srt-n">${i + 1}</span>
      <span class="srt-h" title="Arraste para mudar a ordem" aria-hidden="true">⠿</span>
      <span class="grow srt-t">${it.label}${it.novo ? ' <span class="badge-novo">nova</span>' : ''}${it.sub ? `<div class="tiny muted">${it.sub}</div>` : ''}</span>
      <span class="srt-btns"><button type="button" class="icon-btn sm" data-up ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button><button type="button" class="icon-btn sm" data-down ${i === list.length - 1 ? 'disabled' : ''} aria-label="Descer">↓</button></span></li>`).join('')}</ol>`;
  };
  const changed = () => { draw(); onChange?.(list.map((x) => x.id)); };
  const idxOf = (li) => list.findIndex((x) => x.id === li.dataset.id);
  el.addEventListener('click', (e) => {
    const li = e.target.closest('.srt'); if (!li) return;
    const i = idxOf(li);
    if (e.target.closest('[data-up]') && i > 0) { [list[i - 1], list[i]] = [list[i], list[i - 1]]; changed(); el.querySelector(`[data-id="${CSS.escape(li.dataset.id)}"] [data-up]`)?.focus(); }
    if (e.target.closest('[data-down]') && i < list.length - 1) { [list[i + 1], list[i]] = [list[i], list[i + 1]]; changed(); el.querySelector(`[data-id="${CSS.escape(li.dataset.id)}"] [data-down]`)?.focus(); }
  });

  // arrastar
  let drag = null;
  el.addEventListener('pointerdown', (e) => {
    const h = e.target.closest('.srt-h'); if (!h) return;
    const li = h.closest('.srt');
    e.preventDefault();
    const r = li.getBoundingClientRect();
    const ghost = li.cloneNode(true);
    ghost.classList.add('srt-ghost');
    ghost.style.width = r.width + 'px'; ghost.style.left = r.left + 'px'; ghost.style.top = r.top + 'px';
    document.body.appendChild(ghost);
    li.classList.add('srt-hole');
    document.body.style.userSelect = 'none';
    drag = { li, ghost, dy: e.clientY - r.top, id: li.dataset.id, pid: e.pointerId };
    h.setPointerCapture?.(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pid) return;
    e.preventDefault();
    drag.ghost.style.top = e.clientY - drag.dy + 'px';
    const ol = el.querySelector('.sortable');
    const others = [...ol.children].filter((x) => x !== drag.li);
    let before = null;
    for (const o of others) { const r = o.getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { before = o; break; } }
    if (before !== drag.li.nextElementSibling) ol.insertBefore(drag.li, before);
    // rolar a página perto das bordas
    if (e.clientY < 70) window.scrollBy(0, -12); else if (e.clientY > window.innerHeight - 70) window.scrollBy(0, 12);
  });
  const end = () => {
    if (!drag) return;
    drag.ghost.remove(); drag.li.classList.remove('srt-hole'); document.body.style.userSelect = '';
    const ids = [...el.querySelectorAll('.srt')].map((x) => x.dataset.id);
    list = ids.map((id) => list.find((x) => x.id === id));
    drag = null; changed();
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  draw();
  return { get ids() { return list.map((x) => x.id); } };
}
