// =============================================================
//  Matemática: separa $...$ / $$...$$ do texto, desenha com KaTeX
//  e transforma LaTeX em fala (pt-BR) para o botão de ouvir.
// =============================================================
import katex from '../vendor/katex/katex.mjs';

/** Divide um texto em pedaços de texto comum e de matemática. \$ vira cifrão literal. */
export function splitMath(s) {
  const src = String(s ?? '');
  const out = [];
  let buf = '';
  let i = 0;
  const pushText = () => { if (buf) out.push({ math: false, text: buf.replace(/\\\$/g, '$') }); buf = ''; };
  while (i < src.length) {
    if (src[i] === '\\' && src[i + 1] === '$') { buf += '\\$'; i += 2; continue; }
    if (src[i] === '$') {
      const display = src[i + 1] === '$';
      const open = display ? 2 : 1;
      const close = display ? '$$' : '$';
      let j = i + open;
      let found = -1;
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue; }
        if (!display && src[j] === '\n' && src[j + 1] === '\n') break; // $ não atravessa parágrafo
        if (src.startsWith(close, j)) { found = j; break; }
        j++;
      }
      if (found > i + open - 1 && src.slice(i + open, found).trim()) {
        pushText();
        out.push({ math: true, display, tex: src.slice(i + open, found).trim() });
        i = found + open;
        continue;
      }
    }
    buf += src[i]; i++;
  }
  pushText();
  return out;
}

const cache = new Map();
export function tex2html(tex, display = false) {
  const k = (display ? 'D' : 'I') + tex;
  if (cache.has(k)) return cache.get(k);
  let h;
  try {
    h = katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: 'ignore', trust: false, output: 'htmlAndMathml' });
  } catch (e) {
    h = `<code class="tex-err" title="Erro no LaTeX">${escHtml(tex)}</code>`;
  }
  if (display) h = `<div class="math-d">${h}</div>`;
  cache.set(k, h);
  return h;
}

/** Erros de LaTeX (para os avisos da pré-visualização). */
export function texErrors(s) {
  const errs = [];
  for (const seg of splitMath(s)) {
    if (!seg.math) continue;
    try { katex.renderToString(seg.tex, { displayMode: seg.display, throwOnError: true, strict: 'ignore' }); }
    catch (e) { errs.push({ tex: seg.tex, msg: String(e.message || e).replace(/^KaTeX parse error:\s*/, '') }); }
  }
  return errs;
}

function escHtml(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/** Texto com **negrito**, *itálico* e matemática → HTML. */
export function mathInline(s) {
  return splitMath(s).map((seg) => {
    if (seg.math) return tex2html(seg.tex, seg.display);
    let t = escHtml(seg.text);
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*\w])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>');
    return t.replace(/\n/g, '<br>');
  }).join('');
}

/** Divide uma linha de tabela "| a | b |" sem quebrar o | de dentro de $...$. */
export function splitCells(line) {
  let t = line.trim().replace(/^\|/, '');
  if (t.endsWith('|') && !t.endsWith('\\|')) t = t.slice(0, -1);
  const cells = []; let cur = ''; let inMath = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === '\\' && t[i + 1]) { cur += c + t[i + 1]; i++; continue; }
    if (c === '$') inMath = !inMath;
    if (c === '|' && !inMath) { cells.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  cells.push(cur.trim());
  return cells;
}

