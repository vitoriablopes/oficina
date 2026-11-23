// =============================================================
//  Parser do formato da Oficina (.txt) → aula ou lista
//  Também roda em Node (para testes).
// =============================================================
import { splitCells, texErrors } from './math.js';

export const BLOCK_TYPES = {
  explicacao: { label: 'Explicação', icon: '✎' },
  formula:    { label: 'Fórmula',    icon: '∑' },
  exemplo:    { label: 'Exemplo resolvido', icon: '✦' },
  checagem:   { label: 'Checagem',   icon: '?' },
  resumo:     { label: 'Resumo',     icon: '✓' },
  exercicio:  { label: 'Exercício',  icon: '✐' },
  secao:      { label: 'Essencial',  icon: '◆' },
  questao:    { label: 'Tipo de questão', icon: '↳' },
};
export const TIPOS = { aula: 'aula', lista: 'lista', essencial: 'essenciais', passos: 'passo a passo' };
export const PASTAS = { aula: 'aulas', lista: 'listas', essencial: 'essenciais', passos: 'passo-a-passo' };

const TYPE_ALIASES = {
  explicacao: 'explicacao', teoria: 'explicacao', conceito: 'explicacao', texto: 'explicacao', introducao: 'explicacao', nota: 'explicacao', observacao: 'explicacao', dica: 'explicacao',
  formula: 'formula', formulas: 'formula', equacao: 'formula', equacoes: 'formula',
  exemplo: 'exemplo', exemploresolvido: 'exemplo', exemplos: 'exemplo',
  checagem: 'checagem', checagens: 'checagem', check: 'checagem', pergunta: 'checagem', verificacao: 'checagem', exercicio: 'exercicio', exercicios: 'exercicio', questao: 'exercicio', problema: 'exercicio',
  resumo: 'resumo', sintese: 'resumo', revisao: 'resumo',
  subtopico: 'secao', secao: 'secao', essencial: 'secao', essenciais: 'secao', geral: 'secao', topico: 'secao',
  tipodequestao: 'questao', tipo: 'questao', questaotipo: 'questao', passoapasso: 'questao',
};

const FIELDS = {
  formula: { leitura: 'leitura', fala: 'leitura', pronuncia: 'leitura', topico: 'topico', assunto: 'topico', subtopico: 'subtopico', subassunto: 'subtopico', descricao: 'descricao' },
  exemplo: { enunciado: 'enunciado', problema: 'enunciado', pergunta: 'enunciado', resolucao: 'resolucao', solucao: 'resolucao', resposta: 'resposta' },
  checagem: { topico: 'topico', assunto: 'topico', subtopico: 'subtopico', subassunto: 'subtopico', descricao: 'descricao', objetivo: 'descricao', pergunta: 'pergunta', enunciado: 'pergunta', questao: 'pergunta', dica: 'dica', pista: 'dica', formula: 'formula', formulas: 'formula', formulautil: 'formula', formulasuteis: 'formula', resposta: 'resposta', gabarito: 'resposta', resolucao: 'resolucao', solucao: 'resolucao' },
  exercicio: { topico: 'topico', assunto: 'topico', subtopico: 'subtopico', subassunto: 'subtopico', descricao: 'descricao', objetivo: 'descricao', origem: 'origem', fonte: 'origem', enunciado: 'enunciado', pergunta: 'enunciado', questao: 'enunciado', problema: 'enunciado', dica: 'dica', pista: 'dica', formula: 'formula', formulas: 'formula', formulautil: 'formula', formulasuteis: 'formula', resposta: 'resposta', gabarito: 'resposta', resolucao: 'resolucao', solucao: 'resolucao' },
};
FIELDS.questao = { subtopico: 'subtopico', subassunto: 'subtopico', quando: 'quando', reconhecer: 'quando', comoreconhecer: 'quando', quandousar: 'quando', passos: 'passos', passo: 'passos', metodo: 'passos', roteiro: 'passos', formula: 'formula', formulas: 'formula', cuidado: 'cuidado', cuidados: 'cuidado', errocomum: 'cuidado', erroscomuns: 'cuidado', armadilhas: 'cuidado', atencao: 'cuidado', exemplo: 'exemplo', exemploresolvido: 'exemplo' };
const MAIN_FIELD = { exemplo: 'enunciado', checagem: 'pergunta', exercicio: 'enunciado', questao: 'passos' };

