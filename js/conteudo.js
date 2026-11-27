// Editar o conteúdo de uma matéria: tirar aulas, essenciais, passo a passo, listas
// e partes de dentro delas (exercícios de uma lista, seções, questões, blocos de aula).
import { Store, saveItem, deleteItem, save } from './store.js';
import { rebuild, materiaByKey } from './data.js';
import { BLOCK_TYPES } from './parser.js';
import { modal, esc, plural, toast, confirmBox } from './util.js';
import { inl } from './render.js';

const isBlockLine = (l) => /^\s*==\s*[^=\s]/.test(l) && !/^\s*===/.test(l);

/** Código sem o bloco idx (listas: renumera os exercícios numerados). */
export function codigoSemBloco(it, idx) {
  const lines = String(it.codigo).replace(/\r\n?/g, '\n').split('\n');
  const b = it.parsed.blocks[idx];
  const start = b.line - 1;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) if (isBlockLine(lines[i])) { end = i; break; }
  lines.splice(start, end - start);
  let out = lines.join('\n').replace(/\n{3,}/g, '\n\n');
  if (it.tipo === 'lista') {
    let n = 1;
    out = out.split('\n').map((l) => {
      if (!isBlockLine(l)) return l;
      const m = l.match(/^(\s*==\s*[^|]+?)\s*(?:\|\s*(.*?))?\s*$/);
      if (!m) return l;
      const t = (m[2] || '').trim();
      if (/^\d+$/.test(t)) return `${m[1].trim()} | ${n++}`;
      n++; return l;
    }).join('\n');
  }
  return out;
}