// ---------------------------------------------------------------
//  LaTeX → fala
// ---------------------------------------------------------------
const GREEK = {
  alpha: 'alfa', beta: 'beta', gamma: 'gama', Gamma: 'gama maiúsculo', delta: 'delta', Delta: 'delta maiúsculo', epsilon: 'épsilon', varepsilon: 'épsilon',
  zeta: 'zeta', eta: 'eta', theta: 'teta', vartheta: 'teta', Theta: 'teta maiúsculo', iota: 'iota', kappa: 'capa', lambda: 'lambda', Lambda: 'lambda maiúsculo',
  mu: 'mi', nu: 'ni', xi: 'csi', Xi: 'csi maiúsculo', pi: 'pi', Pi: 'pi maiúsculo', rho: 'rô', varrho: 'rô', sigma: 'sigma', Sigma: 'sigma maiúsculo', tau: 'tau',
  upsilon: 'ípsilon', phi: 'fi', varphi: 'fi', Phi: 'fi maiúsculo', chi: 'qui', psi: 'psi', Psi: 'psi maiúsculo', omega: 'ômega', Omega: 'ômega maiúsculo',
};
const WORDS = {
  cdot: ' vezes ', times: ' vezes ', div: ' dividido por ', pm: ' mais ou menos ', mp: ' menos ou mais ',
  leq: ' menor ou igual a ', le: ' menor ou igual a ', geq: ' maior ou igual a ', ge: ' maior ou igual a ', neq: ' diferente de ', ne: ' diferente de ',
  approx: ' aproximadamente ', sim: ' semelhante a ', equiv: ' equivalente a ', propto: ' proporcional a ',
  infty: ' infinito ', to: ' tende a ', rightarrow: ' implica ', Rightarrow: ' implica ', implies: ' implica ', iff: ' se e somente se ', Leftrightarrow: ' se e somente se ',
  partial: ' d parcial ', nabla: ' nabla ', in: ' pertence a ', notin: ' não pertence a ', subset: ' contido em ', cup: ' união ', cap: ' interseção ',
  forall: ' para todo ', exists: ' existe ', degree: ' graus ', circ: ' graus ', ldots: ' reticências ', cdots: ' reticências ', dots: ' reticências ',
  sin: ' seno de ', cos: ' cosseno de ', tan: ' tangente de ', sec: ' secante de ', csc: ' cossecante de ', cot: ' cotangente de ',
  arcsin: ' arco seno de ', arccos: ' arco cosseno de ', arctan: ' arco tangente de ', sinh: ' seno hiperbólico de ', cosh: ' cosseno hiperbólico de ', tanh: ' tangente hiperbólica de ',
  ln: ' logaritmo natural de ', log: ' logaritmo de ', exp: ' exponencial de ', lim: ' limite ', max: ' máximo ', min: ' mínimo ', det: ' determinante de ',
  int: ' integral de ', iint: ' integral dupla de ', iiint: ' integral tripla de ', oint: ' integral de linha fechada de ', sum: ' somatório ', prod: ' produtório ',
  quad: ' ', qquad: ' ', ',': ' ', ';': ' ', '!': '', ' ': ' ', left: '', right: '', big: '', Big: '', bigg: '', Bigg: '', displaystyle: '', limits: '',
  mathrm: '', mathbf: '', mathit: '', text: '', textbf: '', operatorname: '', boldsymbol: '', mathcal: '', mathbb: '', hat: '', bar: '', tilde: '',
  perp: ' perpendicular a ', parallel: ' paralelo a ', angle: ' ângulo ', triangle: ' triângulo ', therefore: ' portanto ',
};

function readGroup(s, i) {
  // devolve [conteúdo, próximo índice] de {…} ou de um único token
  while (s[i] === ' ') i++;
  if (s[i] === '{') {
    let d = 0, j = i;
    for (; j < s.length; j++) { if (s[j] === '{') d++; else if (s[j] === '}') { d--; if (!d) break; } }
    return [s.slice(i + 1, j), j + 1];
  }
  if (s[i] === '\\') { const m = s.slice(i).match(/^\\([a-zA-Z]+|.)/); return [m[0], i + m[0].length]; }
  return [s[i] || '', i + 1];
}