const META_ALIASES = {
  tipo: 'tipo', formato: 'tipo', id: 'id', codigo: 'id',
  materia: 'materia', disciplina: 'materia', curso: 'materia', cadeira: 'materia',
  titulo: 'titulo', title: 'titulo', nome: 'titulo',
  tags: 'tags', tag: 'tags', etiquetas: 'tags', topicos: 'tags', temas: 'tags',
  tempo: 'tempo', duracao: 'tempo',
  descricao: 'descricao', objetivo: 'descricao', resumo: 'descricao',
  ordem: 'ordem', posicao: 'ordem',
  topico: 'topico', assunto: 'topico', subtopico: 'subtopico', subassunto: 'subtopico',
};

export function deaccent(s) { return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, ''); }
export function keyOf(s) { return deaccent(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
export const slugify = (s, n = 60) => keyOf(s).slice(0, n).replace(/-$/, '') || 'item';
const fkey = (s) => keyOf(s).replace(/-/g, '');

/** Nome de arquivo de mídia normalizado (sem pastas, minúsculas). */
export function mediaKey(name) {
  const base = String(name ?? '').trim().split(/[\\/]/).pop();
  return deaccent(base).toLowerCase().replace(/\s+/g, '-');
}
export const MEDIA_EXT = /\.(png|jpe?g|gif|svg|webp|html?)$/i;
export const isHtmlName = (n) => /\.html?$/i.test(n);

/** Tira do texto os arquivos colados no formato === ARQUIVO: nome === … === FIM DO ARQUIVO === */
export function extractFiles(text) {
  const files = [];
  const re = /^[ \t]*={3,}\s*ARQUIVO\s*:\s*(.+?)\s*={3,}[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*={3,}\s*FIM DO ARQUIVO\s*={3,}[ \t]*$/gim;
  const rest = String(text ?? '').replace(re, (m, name, body) => {
    files.push({ name: mediaKey(name), content: body.replace(/^```[\w-]*\s*\n|\n```\s*$/g, '') });
    return '';
  });
  return { text: rest, files };
}

const MARKER = /^\[\s*(figura|imagem|img|interativo|simulacao|simulação|grafico interativo|html)\s*:\s*([^\]|]+?)\s*(?:\|\s*([^\]]*?))?\s*\]$/i;

// -------------------------------------------------------------
export function parseItem(source, opts = {}) {
  const warnings = [];
  const warn = (line, msg, level = 'aviso') => warnings.push({ line, msg, level });
  const raw = String(source ?? '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').replace(/\t/g, '  ').split('\n');
  const lines = raw.map((text, i) => ({ text: text.replace(/\s+$/, ''), n: i + 1 }))
    .filter((l) => !/^\s*\/\//.test(l.text) && !/^\s*```[\w-]*\s*$/.test(l.text));

  const meta = { tipo: '', id: '', materia: '', titulo: '', tags: [], tempo: null, descricao: '', ordem: null, topico: '', subtopico: '' };
  const blocks = [];
  let cur = null;

  for (const l of lines) {
    const t = l.text.trim();
    const bm = t.match(/^==\s*([^|=][^|]*?)\s*(?:\|\s*(.*?))?\s*$/);
    if (bm && !t.startsWith('===')) {
      const k = fkey(bm[1]);
      let type = TYPE_ALIASES[k];
      if (!type) { warn(l.n, `Tipo de bloco desconhecido "${bm[1]}" — mostrado como Explicação.`); type = 'explicacao'; }
      cur = { type, title: (bm[2] || '').trim(), line: l.n, lines: [] };
      blocks.push(cur);
      continue;
    }
    if (!cur) {
      if (!t) continue;
      const mm = t.match(/^@\s*([\wÀ-ÿ\- ]+?)\s*:\s*(.*)$/);
      if (mm) {
        const key = META_ALIASES[fkey(mm[1])];
        const val = mm[2].trim();
        if (!key) { warn(l.n, `Metadado desconhecido "@${mm[1]}" ignorado.`); continue; }
        if (key === 'tags') meta.tags = [...meta.tags, ...val.split(/[,;]/).map((x) => x.trim().toLowerCase()).filter(Boolean)];
        else if (key === 'tempo' || key === 'ordem') meta[key] = parseFloat(val.replace(',', '.')) || null;
        else if (key === 'tipo') {
          const v = fkey(val);
          meta.tipo = /^(lista|listas|listadeexercicios|exercicios)/.test(v) ? 'lista' : /^(aula|aulas|licao)/.test(v) ? 'aula'
            : /^(essencial|essenciais|resumoessencial)/.test(v) ? 'essencial' : /^(passoapasso|passos|passoapassos|roteiro|roteiros|metodo)/.test(v) ? 'passos' : '';
          if (!meta.tipo) warn(l.n, `@tipo "${val}" não reconhecido — use "aula", "lista", "essencial" ou "passo-a-passo".`, 'erro');
        } else meta[key] = val;
      } else warn(l.n, 'Linha antes do primeiro bloco foi ignorada (os blocos começam com "== TIPO | título").');
      continue;
    }
    cur.lines.push(l);
  }

  if (opts.tipo && !meta.tipo) meta.tipo = opts.tipo;
  if (!meta.tipo) meta.tipo = blocks.length && blocks.every((b) => b.type === 'exercicio') ? 'lista' : 'aula';
  meta.tags = [...new Set(meta.tags)];
  if (!meta.materia) warn(1, 'Falta "@materia:" — o item vai para "Sem matéria".');
  if ((meta.tipo === 'essencial' || meta.tipo === 'passos') && !meta.topico) warn(1, 'Falta "@topico:" (essenciais e passo a passo são organizados por tópico).');
  if (!meta.titulo && meta.topico && (meta.tipo === 'essencial' || meta.tipo === 'passos')) meta.titulo = meta.topico;
  if (!meta.titulo) warn(1, 'Falta "@titulo:".');
  if (!meta.id) {
    meta.id = (meta.materia ? slugify(meta.materia, 14) + '-' : '') + slugify(meta.titulo || 'sem-titulo', 50);
    warn(1, `Falta "@id:" — usei "${meta.id}".`);
  } else meta.id = slugify(meta.id, 80);
  meta.materia ||= 'Sem matéria';
  meta.materiaKey = keyOf(meta.materia);
  meta.titulo ||= 'Sem título';

  const midias = new Set();
  const out = [];
  blocks.forEach((b) => {
    if (meta.tipo === 'essencial') b.type = 'secao';
    if (meta.tipo === 'passos') b.type = 'questao';
    if (meta.tipo === 'aula' && b.type === 'exercicio') b.type = 'checagem';
    if (meta.tipo === 'lista' && b.type !== 'exercicio') {
      if (b.type === 'checagem') b.type = 'exercicio';
      else { warn(b.line, `Listas só têm blocos "== EXERCICIO" — o bloco ${BLOCK_TYPES[b.type].label} foi ignorado.`); return; }
    }
    const data = parseBlock(b, warn, midias);
    if (data.empty) { warn(b.line, `Bloco ${BLOCK_TYPES[b.type].label}${b.title ? ' "' + b.title + '"' : ''} está vazio — ignorado.`); return; }
    const blk = { type: b.type, title: b.title, line: b.line, ...data };
    if (blk.type === 'questao' && !blk.subtopico) blk.subtopico = meta.subtopico;
    out.push(blk);
  });
  out.forEach((b, i) => (b.idx = i));

  if (!out.length) warn(1, { lista: 'Nenhum exercício encontrado ("== EXERCICIO | 1").', essencial: 'Nenhuma seção encontrada ("== SUBTOPICO | nome").', passos: 'Nenhum tipo de questão encontrado ("== QUESTAO | nome").' }[meta.tipo] || 'Nenhum bloco encontrado ("== EXPLICACAO | título").', 'erro');

  // LaTeX com erro
  for (const l of lines) {
    if (!l.text.includes('$')) continue;
    for (const e of texErrors(l.text)) warn(l.n, `Erro no LaTeX "${e.tex.slice(0, 40)}": ${e.msg}`);
  }

  const formulas = meta.tipo === 'aula' ? out.filter((b) => b.type === 'formula') : [];
  return { meta, blocks: out, formulas, midias: [...midias], warnings: warnings.sort((a, b) => a.line - b.line), ok: !warnings.some((w) => w.level === 'erro') };
}

// ---------- blocos ----------
function parseBlock(b, warn, midias) {
  const fieldMap = FIELDS[b.type];
  if (!fieldMap) {
    const nodes = parseRich(b.lines, warn, midias);
    return { nodes, empty: !nodes.length };
  }
  const groups = { _: [] };
  let curF = '_';
  for (const l of b.lines) {
    const m = l.text.trim().match(/^@\s*([\wÀ-ÿ]+)\s*:\s*(.*)$/);
    if (m) {
      const f = fieldMap[fkey(m[1])];
      if (f) {
        curF = f; (groups[f] ||= []);
        if (m[2].trim()) groups[f].push({ text: m[2], n: l.n });
        if (['leitura', 'topico', 'subtopico', 'descricao', 'origem'].includes(f) && m[2].trim()) curF = b.type === 'questao' ? 'passos' : '_'; // campos de uma linha só
        continue;
      }
      warn(l.n, `Campo "@${m[1]}" não existe em ${BLOCK_TYPES[b.type].label} — tratado como texto.`);
    }
    (groups[curF] ||= []).push(l);
  }
  const rich = (k) => (groups[k]?.length ? parseRich(groups[k], warn, midias) : []);
  const plainText = (k) => (groups[k] || []).map((l) => l.text.trim()).filter(Boolean).join(' ');

  if (b.type === 'formula') {
    const nodes = rich('_');
    return { nodes, leitura: plainText('leitura'), topico: plainText('topico'), subtopico: plainText('subtopico'), descricao: plainText('descricao'), empty: !nodes.length };
  }
  if (b.type === 'questao') {
    if (groups._.some((l) => l.text.trim())) groups.passos = [...groups._, ...(groups.passos || [])];
    const d = { subtopico: plainText('subtopico'), quando: rich('quando'), passos: rich('passos'), formula: rich('formula'), cuidado: rich('cuidado'), exemplo: rich('exemplo') };
    if (!d.passos.length) { warn(b.line, 'Tipo de questão sem "@passos:".', 'erro'); return { empty: true }; }
    return { ...d, empty: false };
  }
  const main = MAIN_FIELD[b.type];
  // texto solto antes do primeiro campo conta como enunciado/pergunta
  if (groups._.some((l) => l.text.trim())) { groups[main] = [...groups._, ...(groups[main] || [])]; }
  const d = { [main]: rich(main), resposta: rich('resposta'), resolucao: rich('resolucao') };
  if (b.type !== 'exemplo') { d.dica = rich('dica'); d.formula = rich('formula'); }
  if (b.type === 'checagem') { d.topico = plainText('topico'); d.subtopico = plainText('subtopico'); d.descricao = plainText('descricao'); }
  if (b.type === 'exercicio') {
    d.origem = plainText('origem'); d.topico = plainText('topico'); d.subtopico = plainText('subtopico'); d.descricao = plainText('descricao');
    if (!d.topico) warn(b.line, 'Exercício sem "@topico:" (o filtro por tópico da lista não vai encontrá-lo).');
  }
  if (!d[main].length) { warn(b.line, `${BLOCK_TYPES[b.type].label} sem "@${main}:".`, b.type === 'exemplo' ? 'aviso' : 'erro'); return { empty: true }; }
  if (b.type !== 'exemplo' && !d.resposta.length && !d.resolucao.length) warn(b.line, `${BLOCK_TYPES[b.type].label} sem "@resposta:" nem "@resolucao:".`);
  return { ...d, empty: false };
}

/** Texto rico: parágrafos, ### subtítulo, listas, tabelas, ! dica, !! atenção, $$…$$, [figura:…], [interativo:…] */
export function parseRich(lines, warn = () => {}, midias = new Set()) {
  const nodes = [];
  let para = null, list = null, table = null;
  const flush = () => { para = null; list = null; table = null; };
  for (let k = 0; k < lines.length; k++) {
    const l = lines[k];
    const t = l.text.trim();
    if (!t) { flush(); continue; }
    let m;
    // matemática em destaque, possivelmente em várias linhas
    if (t.startsWith('$$')) {
      const inner = t.slice(2);
      const close = inner.indexOf('$$');
      if (close >= 0) {
        if (!inner.slice(close + 2).trim() && inner.slice(0, close).trim()) { flush(); nodes.push({ k: 'math', tex: inner.slice(0, close).trim() }); continue; }
      } else {
        const buf = [inner];
        let j = k + 1, closed = false;
        for (; j < lines.length; j++) {
          const tj = lines[j].text;
          const idx = tj.indexOf('$$');
          if (idx >= 0) { buf.push(tj.slice(0, idx)); closed = true; break; }
          buf.push(tj);
        }
        if (closed) { flush(); nodes.push({ k: 'math', tex: buf.join('\n').trim() }); k = j; continue; }
        warn(l.n, '"$$" aberto e não fechado.');
      }
    }
    if ((m = t.match(MARKER))) {
      flush();
      const kind = /^(figura|imagem|img)$/i.test(m[1]) ? 'fig' : 'inter';
      const name = mediaKey(m[2]);
      const rest = (m[3] || '').split('|').map((x) => x.trim()).filter((x) => x !== '');
      let altura = null;
      if (kind === 'inter' && rest.length && /^\d{2,4}\s*(px)?$/i.test(rest[0])) altura = parseInt(rest.shift(), 10);
      if (kind === 'fig' && rest.length && /^\d{2,3}\s*%$/.test(rest[0])) rest.shift();
      if (kind === 'inter' && !/\.html?$/i.test(name)) warn(l.n, `Interativo "${name}" deveria ser um arquivo .html.`);
      if (kind === 'fig' && !/\.(png|jpe?g|gif|svg|webp)$/i.test(name)) warn(l.n, `Figura "${name}" deveria ser .png, .jpg, .svg, .gif ou .webp.`);
      midias.add(name);
      nodes.push({ k: kind, name, legenda: rest.join(' | '), altura });
      continue;
    }
    if ((m = t.match(/^#{1,4}\s+(.*)$/))) { flush(); nodes.push({ k: 'h', text: m[1] }); continue; }
    if ((m = t.match(/^!!\s*(.*)$/))) { flush(); nodes.push({ k: 'warn', text: m[1] }); continue; }
    if ((m = t.match(/^!\s+(.*)$/))) { flush(); nodes.push({ k: 'tip', text: m[1] }); continue; }
    if (t.startsWith('|') && t.length > 1) {
      para = null; list = null;
      const cells = splitCells(t);
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) { if (table && table.rows.length === 1) table.head = true; continue; }
      if (!table) { table = { k: 'table', rows: [], head: false }; nodes.push(table); }
      table.rows.push(cells); continue;
    }
    if ((m = t.match(/^(?:[-•·]|\d{1,3}[.)])\s+(.*)$/))) {
      para = null; table = null;
      const ordered = /^\d/.test(t);
      if (!list || list.ordered !== ordered) { list = { k: 'list', ordered, items: [], start: ordered ? parseInt(t, 10) : 1 }; nodes.push(list); }
      list.items.push(m[1]); continue;
    }
    if (list && /^\s{2,}\S/.test(l.text)) { list.items[list.items.length - 1] += '\n' + t; continue; } // continuação de item
    list = null; table = null;
    if (!para) { para = { k: 'p', lines: [] }; nodes.push(para); }
    para.lines.push(t);
  }
  return nodes;
}

/** Texto corrido dos nós (para o áudio e as buscas). */
export function nodesText(nodes) {
  return (nodes || []).map((n) => {
    switch (n.k) {
      case 'p': return n.lines.join(' ');
      case 'h': case 'tip': case 'warn': return n.text;
      case 'math': return '$$' + n.tex + '$$';
      case 'list': return n.items.join('. ');
      case 'table': return n.rows.map((r) => r.join(', ')).join('. ');
      case 'fig': return n.legenda ? 'Figura: ' + n.legenda : '';
      case 'inter': return 'Há uma visualização interativa aqui' + (n.legenda ? ': ' + n.legenda : '') + '.';
      default: return '';
    }
  }).filter(Boolean).join('. ');
}

/** Nome sugerido de arquivo para exportar: 01-titulo.txt */
export const fileNameOf = (meta, n) => `${String(n).padStart(2, '0')}-${slugify(meta.titulo, 50)}.txt`;
/** Prefixo numérico de um nome de arquivo (para a ordem do zip). */
export function filePrefix(name) {
  const m = String(name).split(/[\\/]/).pop().match(/^(\d{1,4})[\s._-]/);
  return m ? parseInt(m[1], 10) : null;
}
