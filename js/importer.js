// Importar (colar, vários arquivos, zip) e exportar (item, matéria, backup).
import { parseItem, extractFiles, mediaKey, MEDIA_EXT, isHtmlName, filePrefix, fileNameOf, slugify, keyOf, TIPOS, PASTAS } from './parser.js';
import { Store, saveItem, putMedia, getMedia, touchItems, setState, CLOUD_MEDIA_MAX, lsSet } from './store.js';
import { ITEMS, itemById, groupOf, rebuild, setGroupOrder, materias } from './data.js';
import { esc, plural, toast, download, loadZip, readText, readDataURL, dataURLtoBlob, confirmBox } from './util.js';
import { sortable } from './sortable.js';
import { inl } from './render.js';

const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp', html: 'text/html', htm: 'text/html' };
const extOf = (n) => (n.match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();
const isItemName = (n) => /\.(txt|md|text)$/i.test(n);

// ---------------------------------------------------------------
//  Coleta
// ---------------------------------------------------------------
/** Divide um texto com vários "@tipo:" em itens separados. */
export function splitItems(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const starts = [];
  lines.forEach((l, i) => { if (/^\s*@\s*tipo\s*:/i.test(l)) starts.push(i); });
  if (starts.length <= 1) return [text];
  return starts.map((s, k) => lines.slice(k === 0 ? 0 : s, starts[k + 1] ?? lines.length).join('\n'));
}

async function mediaFromText(name, content) {
  const ext = extOf(name);
  if (ext === 'svg') return { nome: name, tipo: MIME.svg, dados: 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(content))) };
  return { nome: name, tipo: MIME[ext] || 'text/html', dados: content };
}
/** Imagens grandes são reduzidas para caber na nuvem (GIF e SVG ficam como estão). */
async function mediaFromBlob(name, blob) {
  const ext = extOf(name);
  if (ext === 'html' || ext === 'htm') return { nome: name, tipo: 'text/html', dados: await blob.text() };
  if (ext === 'svg') return mediaFromText(name, await blob.text());
  let dados = await readDataURL(new Blob([blob], { type: MIME[ext] || blob.type }));
  if (dados.length > CLOUD_MEDIA_MAX && ext !== 'gif') dados = await shrink(dados, ext) || dados;
  return { nome: name, tipo: MIME[ext] || blob.type, dados };
}
async function shrink(dataURL, ext) {
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataURL; });
    for (const [max, q] of [[1800, 0.9], [1500, 0.85], [1200, 0.8], [1000, 0.75]]) {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      const out = c.toDataURL(ext === 'png' ? 'image/webp' : 'image/jpeg', q);
      if (out.length < CLOUD_MEDIA_MAX * 0.95) return out;
    }
  } catch (e) { console.warn('shrink', e); }
  return null;
}

/** Junta tudo o que foi escolhido (arquivos soltos e zips) → {items, media, extras}. */
export async function collectFiles(files) {
  const out = { items: [], media: new Map(), backup: null, ignored: [] };
  const addText = (codigo, fname) => {
    const ex = extractFiles(codigo);
    ex.files.forEach((f) => out.media.set(f.name, { pending: f }));
    splitItems(ex.text).forEach((t, k) => out.items.push({ codigo: t.trim() + '\n', fname: fname + (k ? `#${k + 1}` : ''), prefix: filePrefix(fname) }));
  };
  for (const f of files) {
    const name = f.name || 'arquivo';
    if (/\.zip$/i.test(name)) {
      const JSZip = await loadZip();
      const zip = await JSZip.loadAsync(f);
      const entries = Object.values(zip.files).filter((e) => !e.dir && !/(^|\/)(__MACOSX|\.)/.test(e.name));
      entries.sort((a, b) => a.name.localeCompare(b.name, 'pt', { numeric: true }));
      for (const e of entries) {
        if (/oficina-backup\.json$/i.test(e.name)) { try { out.backup = JSON.parse(await e.async('string')); } catch (err) {} continue; }
        if (isItemName(e.name)) addText(await e.async('string'), e.name);
        else if (MEDIA_EXT.test(e.name)) out.media.set(mediaKey(e.name), { blob: await e.async('blob') });
        else out.ignored.push(e.name);
      }
    } else if (isItemName(name)) addText(await readText(f), name);
    else if (MEDIA_EXT.test(name)) out.media.set(mediaKey(name), { blob: f });
    else out.ignored.push(name);
  }
  return out;
}
export function collectText(text) {
  const out = { items: [], media: new Map(), backup: null, ignored: [] };
  const ex = extractFiles(text);
  ex.files.forEach((f) => out.media.set(f.name, { pending: f }));
  splitItems(ex.text).forEach((t, k) => out.items.push({ codigo: t.trim() + '\n', fname: k ? `texto colado #${k + 1}` : 'texto colado', prefix: null }));
  return out;
}
/** Mapa nome → mídia (para a pré-visualização). */
export async function packMediaMap(pack) {
  const list = await materialize(pack.media);
  return new Map(list.map((m) => [m.nome, m]));
}
async function materialize(media) {
  const list = [];
  for (const [name, v] of media) {
    if (v.rec) { list.push(v.rec); continue; }
    v.rec = v.pending ? await mediaFromText(name, v.pending.content) : await mediaFromBlob(name, v.blob);
    list.push(v.rec);
  }
  return list;
}

