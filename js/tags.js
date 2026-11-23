// Tags de aulas, listas, essenciais, passo a passo e de cada exercício; e "copiar contexto" de um bloco.
import { Store, saveItem } from './store.js';
import { rebuild, allTags, normTags, exTags, setExTags, setItemTagOverride, itemById } from './data.js';
import { modal, esc, toast } from './util.js';

/** Chips de tags (só leitura). */
export const tagChips = (tags) => (tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('');

/** Troca a linha @tags do cabeçalho do código (ou tira, se ficar vazio). */
export function rewriteTags(codigo, tags) {
  const lines = String(codigo).replace(/\r\n?/g, '\n').split('\n');
  let fb = lines.findIndex((l) => /^\s*==[^=]/.test(l));
  if (fb < 0) fb = lines.length;
  const isTag = (l) => /^\s*@\s*(tags?|etiquetas|topicos|temas)\s*:/i.test(l);
  let at = -1;
  for (let i = fb - 1; i >= 0; i--) if (isTag(lines[i])) { lines.splice(i, 1); fb--; at = i; }
  if (tags.length) {
    if (at < 0) {
      const t = lines.findIndex((l, i) => i < fb && /^\s*@\s*(titulo|title|nome)\s*:/i.test(l));
      const k = lines.findIndex((l, i) => i < fb && /^\s*@\s*tipo\s*:/i.test(l));
      at = t >= 0 ? t + 1 : k >= 0 ? k + 1 : 0;
    }
    lines.splice(at, 0, '@tags: ' + tags.join(', '));
  }
  return lines.join('\n');
}

/** Grava as tags de um item: no próprio código quando dá; senão, só para você (no progresso). */
export async function setItemTags(it, tags) {
  tags = normTags(tags);
  if (Store.isAdmin || it.origem === 'local') {
    await saveItem({ id: it.id, codigo: rewriteTags(it.codigo, tags) }, { silent: true });
    setItemTagOverride(it.id, null);
  } else setItemTagOverride(it.id, tags);
  rebuild();
  return tags;
}

/** Modal para adicionar e tirar tags. onSave(tags) recebe a lista final. */
export function editTags({ titulo = '', tags = [], onSave }) {
  let cur = [...tags];
  modal(`<div class="stack"><div class="row between nowrap"><h3>🏷 Tags</h3><button class="btn sm ghost" data-close>Fechar</button></div>
    ${titulo ? `<div class="small muted" style="margin-top:-6px">${esc(titulo)}</div>` : ''}
    <div class="tag-edit" data-chips></div>
    <div class="row nowrap"><input class="input grow" data-new list="oficina-tags" placeholder="Nova tag (Enter adiciona; vírgula separa várias)" autocomplete="off"><button class="btn" data-add>Adicionar</button></div>
    <datalist id="oficina-tags">${allTags().map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
    <div data-sug></div>
    <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-ok>Salvar tags</button></div></div>`,
  (el, close) => {
    const inp = el.querySelector('[data-new]');
    const draw = () => {
      el.querySelector('[data-chips]').innerHTML = cur.length ? cur.map((t, i) => `<span class="tag on">${esc(t)}<button type="button" data-rm="${i}" title="Tirar" aria-label="Tirar ${esc(t)}">×</button></span>`).join('') : '<span class="small muted">Nenhuma tag ainda.</span>';
      const sug = allTags().filter((t) => !cur.includes(t)).slice(0, 24);
      el.querySelector('[data-sug]').innerHTML = sug.length ? `<div class="tiny muted" style="margin-bottom:4px">Tags que você já usa (toque para pôr):</div><div class="tag-edit">${sug.map((t) => `<button type="button" class="tag" data-put="${esc(t)}">+ ${esc(t)}</button>`).join('')}</div>` : '';
      el.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = () => { cur.splice(+b.dataset.rm, 1); draw(); }));
      el.querySelectorAll('[data-put]').forEach((b) => (b.onclick = () => { cur = normTags([...cur, b.dataset.put]); draw(); }));
    };
    const add = () => { if (!inp.value.trim()) return; cur = normTags([...cur, inp.value]); inp.value = ''; draw(); inp.focus(); };
    el.querySelector('[data-add]').onclick = add;
    inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } };
    el.querySelector('[data-ok]').onclick = async () => {
      if (inp.value.trim()) add();
      const b = el.querySelector('[data-ok]'); b.disabled = true;
      try { await onSave?.(normTags(cur)); toast('Tags salvas ✓'); close(); } catch (e) { console.error(e); toast('Não consegui salvar: ' + e.message, 5000); b.disabled = false; }
    };
    draw(); setTimeout(() => inp.focus(), 50);
  });
}

/** Botão + chips de tags de um item (aula, lista, essenciais). */
export const itemTagsRow = (it) => `<div class="row tag-line" data-itags>${tagChips(it.tags)}<button type="button" class="btn xs ghost" data-edittags>🏷 ${it.tags.length ? 'Editar tags' : 'Adicionar tags'}</button></div>`;
export function wireItemTags(root, it, after) {
  root.querySelector('[data-edittags]')?.addEventListener('click', () => editTags({ titulo: it.titulo, tags: it.tags, onSave: async (t) => { await setItemTags(it, t); after?.(itemById(it.id) || it); } }));
}

/** Tags de um exercício/checagem (chave id#idx). */
export function editExTags(key, titulo, after) {
  editTags({ titulo, tags: exTags(key), onSave: (t) => { const r = setExTags(key, t); after?.(r); } });
}

// ---------------- Copiar contexto ----------------
/** Código-fonte de um bloco (da linha "== …" até o próximo bloco). */
export function blockSource(it, b) {
  const lines = String(it?.codigo || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  const start = (b?.line || 1) - 1;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) if (/^\s*==\s*[^=\s]/.test(lines[i]) && !/^\s*===/.test(lines[i])) { end = i; break; }
  const out = lines.slice(start, end);
  while (out.length && !out[out.length - 1].trim()) out.pop();
  return out.join('\n');
}
export const contextText = (it, b) => `<contexto>\n${blockSource(it, b)}\n</contexto>`;
export async function copyContext(it, b) {
  const t = contextText(it, b);
  try { await navigator.clipboard.writeText(t); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e2) { toast('Não consegui copiar.'); ta.remove(); return; }
    ta.remove();
  }
  toast('Contexto copiado — cole no ChatGPT junto com a sua dúvida');
}
