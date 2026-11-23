// Service worker: deixa o app instalável e funcionando offline.
const CACHE = 'oficina-v11';
const SHELL = ['./', 'index.html', 'css/app.css', 'css/fonts.css', 'vendor/katex/katex.min.css', 'vendor/katex/katex.mjs', 'vendor/jszip.min.js',
  'fonts/eb-garamond-latin-400-normal.woff2', 'fonts/cormorant-garamond-latin-600-normal.woff2', 'vendor/katex/fonts/KaTeX_Main-Regular.woff2', 'vendor/katex/fonts/KaTeX_Math-Italic.woff2',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png',
  'js/app.js', 'js/config.js', 'js/parser.js', 'js/math.js', 'js/store.js', 'js/db.js', 'js/speech.js', 'js/util.js', 'js/data.js', 'js/render.js',
  'js/aula.js', 'js/lista.js', 'js/banco.js', 'js/matcfg.js', 'js/acomp.js', 'js/focus.js', 'js/studio.js', 'js/importer.js', 'js/sortable.js', 'js/prompts.js'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Firebase, CDNs dos interativos etc.: direto na rede
  // Rede primeiro (conteúdo sempre atualizado), cache como reserva offline.
  e.respondWith(fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