// ---------------------------------------------------------------
//  Revisão (prévia, mídias faltando, ordem) e gravação
// ---------------------------------------------------------------
/**
 * Mostra a revisão dentro de el. pack = resultado de collectFiles/collectText.
 * onDone() é chamado depois de importar.
 */
export async function reviewImport(el, pack, { onDone, onCancel } = {}) {
  rebuild();
  const st = { confirmed: new Set(), orders: {}, pos: '', restore: !!pack.backup };
  // análise
  const parsed = pack.items.map((x) => {
    const p = parseItem(x.codigo);
    const exists = itemById(p.meta.id);
    return { ...x, p, id: p.meta.id, exists: !!exists, sameText: exists && exists.codigo.trim() === x.codigo.trim(), g: p.meta.materiaKey + '|' + p.meta.tipo };
  });
  // ids repetidos no mesmo pacote: fica o último
  const seen = new Map(); parsed.forEach((x, i) => seen.set(x.id, i));
  const dupes = parsed.filter((x, i) => seen.get(x.id) !== i);
  const items = parsed.filter((x, i) => seen.get(x.id) === i && x.p.ok);
  const broken = parsed.filter((x, i) => seen.get(x.id) === i && !x.p.ok);
  const novos = items.filter((x) => !x.exists);
  const multi = novos.length > 1;
  const groups = {};
  items.forEach((x) => { (groups[x.g] ||= { key: x.g, materia: x.p.meta.materia, mkey: x.p.meta.materiaKey, tipo: x.p.meta.tipo, items: [] }).items.push(x); });
  const groupsWithNew = Object.values(groups).filter((g) => g.items.some((x) => !x.exists));

  async function mediaStatus() {
    const need = new Set(items.flatMap((x) => x.p.midias));
    const rows = [];
    for (const n of need) rows.push({ n, inPack: pack.media.has(n), saved: !pack.media.has(n) && !!(await getMedia(n)) });
    return rows;
  }

  async function draw() {
    const med = await mediaStatus();
    const missing = med.filter((m) => !m.inPack && !m.saved);
    const single = !multi && novos.length === 1 ? novos[0] : null;
    const gsize = single ? groupOf(single.p.meta.materiaKey, single.p.meta.tipo).length : 0;
    el.innerHTML = `<div class="stack">
      <div class="row between"><h2>Revisar importação</h2><button class="btn sm ghost" data-cancel>Cancelar</button></div>
      <p style="margin:0">${Object.keys(TIPOS).map((t) => [t, items.filter((x) => x.p.meta.tipo === t).length]).filter(([, n]) => n).map(([t, n]) => `${n} ${t === 'aula' ? (n === 1 ? 'aula' : 'aulas') : t === 'lista' ? (n === 1 ? 'lista' : 'listas') : t === 'essencial' ? 'de essenciais' : 'de passo a passo'}`).join(' · ') || 'Nada'}${novos.length !== items.length ? ` · ${plural(items.length - novos.length, 'atualização', 'atualizações')}` : ''}${pack.media.size ? ` · ${plural(pack.media.size, 'mídia')}` : ''}.</p>

      <div class="card flat stack-s">${items.map((x) => `<div class="imp-row"><span class="chip ${{ lista: 'peach', aula: 'sky', essencial: 'lav', passos: 'sage' }[x.p.meta.tipo]}">${TIPOS[x.p.meta.tipo]}</span>
          <div class="grow"><b>${inl(x.p.meta.titulo)}</b> <span class="small muted">· ${esc(x.p.meta.materia)}${x.p.meta.topico && x.p.meta.topico !== x.p.meta.titulo ? ' · ' + esc(x.p.meta.topico) : ''} · ${plural(x.p.blocks.length, { lista: 'exercício', essencial: 'subtópico', passos: 'tipo de questão' }[x.p.meta.tipo] || 'parte', { passos: 'tipos de questão' }[x.p.meta.tipo])}</span>
          ${x.exists ? `<div class="tiny" style="color:var(--accent)">${x.sameText ? 'igual à que você já tem' : 'substitui a versão que você já tem (mantém a posição e o progresso)'}</div>` : ''}
          <div class="tiny muted fname">${esc(x.fname)}</div>
          ${x.p.warnings.length ? `<details class="tiny"><summary>${plural(x.p.warnings.length, 'aviso')}</summary><ul class="warns">${x.p.warnings.map((w) => `<li class="${w.level}">linha ${w.line}: ${esc(w.msg)}</li>`).join('')}</ul></details>` : ''}</div></div>`).join('') || '<div class="muted">Nenhuma aula ou lista válida encontrada.</div>'}</div>

      ${broken.length ? `<div class="card flat bad-box stack-s"><b>Não vão entrar (com erro):</b>${broken.map((x) => `<div><b>${esc(x.fname)}</b><ul class="warns">${x.p.warnings.filter((w) => w.level === 'erro').map((w) => `<li class="erro">linha ${w.line}: ${esc(w.msg)}</li>`).join('')}</ul></div>`).join('')}</div>` : ''}
      ${dupes.length ? `<p class="small muted" style="margin:0">Com o mesmo @id repetido no pacote, ficou só a última versão: ${dupes.map((x) => esc(x.fname)).join(', ')}.</p>` : ''}

      ${med.length ? `<div class="card flat stack-s"><h3>Figuras e interativos</h3>
        ${med.map((m) => `<div class="row nowrap small"><span>${m.inPack ? '✓' : m.saved ? '✓' : '✗'}</span><code class="grow brk">${esc(m.n)}</code><span class="tiny muted">${m.inPack ? 'no pacote' : m.saved ? 'já salvo' : '<b style="color:var(--bad)">faltando</b>'}</span></div>`).join('')}
        ${missing.length ? `<label class="btn sm" style="align-self:flex-start">📎 Anexar arquivos que faltam<input type="file" multiple hidden data-addmedia accept=".png,.jpg,.jpeg,.gif,.svg,.webp,.html,.htm"></label><p class="tiny muted" style="margin:0">Pode importar sem elas: o lugar da figura mostra um aviso até você anexar depois.</p>` : ''}
      </div>` : ''}

      ${pack.backup ? `<label class="switch"><input type="checkbox" data-restore ${st.restore ? 'checked' : ''}><span class="tg"></span>Restaurar também o progresso salvo no backup</label>` : ''}

      ${single ? `<div class="card flat stack-s"><h3>Posição</h3>
        <p class="small muted" style="margin:0">${{ lista: 'No mapa de listas', aula: 'Na trilha', essencial: 'Nos essenciais', passos: 'No passo a passo' }[single.p.meta.tipo]} de ${esc(single.p.meta.materia)} há ${gsize} ${gsize === 1 ? 'item' : 'itens'}. Deixe vazio para pôr no fim, ou escolha um número: as de lá para frente descem uma posição.</p>
        <input class="input" type="number" inputmode="numeric" min="1" max="${gsize + 1}" placeholder="vazio = no fim (posição ${gsize + 1})" data-pos value="${esc(st.pos)}" style="max-width:280px"></div>` : ''}

      ${multi ? groupsWithNew.map((g) => `<div class="card flat stack-s" data-grp="${esc(g.key)}"><h3>Ordem · ${esc(g.materia)} · ${{ lista: 'listas', aula: 'aulas', essencial: 'essenciais', passos: 'passo a passo' }[g.tipo]}</h3>
        <p class="small muted" style="margin:0">As novas estão destacadas, no fim, na ordem dos arquivos. Arraste pela alça ⠿ (ou use ↑ ↓) e confirme.</p>
        <div data-sort></div>
        <button class="btn sm ${st.confirmed.has(g.key) ? 'sage' : 'primary'}" data-confirm="${esc(g.key)}">${st.confirmed.has(g.key) ? '✓ Ordem confirmada' : 'Confirmar esta ordem'}</button></div>`).join('') : ''}

      <div class="row" style="justify-content:flex-end"><button class="btn primary lg" data-go ${!items.length || (multi && groupsWithNew.some((g) => !st.confirmed.has(g.key))) ? 'disabled' : ''}>Importar</button></div>
      ${multi && groupsWithNew.some((g) => !st.confirmed.has(g.key)) ? `<p class="small muted" style="text-align:right;margin:0">Confirme a ordem de ${groupsWithNew.length > 1 ? 'cada grupo' : 'cada uma'} para liberar a importação.</p>` : ''}
    </div>`;

    el.querySelector('[data-cancel]').onclick = () => onCancel?.();
    el.querySelector('[data-restore]')?.addEventListener('change', (e) => { st.restore = e.target.checked; });
    el.querySelector('[data-pos]')?.addEventListener('input', (e) => { st.pos = e.target.value; });
    el.querySelector('[data-addmedia]')?.addEventListener('change', async (e) => {
      for (const f of e.target.files) pack.media.set(mediaKey(f.name), { blob: f });
      draw();
    });
    if (multi) for (const g of groupsWithNew) {
      const box = el.querySelector(`[data-grp="${CSS.escape(g.key)}"] [data-sort]`);
      const existing = groupOf(g.mkey, g.tipo);
      const newOnes = g.items.filter((x) => !x.exists).sort((a, b) => (a.prefix ?? 1e9) - (b.prefix ?? 1e9) || a.fname.localeCompare(b.fname, 'pt', { numeric: true }));
      const base = st.orders[g.key] || [...existing.map((x) => x.id), ...newOnes.map((x) => x.id)];
      if (pack.backup?.ordem && !st.orders[g.key]) base.sort((a, b) => (pack.backup.ordem[a] ?? 1e9) - (pack.backup.ordem[b] ?? 1e9));
      const label = (id) => { const n = newOnes.find((x) => x.id === id); return n ? { id, label: inl(n.p.meta.titulo), novo: true, sub: esc(n.fname) } : { id, label: inl(itemById(id)?.titulo || id) }; };
      sortable(box, base.map(label), { onChange: (ids) => { st.orders[g.key] = ids; if (st.confirmed.delete(g.key)) refreshButtons(); } });
      st.orders[g.key] ||= base;
    }
    el.querySelectorAll('[data-confirm]').forEach((b) => (b.onclick = () => { st.confirmed.add(b.dataset.confirm); refreshButtons(); }));
    el.querySelector('[data-go]').onclick = go;
  }
  function refreshButtons() {
    el.querySelectorAll('[data-confirm]').forEach((b) => { const ok = st.confirmed.has(b.dataset.confirm); b.className = `btn sm ${ok ? 'sage' : 'primary'}`; b.textContent = ok ? '✓ Ordem confirmada' : 'Confirmar esta ordem'; });
    const all = groupsWithNew.every((g) => st.confirmed.has(g.key));
    el.querySelector('[data-go]').disabled = !all;
  }

  async function go() {
    const btn = el.querySelector('[data-go]'); btn.disabled = true; btn.textContent = 'Importando…';
    try {
      const single = !multi && novos.length === 1 ? novos[0] : null;
      let singleOrder = null;
      if (single) {
        const ids = groupOf(single.p.meta.materiaKey, single.p.meta.tipo).map((x) => x.id);
        const n = parseInt(st.pos, 10);
        const at = Number.isFinite(n) ? Math.min(Math.max(n, 1), ids.length + 1) - 1 : ids.length;
        ids.splice(at, 0, single.id);
        singleOrder = ids;
      }
      const mediaList = await materialize(pack.media);
      const localOnly = mediaList.length ? await putMedia(mediaList) : [];
      for (const x of items) if (!x.sameText) await saveItem({ id: x.id, codigo: x.codigo }, { silent: true });
      if (singleOrder) await setGroupOrder(singleOrder);
      if (multi) for (const g of groupsWithNew) await setGroupOrder(st.orders[g.key]);
      if (pack.backup && st.restore) {
        if (pack.backup.progresso) setState('progresso', pack.backup.progresso);
        if (pack.backup.perfil) setState('perfil', { ...Store.state.perfil, ...pack.backup.perfil });
      }
      touchItems(); rebuild();
      toast(`${plural(items.length, 'item importado', 'itens importados')} ✓`);
      if (localOnly.length) setTimeout(() => toast(`${plural(localOnly.length, 'mídia grande ficou', 'mídias grandes ficaram')} só neste aparelho (limite da nuvem: ~900 KB).`, 6000), 2800);
      onDone?.(items);
    } catch (e) {
      console.error(e); toast('Erro ao importar: ' + e.message, 6000); btn.disabled = false; btn.textContent = 'Importar';
    }
  }
  await draw();
}

