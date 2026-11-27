// Opções da matéria: período, arquivar, clonar e organizar a ordem.
import { esc, modal, toast, plural, confirmBox } from './util.js';
import { Store, save, saveItem, touchItems, deleteItem } from './store.js';
import { rebuild, itemById, groupOf, setGroupOrder, setMatCfg, matCfg, PERIODO_RE, materias, activeMaterias, siglaOf } from './data.js';
import { slugify, keyOf } from './parser.js';
import { sortable } from './sortable.js';

const clone = (o) => JSON.parse(JSON.stringify(o));

export function openMateriaOptions(m, { go, after } = {}) {
  const c = matCfg(m.key);
  const n = m.aulas.length + m.listas.length + m.essenciais.length + m.passos.length;
  modal(`<div class="stack"><div class="row between"><h3>Editar matéria</h3><button class="btn sm ghost" data-close>Fechar</button></div>
    <div><label class="lbl">Nome</label><input class="input" data-nome value="${esc(m.nome)}"></div>
    <div class="grid g2" style="gap:10px">
      <div><label class="lbl">Sigla (ids e arquivos)</label><input class="input" data-sig value="${esc(c.sigla || siglaOf(m))}" placeholder="ex.: calc3"></div>
      <div><label class="lbl">Código da disciplina</label><input class="input" data-cod value="${esc(c.codigo || '')}" placeholder="ex.: MAE993"></div>
      <div><label class="lbl">Professor(a)</label><input class="input" data-prof value="${esc(c.professor || '')}" placeholder="opcional"></div>
    </div>
    <div><label class="lbl">Período</label>
      <div class="row nowrap"><input class="input" data-per value="${esc(c.periodo || '')}" placeholder="ex.: 26.2" inputmode="decimal" maxlength="4" style="max-width:140px">
      <div class="row" style="gap:6px">${periodSuggestions().map((p) => `<button class="chip ${c.periodo === p ? 'on' : ''}" data-ps="${p}">${p}</button>`).join('')}</div></div>
      <p class="tiny muted" style="margin:4px 0 0">Ano com dois dígitos, ponto e 1, 2 ou 3 (para semestres ou trimestres).</p></div>
    <label class="switch"><input type="checkbox" data-arq ${c.arquivada ? 'checked' : ''}><span class="tg"></span>Arquivada (sai da tela principal e fica em “Mais matérias”)</label>
    <hr class="orn" style="margin:4px 0">
    <div class="stack-s"><b>Conteúdo</b><p class="small muted" style="margin:0">Tire aulas, essenciais, passo a passo e listas, ou só partes delas (por exemplo, um exercício de uma lista).</p>
      <div class="row"><button class="btn" data-conteudo>Editar conteúdo…</button>${go ? '<button class="btn" data-apostila>📄 Gerar apostila…</button>' : ''}</div></div>
    <hr class="orn" style="margin:4px 0">
    <div class="stack-s"><b>Clonar esta matéria</b><p class="small muted" style="margin:0">Cria uma cópia com todas as ${plural(n, 'aula, lista, essencial e passo a passo', 'aulas, listas, essenciais e passos a passo')}, com outro nome e período. Útil para refazer a matéria (por exemplo, depois de uma reprovação) sem perder nada.</p>
      <button class="btn" data-clone>Clonar…</button></div>
    <hr class="orn" style="margin:4px 0">
    <div class="row between"><button class="btn danger" data-delm>Excluir matéria</button><button class="btn primary" data-ok>Salvar</button></div></div>`, (box, close) => {
    const per = box.querySelector('[data-per]');
    box.querySelector('[data-conteudo]').onclick = async () => { close(); const { openConteudo } = await import('./conteudo.js'); openConteudo(m.key, { after }); };
    box.querySelector('[data-apostila]')?.addEventListener('click', () => { close(); go('#apostila/' + m.key); });
    box.querySelectorAll('[data-ps]').forEach((b) => (b.onclick = () => { per.value = b.dataset.ps; box.querySelectorAll('[data-ps]').forEach((x) => x.classList.toggle('on', x === b)); }));
    box.querySelector('[data-ok]').onclick = async (e) => {
      const v = normPeriodo(per.value);
      if (v === null) { toast('Período inválido. Use, por exemplo, 26.1, 26.2 ou 26.3.'); per.focus(); return; }
      const nome = box.querySelector('[data-nome]').value.trim();
      if (!nome) { toast('A matéria precisa de um nome.'); return; }
      let key = m.key;
      if (nome !== m.nome) {
        if (keyOf(nome) !== m.key && materias().some((x) => x.key === keyOf(nome))) { toast('Já existe outra matéria com esse nome.'); return; }
        e.target.disabled = true; e.target.textContent = 'Salvando…';
        key = await renameMateria(m, nome);
      }
      setMatCfg(key, { nome, periodo: v, arquivada: box.querySelector('[data-arq]').checked, sigla: slugify(box.querySelector('[data-sig]').value, 14), codigo: box.querySelector('[data-cod]').value.trim(), professor: box.querySelector('[data-prof]').value.trim() });
      close(); toast('Matéria atualizada ✓');
      if (key !== m.key && go) go('#materia/' + key); else after?.();
    };
    box.querySelector('[data-delm]').onclick = async () => {
      close();
      const ok = await confirmBox(`Excluir a matéria <b>${esc(m.nome)}</b> com ${plural(n, 'item', 'itens')} (aulas, listas, essenciais e passo a passo), as anotações e as avaliações? Isso não pode ser desfeito. Se quiser guardar, exporte antes (Estúdio › Minhas aulas e listas) ou só arquive.`, { ok: 'Excluir tudo', danger: true });
      if (!ok) return;
      await deleteMateria(m);
      toast('Matéria excluída');
      go ? go('#materias') : after?.();
    };
    box.querySelector('[data-clone]').onclick = () => { close(); openClone(m, { go, after }); };
  });
}