/** Ajusta o progresso, os salvos, as tags e o passo a passo depois de tirar o bloco r do item id. */
export function remapProgresso(id, r) {
  const P = Store.state.progresso;
  const sh = (i) => (i < r ? i : i > r ? i - 1 : null);
  const remapObj = (o) => { const out = {}; for (const [k, v] of Object.entries(o || {})) { const j = sh(+k); if (j != null) out[j] = v; } return out; };
  const a = P.aulas?.[id];
  if (a) {
    a.feitos = (a.feitos || []).map(sh).filter((x) => x != null);
    a.chk = remapObj(a.chk); a.chkErros = remapObj(a.chkErros);
    if (a.passo != null && a.passo > r) a.passo--;
  }
  const l = P.listas?.[id];
  if (l) { l.fila = (l.fila || []).map(sh).filter((x) => x != null); l.res = remapObj(l.res); }
  for (const map of [P.salvos, P.tags, P.passos]) {
    if (!map) continue;
    const mine = Object.keys(map).map((k) => [k, k.match(/^(.*)#(\d+)$/)]).filter(([, m]) => m && m[1] === id);
    const vals = mine.map(([k, m]) => [+m[2], map[k]]);
    mine.forEach(([k]) => delete map[k]);
    for (const [i, v] of vals) { const j = sh(i); if (j != null) map[id + '#' + j] = v; }
  }
  save('progresso');
}

export async function tirarBloco(it, idx) {
  const codigo = codigoSemBloco(it, idx);
  await saveItem({ id: it.id, codigo }, { silent: true });
  remapProgresso(it.id, idx);
  rebuild();
}

const TIPOS = [['aulas', 'Aulas', 'aula'], ['essenciais', 'Essenciais', 'essencial'], ['passos', 'Passo a passo', 'passos'], ['listas', 'Listas', 'lista']];
const NOME_PARTE = { aula: ['parte', 'partes'], essencial: ['seção', 'seções'], passos: ['tipo de questão', 'tipos de questão'], lista: ['exercício', 'exercícios'] };

function parteLabel(it, b, i) {
  const T = BLOCK_TYPES[b.type] || { label: b.type, icon: '•' };
  if (it.tipo === 'lista') return `<b>${esc(b.title || String(i + 1))}.</b> ${b.topico ? `<span class="muted">${esc(b.topico)}${b.subtopico ? ' › ' + esc(b.subtopico) : ''}</span> ` : ''}${b.descricao ? '— ' + inl(b.descricao) : ''}`;
  if (it.tipo === 'aula') return `<span class="muted">${T.label}</span>${b.title ? ' · ' + inl(b.title) : ''}`;
  return inl(b.title || T.label);
}

/** Modal com tudo o que a matéria tem, para tirar itens inteiros ou partes. */
export function openConteudo(mkey, { after } = {}) {
  let aberto = new Set();
  modal(`<div class="stack conteudo"><div class="row between nowrap"><div><div class="caps muted small">Editar conteúdo</div><h3 data-tt></h3></div><button class="btn sm ghost" data-close>Fechar</button></div>
    <p class="small muted" style="margin:0">Tire aulas, essenciais, passo a passo e listas inteiras, ou abra um item (▸) para tirar só algumas partes, como um exercício de uma lista. O progresso, os salvos e as tags dos outros exercícios são mantidos. Se quiser guardar uma cópia antes, exporte a matéria em Estúdio.</p>
    <div data-body></div></div>`, (el, close) => {
    const draw = () => {
      rebuild();
      const m = materiaByKey(mkey);
      if (!m) { close(); after?.(); return; }
      el.querySelector('[data-tt]').innerHTML = esc(m.nome);
      el.querySelector('[data-body]').innerHTML = TIPOS.map(([k, lab, tipo]) => {
        const list = m[k];
        return `<div class="ct-sec"><div class="caps muted small">${lab} <span class="tiny">(${list.length})</span></div>
          ${!list.length ? '<div class="tiny muted" style="padding:4px 0 8px">Nenhum item.</div>' : list.map((it) => {
            const bl = it.parsed.blocks, [s1, sN] = NOME_PARTE[tipo];
            const op = aberto.has(it.id);
            return `<div class="ct-item ${op ? 'open' : ''}"><div class="ct-row">
                <button class="ct-tog" data-tog="${esc(it.id)}" aria-expanded="${op}" title="Ver as partes">${op ? '▾' : '▸'}</button>
                <div class="grow ct-t" data-tog="${esc(it.id)}">${inl(it.titulo)}<div class="tiny muted">${plural(bl.length, s1, sN)}</div></div>
                <button class="btn xs ghost danger" data-delit="${esc(it.id)}">Tirar ${{ aula: 'aula', essencial: 'essenciais', passos: 'passo a passo', lista: 'lista' }[tipo]}</button></div>
              ${op ? `<ol class="ct-parts">${bl.map((b, i) => `<li><div class="grow">${parteLabel(it, b, i)}</div><button class="btn xs ghost danger" data-delb="${esc(it.id)}|${i}" title="Tirar">✕</button></li>`).join('')}</ol>` : ''}
            </div>`;
          }).join('')}</div>`;
      }).join('');
      el.querySelectorAll('[data-tog]').forEach((b) => (b.onclick = () => { const id = b.dataset.tog; aberto.has(id) ? aberto.delete(id) : aberto.add(id); draw(); }));
      el.querySelectorAll('[data-delit]').forEach((b) => (b.onclick = async () => {
        const it = m.aulas.concat(m.essenciais, m.passos, m.listas).find((x) => x.id === b.dataset.delit);
        if (!(await confirmBox(`Tirar <b>${esc(it.titulo)}</b> desta matéria? Isso não pode ser desfeito.`, { ok: 'Tirar', danger: true }))) return;
        await deleteItem(it.id); rebuild(); toast('Tirado ✓'); draw(); after?.();
      }));
      el.querySelectorAll('[data-delb]').forEach((b) => (b.onclick = async () => {
        const [id, i] = b.dataset.delb.split('|');
        const it = m.aulas.concat(m.essenciais, m.passos, m.listas).find((x) => x.id === id);
        if (it.parsed.blocks.length <= 1) { toast('É a única parte. Para tirar, use “Tirar” no item inteiro.'); return; }
        const blk = it.parsed.blocks[+i];
        const nome = it.tipo === 'lista' ? `o exercício ${esc(blk.title || String(+i + 1))}` : `“${esc(blk.title || BLOCK_TYPES[blk.type]?.label || 'esta parte')}”`;
        if (!(await confirmBox(`Tirar ${nome} de <b>${esc(it.titulo)}</b>?${it.tipo === 'lista' ? ' Os exercícios seguintes são renumerados.' : ''}`, { ok: 'Tirar', danger: true }))) return;
        b.disabled = true;
        try { await tirarBloco(it, +i); toast('Tirado ✓'); draw(); after?.(); }
        catch (e) { console.error(e); toast('Não consegui tirar: ' + e.message, 5000); b.disabled = false; }
      }));
    };
    draw();
  }, { wide: true });
}