// ---------------------------------------------------------------
//  Exportar
// ---------------------------------------------------------------
async function addMedia(zip, names) {
  const missing = [];
  for (const n of new Set(names)) {
    const m = await getMedia(n);
    if (!m) { missing.push(n); continue; }
    zip.file('midia/' + n, isHtmlName(n) ? m.dados : dataURLtoBlob(m.dados));
  }
  return missing;
}
export async function exportItem(it, n = 1) {
  const fname = fileNameOf(it.meta, n);
  if (!it.parsed.midias.length) { download(fname, it.codigo); return; }
  const JSZip = await loadZip();
  const zip = new JSZip();
  zip.file(fname, it.codigo);
  await addMedia(zip, it.parsed.midias);
  download(fname.replace(/\.txt$/, '.zip'), await zip.generateAsync({ type: 'blob' }));
}
function addGroupFiles(zip, m, prefix = '') {
  const names = [];
  for (const [tipo, arr] of [['aula', m.aulas], ['essencial', m.essenciais], ['passos', m.passos], ['lista', m.listas]]) {
    arr.forEach((a, i) => { zip.file(`${prefix}${PASTAS[tipo]}/${fileNameOf(a.meta, i + 1)}`, a.codigo); names.push(...a.parsed.midias); });
  }
  return names;
}
export async function exportMateria(m) {
  const JSZip = await loadZip();
  const zip = new JSZip();
  const names = addGroupFiles(zip, m);
  const missing = await addMedia(zip, names);
  download(`oficina-${slugify(m.nome, 40)}.zip`, await zip.generateAsync({ type: 'blob' }));
  if (missing.length) toast(`${plural(missing.length, 'mídia não encontrada', 'mídias não encontradas')} neste aparelho — o zip saiu sem elas.`, 5000);
}
export async function exportBackup() {
  rebuild();
  const JSZip = await loadZip();
  const zip = new JSZip();
  const names = [];
  for (const m of materias()) names.push(...addGroupFiles(zip, m, `${m.key}/`));
  // mídias que não estão em nenhum item também vão no backup
  try { const { idbKeys } = await import('./db.js'); names.push(...(await idbKeys('midia'))); } catch (e) {}
  const missing = await addMedia(zip, names);
  const ordem = Object.fromEntries(ITEMS.map((x) => [x.id, x.ordem]));
  zip.file('oficina-backup.json', JSON.stringify({ app: 'oficina', versao: 1, exportado: new Date().toISOString(), progresso: Store.state.progresso, perfil: { nome: Store.state.perfil.nome, tema: Store.state.perfil.tema, fonte: Store.state.perfil.fonte, vel: Store.state.perfil.vel }, ordem }, null, 1));
  const d = new Date();
  download(`oficina-backup-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.zip`, await zip.generateAsync({ type: 'blob' }));
  if (missing.length) toast(`${plural(missing.length, 'mídia não encontrada', 'mídias não encontradas')} — o backup saiu sem elas.`, 5000);
}

/** Exemplos que vêm com o app (pasta exemplos/). */
export async function exampleFiles() {
  const names = ['01-integrais-duplas-em-coordenadas-polares.txt', '01-essenciais-integrais-duplas.txt', '01-passo-a-passo-integrais-duplas.txt', '01-lista-integrais-duplas.txt', 'midia/calc3-polar-ponto.svg', 'midia/calc3-setor.svg', 'midia/calc3-elemento-area-polar.html'];
  const files = [];
  for (const n of names) {
    const r = await fetch('exemplos/' + n, { cache: 'no-cache' });
    if (!r.ok) throw new Error('Não encontrei exemplos/' + n);
    files.push(new File([await r.blob()], n.split('/').pop()));
  }
  return files;
}