/** '' → ''; '26.2', '26,2', '2026.2' → '26.2'; inválido → null */
export function normPeriodo(v) {
  let t = String(v || '').trim().replace(',', '.');
  if (!t) return '';
  const m = t.match(/^(?:20)?(\d{2})\.([1-3])$/);
  return m ? `${m[1]}.${m[2]}` : null;
}
function periodSuggestions() {
  const d = new Date(); const y = d.getFullYear() % 100; const s = d.getMonth() < 6 ? 1 : 2;
  const cur = `${y}.${s}`, nxt = s === 1 ? `${y}.2` : `${y + 1}.1`;
  const used = [...new Set(materias().map((m) => m.cfg.periodo).filter(Boolean))];
  return [...new Set([cur, nxt, ...used])].sort().slice(-5);
}

// ---------------------------------------------------------------
//  Clonar
// ---------------------------------------------------------------
function openClone(m, { go, after }) {
  const c = matCfg(m.key);
  const sug = normPeriodo(c.periodo) ? nextPeriodo(c.periodo) : '';
  modal(`<div class="stack"><h3>Clonar ${esc(m.nome)}</h3>
    <div><label class="lbl">Nome da nova matéria</label><input class="input" data-nome value="${esc(m.nome + (sug ? ` (${sug})` : ' (cópia)'))}"></div>
    <div><label class="lbl">Período da nova matéria</label><input class="input" data-per value="${esc(sug)}" placeholder="ex.: 27.1" style="max-width:140px"></div>
    <div class="stack-s">
      <label class="radio-row on"><input type="radio" name="cm" value="limpo" checked><span><b>Tudo limpo</b><span class="tiny muted" style="display:block">Mesmas aulas, listas, essenciais e passo a passo, com o progresso do zero (sem anotações e notas).</span></span></label>
      <label class="radio-row"><input type="radio" name="cm" value="dados"><span><b>Com todos os dados</b><span class="tiny muted" style="display:block">Copia também o progresso: aulas concluídas, acertos e erros, exercícios salvos, favoritos e aprendidos, anotações e avaliações.</span></span></label>
    </div>
    <label class="switch"><input type="checkbox" data-arq checked><span class="tg"></span>Arquivar a matéria original</label>
    <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-go>Clonar</button></div></div>`, (box, close) => {
    box.querySelectorAll('input[name=cm]').forEach((r) => (r.onchange = () => box.querySelectorAll('.radio-row').forEach((x) => x.classList.toggle('on', x.contains(r) && r.checked))));
    box.querySelector('[data-go]').onclick = async (e) => {
      const nome = box.querySelector('[data-nome]').value.trim();
      const per = normPeriodo(box.querySelector('[data-per]').value);
      if (!nome) return toast('Dê um nome para a nova matéria.');
      if (per === null) return toast('Período inválido. Use, por exemplo, 27.1.');
      if (materias().some((x) => x.key === keyOf(nome))) return toast('Já existe uma matéria com esse nome. Escolha outro.');
      e.target.disabled = true; e.target.textContent = 'Clonando…';
      try {
        const nk = await cloneMateria(m, { nome, periodo: per, dados: box.querySelector('input[name=cm]:checked').value === 'dados' });
        if (box.querySelector('[data-arq]').checked) setMatCfg(m.key, { arquivada: true });
        close(); toast('Matéria clonada ✓');
        go ? go('#materia/' + nk) : after?.();
      } catch (err) { console.error(err); toast('Erro ao clonar: ' + err.message, 5000); e.target.disabled = false; e.target.textContent = 'Clonar'; }
    };
  });
}
function nextPeriodo(p) {
  const [y, s] = p.split('.').map(Number);
  return s >= 2 ? `${y + 1}.1` : `${y}.${s + 1}`;
}

