// Texto rico → HTML, e figuras/interativos carregados do banco de mídias.
import { mathInline, tex2html, speakable } from './math.js';
import { nodesText, isHtmlName } from './parser.js';
import { esc, modal } from './util.js';
import { getMedia } from './store.js';

export const inl = (s) => mathInline(s);

export function richHtml(nodes) {
  return `<div class="rich">${(nodes || []).map((n) => {
    switch (n.k) {
      case 'h': return `<h3>${inl(n.text)}</h3>`;
      case 'p': return `<p>${inl(n.lines.join('\n'))}</p>`;
      case 'math': return tex2html(n.tex, true);
      case 'tip': return `<div class="callout tip"><span class="ic">✧</span><div>${inl(n.text)}</div></div>`;
      case 'warn': return `<div class="callout warn"><span class="ic">!</span><div>${inl(n.text)}</div></div>`;
      case 'list': return `<${n.ordered ? `ol${n.start > 1 ? ` start="${n.start}"` : ''}` : 'ul'}>${n.items.map((i) => `<li>${inl(i)}</li>`).join('')}</${n.ordered ? 'ol' : 'ul'}>`;
      case 'table': {
        const rows = n.rows.map((r, i) => { const tag = n.head && i === 0 ? 'th' : 'td'; return `<tr>${r.map((c) => `<${tag}>${inl(c)}</${tag}>`).join('')}</tr>`; });
        return `<div class="tbl-wrap"><table>${rows.join('')}</table></div>`;
      }
      case 'fig': return `<figure class="fig" data-midia="${esc(n.name)}"><div class="media-ph">Carregando figura…</div>${n.legenda ? `<figcaption>${inl(n.legenda)}</figcaption>` : ''}</figure>`;
      case 'inter': return `<figure class="inter" data-inter="${esc(n.name)}" data-h="${n.altura || 400}"><div class="inter-bar"><span class="caps">Interativo</span><button type="button" class="icon-btn sm" data-full title="Tela cheia">⤢</button></div><div class="media-ph" style="height:${n.altura || 400}px">Carregando interativo…</div>${n.legenda ? `<figcaption>${inl(n.legenda)}</figcaption>` : ''}</figure>`;
    }
    return '';
  }).join('')}</div>`;
}

/** Texto para ler em voz alta. */
export const speechOf = (nodes) => speakable(nodesText(nodes));

const missing = (name, kind) => `<div class="img-missing">${kind === 'fig' ? 'Figura' : 'Interativo'} <b>${esc(name)}</b> não encontrado.<br><span class="tiny">Importe o arquivo em Estúdio › Importar (junto com a aula ou depois).</span></div>`;

function frame(html, h) {
  const f = document.createElement('iframe');
  f.setAttribute('sandbox', 'allow-scripts allow-pointer-lock');
  f.setAttribute('loading', 'lazy');
  f.setAttribute('title', 'Visualização interativa');
  f.style.height = h + 'px';
  f.srcdoc = html;
  return f;
}

/** Troca os marcadores de figura/interativo dentro de el pelas mídias de verdade. */
/** Fórmulas em destaque largas demais: diminui a letra (até 70%) antes de precisar rolar. */
export function fitMath(el) {
  const run = () => el.querySelectorAll('.math-d').forEach((d) => {
    d.style.fontSize = '';
    const w = d.clientWidth, sw = d.scrollWidth;
    if (w && sw > w + 2) d.style.fontSize = Math.max(0.6, (w - 6) / sw) * 100 + '%';
  });
  requestAnimationFrame(run);
  document.fonts?.ready.then(() => requestAnimationFrame(run));
}
let rt;
window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => fitMath(document.body), 200); });
export function hydrate(el, { media } = {}) {
  fitMath(el);
  el.querySelectorAll('figure.fig[data-midia]:not([data-ok])').forEach(async (fg) => {
    fg.dataset.ok = 1;
    const name = fg.dataset.midia;
    const m = media?.get?.(name) || await getMedia(name);
    const ph = fg.querySelector('.media-ph');
    if (!m || isHtmlName(name)) { ph.outerHTML = missing(name, 'fig'); return; }
    const img = document.createElement('img');
    img.src = m.dados; img.alt = fg.querySelector('figcaption')?.textContent || name; img.loading = 'lazy';
    img.onclick = () => modal(`<div class="zoom"><img src="${m.dados}" alt=""></div>${fg.querySelector('figcaption') ? `<p class="small muted" style="margin:10px 0 0">${fg.querySelector('figcaption').innerHTML}</p>` : ''}<div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn sm" data-close>Fechar</button></div>`, null, { wide: true });
    ph.replaceWith(img);
  });
  el.querySelectorAll('figure.inter[data-inter]:not([data-ok])').forEach(async (fg) => {
    fg.dataset.ok = 1;
    const name = fg.dataset.inter, h = +fg.dataset.h || 400;
    const m = media?.get?.(name) || await getMedia(name);
    const ph = fg.querySelector('.media-ph');
    if (!m || !isHtmlName(name)) { ph.outerHTML = missing(name, 'inter'); fg.querySelector('[data-full]')?.remove(); return; }
    ph.replaceWith(frame(m.dados, h));
    fg.querySelector('[data-full]').onclick = () => modal(`<div class="row between" style="margin-bottom:8px"><span class="caps muted">Interativo</span><button class="btn sm" data-close>Fechar</button></div><div class="inter-full"></div>`, (box) => {
      box.querySelector('.inter-full').appendChild(frame(m.dados, Math.round(window.innerHeight * 0.78)));
    }, { wide: true });
  });
}