export function texToSpeech(tex) {
  let s = String(tex ?? '').replace(/(^|[^a-zA-Z\\])d(?=[a-zA-Z]\b|\\[a-zA-Z]+)/g, '$1 d ');
  // estruturas com argumentos
  const struct = (name, fn, nargs) => {
    let idx;
    while ((idx = s.indexOf('\\' + name)) >= 0) {
      const after = idx + name.length + 1;
      if (/[a-zA-Z]/.test(s[after] || '')) { s = s.slice(0, idx) + '\u0001' + s.slice(idx + 1); continue; } // outro comando com prefixo igual
      let i = after; const args = [];
      if (name === 'sqrt' && s[i] === '[') { const j = s.indexOf(']', i); args.push(s.slice(i + 1, j)); i = j + 1; } else if (name === 'sqrt') args.push('');
      for (let k = 0; k < nargs; k++) { const [g, n] = readGroup(s, i); args.push(g); i = n; }
      s = s.slice(0, idx) + ' ' + fn(...args) + ' ' + s.slice(i);
    }
    s = s.replace(/\u0001/g, '\\');
  };
  struct('frac', (a, b) => `fração ${texToSpeech(a)} sobre ${texToSpeech(b)} fim da fração`, 2);
  struct('dfrac', (a, b) => `fração ${texToSpeech(a)} sobre ${texToSpeech(b)} fim da fração`, 2);
  struct('tfrac', (a, b) => `${texToSpeech(a)} sobre ${texToSpeech(b)}`, 2);
  struct('sqrt', (n, a) => (n ? `raiz ${n === '3' ? 'cúbica' : 'de índice ' + texToSpeech(n)} de ${texToSpeech(a)}` : `raiz quadrada de ${texToSpeech(a)}`), 1);
  struct('vec', (a) => `vetor ${texToSpeech(a)}`, 1);
  struct('overline', (a) => `${texToSpeech(a)} barra`, 1);
  struct('dot', (a) => `${texToSpeech(a)} ponto`, 1);
  struct('text', (a) => a, 1);
  struct('mathrm', (a) => a, 1);
  struct('operatorname', (a) => a, 1);
  // integrais, somatórios e limites com extremos
  const G = String.raw`(\{(?:[^{}]|\{[^{}]*\})*\}|\\[a-zA-Z]+|[a-zA-Z0-9])`;
  const un = (g) => (g ? texToSpeech(g.replace(/^\{|\}$/g, '')) : '');
  const OPN = { int: 'integral', iint: 'integral dupla', iiint: 'integral tripla', oint: 'integral de linha', sum: 'somatório', prod: 'produtório' };
  s = s.replace(new RegExp(String.raw`\\(iiint|iint|oint|int|sum|prod)(?![a-zA-Z])\s*(?:\\limits\s*)?(?:_\s*${G})?\s*(?:\^\s*${G})?`, 'g'), (m, op, lo, hi) => {
    if (lo && hi) return ` ${OPN[op]} de ${un(lo)} até ${un(hi)} de `;
    if (lo) return ` ${OPN[op]} sobre ${un(lo)} de `;
    return ` ${OPN[op]} de `;
  });
  s = s.replace(new RegExp(String.raw`\\lim(?![a-zA-Z])\s*(?:_\s*${G})?`, 'g'), (m, lo) => (lo ? ` limite quando ${un(lo)} de ` : ' limite de '));
  // potências e índices
  s = s.replace(/\^\s*(\{[^{}]*\}|\\?[a-zA-Z0-9]+|.)/g, (m, g) => {
    const v = g.replace(/^\{|\}$/g, '').trim();
    if (v === '2') return ' ao quadrado ';
    if (v === '3') return ' ao cubo ';
    if (v === '\\circ' || v === 'o') return ' graus ';
    if (v === "'" || v === '\\prime') return ' linha ';
    if (v === 'T') return ' transposta ';
    return ` elevado a ${texToSpeech(v)} `;
  });
  s = s.replace(/_\s*(\{[^{}]*\}|\\?[a-zA-Z0-9]+|.)/g, (m, g) => ` ${texToSpeech(g.replace(/^\{|\}$/g, ''))} `);
  s = s.replace(/\\begin\{[^}]*\}|\\end\{[^}]*\}/g, ' ').replace(/\\\\/g, ', ').replace(/&/g, ' ');
  s = s.replace(/\\([a-zA-Z]+)/g, (m, c) => (GREEK[c] ? ` ${GREEK[c]} ` : WORDS[c] != null ? WORDS[c] : ` ${c} `));
  s = s.replace(/\\([,;!: ])/g, ' ');
  s = s.replace(/'/g, ' linha ');
  s = s.replace(/\s*=\s*/g, ' igual a ').replace(/\s*\+\s*/g, ' mais ').replace(/(\S)\s*-\s*/g, '$1 menos ').replace(/^\s*-\s*/, ' menos ');
  s = s.replace(/</g, ' menor que ').replace(/>/g, ' maior que ').replace(/\//g, ' sobre ').replace(/\*/g, ' vezes ');
  s = s.replace(/\(/g, ' abre parênteses ').replace(/\)/g, ' fecha parênteses ').replace(/\|/g, ' módulo ');
  s = s.replace(/[{}\[\]]/g, ' ');
  s = s.replace(/(\d),(\d)/g, '$1 vírgula $2');
  return s.replace(/\s+/g, ' ').trim();
}

/** Texto com matemática → texto para ler em voz alta. */
export function speakable(s) {
  return splitMath(s).map((seg) => (seg.math ? ' ' + texToSpeech(seg.tex) + ' ' : seg.text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')))
    .join('').replace(/\s+/g, ' ').trim();
}