/** Copia todos os itens da matéria para uma matéria nova. Retorna a chave da nova matéria. */
export async function cloneMateria(m, { nome, periodo = '', dados = false }) {
  const nk = keyOf(nome);
  const suf = slugify(periodo || nome, 12);
  const map = {};
  const taken = (id) => !!itemById(id) || Object.values(map).includes(id);
  const all = [...m.aulas, ...m.essenciais, ...m.passos, ...m.listas];
  for (const it of all) {
    let nid = `${it.id}--${suf}`.slice(0, 90); let k = 2;
    while (taken(nid)) nid = `${it.id}--${suf}-${k++}`.slice(0, 90);
    map[it.id] = nid;
    await saveItem({ id: nid, codigo: rewriteHeader(it.codigo, { id: nid, materia: nome }) }, { silent: true });
  }
  touchItems(); rebuild();
  for (const tipo of ['aula', 'lista', 'essencial', 'passos']) {
    const ids = groupOf(m.key, tipo).map((x) => map[x.id]).filter(Boolean);
    if (ids.length) await setGroupOrder(ids);
  }
  const ordem = matCfg(m.key).ordem;
  setMatCfg(nk, { nome, periodo, sigla: matCfg(m.key).sigla, codigo: matCfg(m.key).codigo, professor: matCfg(m.key).professor, ordem: ordem != null ? ordem - 0.5 : undefined });
  if (dados) {
    const P = Store.state.progresso;
    for (const [o, n] of Object.entries(map)) {
      if (P.aulas[o]) P.aulas[n] = clone(P.aulas[o]);
      if (P.listas[o]) P.listas[n] = clone(P.listas[o]);
    }
    if (P.acomp?.[m.key]) P.acomp[nk] = clone(P.acomp[m.key]);
    for (const bag of [P.salvos || {}, P.passos || {}]) {
      for (const [k, v] of Object.entries({ ...bag })) {
        const i = k.lastIndexOf('#'); const o = k.slice(0, i);
        if (map[o]) bag[map[o] + k.slice(i)] = clone(v);
      }
    }
    save('progresso');
  }
  return nk;
}

/** Troca @id e @materia no topo do código (ou acrescenta, se faltarem). */
export function rewriteHeader(codigo, { id, materia }) {
  const lines = String(codigo).replace(/\r\n?/g, '\n').split('\n');
  let firstBlock = lines.findIndex((l) => /^\s*==[^=]/.test(l));
  if (firstBlock < 0) firstBlock = lines.length;
  let hasId = false, hasMat = false;
  for (let i = 0; i < firstBlock; i++) {
    if (/^\s*@\s*(id|codigo)\s*:/i.test(lines[i])) { lines[i] = `@id: ${id}`; hasId = true; }
    else if (/^\s*@\s*(mat[ée]ria|disciplina|curso|cadeira)\s*:/i.test(lines[i])) { lines[i] = `@materia: ${materia}`; hasMat = true; }
  }
  const tipoAt = lines.findIndex((l, i) => i < firstBlock && /^\s*@\s*tipo\s*:/i.test(l));
  const add = [!hasId && `@id: ${id}`, !hasMat && `@materia: ${materia}`].filter(Boolean);
  if (add.length) lines.splice(tipoAt >= 0 ? tipoAt + 1 : 0, 0, ...add);
  return lines.join('\n');
}

// ---------------------------------------------------------------
//  Organizar a ordem das matérias
// ---------------------------------------------------------------
export function organizeMaterias(after) {
  const mats = activeMaterias();
  let ids = mats.map((m) => m.key);
  modal(`<div class="stack"><h3>Organizar matérias</h3><p class="small muted" style="margin:0">Arraste pela alça ⠿ ou use ↑ ↓.</p><div data-sort></div>
    <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-ok>Salvar ordem</button></div></div>`, (box, close) => {
    sortable(box.querySelector('[data-sort]'), mats.map((m) => ({ id: m.key, label: esc(m.nome), sub: m.cfg.periodo ? esc(m.cfg.periodo) : '' })), { onChange: (n) => { ids = n; } });
    box.querySelector('[data-ok]').onclick = () => {
      const P = (Store.state.perfil.materias ||= {});
      ids.forEach((k, i) => { P[k] = { ...(P[k] || {}), ordem: i + 1 }; });
      save('perfil'); close(); toast('Ordem salva ✓'); after?.();
    };
  });
}

/** Troca o nome da matéria em todos os itens (os ids e o progresso continuam os mesmos). */
export async function renameMateria(m, nome) {
  const nk = keyOf(nome);
  for (const it of [...m.aulas, ...m.essenciais, ...m.passos, ...m.listas]) {
    await saveItem({ id: it.id, codigo: rewriteHeader(it.codigo, { id: it.id, materia: nome }) }, { silent: true });
  }
  if (nk !== m.key) {
    const PF = Store.state.perfil, PR = Store.state.progresso;
    if (PF.materias?.[m.key]) { PF.materias[nk] = PF.materias[m.key]; delete PF.materias[m.key]; }
    if (PF.aba?.[m.key]) { PF.aba[nk] = PF.aba[m.key]; delete PF.aba[m.key]; }
    if (PR.acomp?.[m.key]) { PR.acomp[nk] = PR.acomp[m.key]; delete PR.acomp[m.key]; save('progresso'); }
    save('perfil');
  }
  touchItems(); rebuild();
  return nk;
}
/** Apaga todos os itens da matéria, a configuração e o acompanhamento. */
export async function deleteMateria(m) {
  for (const it of [...m.aulas, ...m.essenciais, ...m.passos, ...m.listas]) await deleteItem(it.id);
  const PF = Store.state.perfil, PR = Store.state.progresso;
  if (PF.materias) delete PF.materias[m.key];
  if (PF.aba) delete PF.aba[m.key];
  if (PR.acomp) delete PR.acomp[m.key];
  save('perfil'); save('progresso');
  touchItems(); rebuild();
}

/** Janela para criar uma matéria nova (vazia). Chama onDone(chave). */
export function newMateria(onDone) {
  modal(`<div class="stack"><h3>Nova matéria</h3>
    <div><label class="lbl">Nome</label><input class="input" data-nome placeholder="ex.: Mecânica dos Sólidos 1"></div>
    <div class="grid g2" style="gap:10px">
      <div><label class="lbl">Sigla (ids e arquivos)</label><input class="input" data-sig placeholder="gerada do nome"></div>
      <div><label class="lbl">Código da disciplina</label><input class="input" data-cod placeholder="opcional, ex.: MAE993"></div>
    </div>
    <div><label class="lbl">Período</label><input class="input" data-per placeholder="ex.: 26.2" style="max-width:140px"></div>
    <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-ok>Criar</button></div></div>`, (box, close) => {
    const nomeI = box.querySelector('[data-nome]'), sigI = box.querySelector('[data-sig]');
    nomeI.focus();
    nomeI.oninput = () => { sigI.placeholder = siglaOf({ nome: nomeI.value, cfg: {} }); };
    box.querySelector('[data-ok]').onclick = () => {
      const nome = nomeI.value.trim();
      if (!nome) return toast('Dê um nome para a matéria.');
      const k = keyOf(nome);
      if (materias().some((x) => x.key === k)) return toast('Já existe uma matéria com esse nome.');
      const per = normPeriodo(box.querySelector('[data-per]').value);
      if (per === null) return toast('Período inválido. Use, por exemplo, 26.2.');
      setMatCfg(k, { nome, sigla: slugify(sigI.value || siglaOf({ nome, cfg: {} }), 14), codigo: box.querySelector('[data-cod]').value.trim(), periodo: per });
      close(); toast('Matéria criada ✓'); onDone?.(k);
    };
  });
}
