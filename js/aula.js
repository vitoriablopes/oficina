// Player de aula: blocos, checagens e leitura em voz alta.
import { BLOCK_TYPES } from './parser.js';
import { esc, plural, fmtDate, toast } from './util.js';
import { richHtml, hydrate, speechOf, inl, fitMath } from './render.js';
import { speakable } from './math.js';
import * as TTS from './speech.js';
import { Store, save } from './store.js';
import { itemById, aulaProg, setAulaProg, markCheck, bump, groupOf, toggleSaved, isSaved } from './data.js';

let cleanup = [];
export function teardown() { cleanup.forEach((f) => { try { f(); } catch (e) {} }); cleanup = []; TTS.stop(); }

// ---------- fala ----------
export function chunks(text) {
  const out = [];
  for (const s of String(text || '').split(/(?<=[.!?;:])\s+/)) {
    let t = s.trim();
    while (t.length > 230) { const cut = t.lastIndexOf(',', 220) > 80 ? t.lastIndexOf(',', 220) + 1 : t.lastIndexOf(' ', 220); out.push(t.slice(0, cut).trim()); t = t.slice(cut).trim(); }
    if (t) out.push(t);
  }
  return out;
}
export function speakText(text, opts = {}) {
  return TTS.speakSeq(chunks(text).map((t) => ({ text: t })), { lang: 'pt', gap: 250, ...opts });
}
/** Botão de ouvir que alterna tocar/parar. */
export function wireSay(btn, getText) {
  btn.onclick = () => {
    if (btn.classList.contains('playing')) { TTS.stop(); return; }
    document.querySelectorAll('.playing[data-sayblock]').forEach((b) => b.classList.remove('playing'));
    btn.classList.add('playing');
    speakText(getText()).finally(() => btn.classList.remove('playing'));
  };
}

function blockSpeech(b) {
  const T = BLOCK_TYPES[b.type].label;
  const title = b.title && !/^\d+$/.test(b.title) ? speakable(b.title) + '. ' : '';
  switch (b.type) {
    case 'formula': return `${T}: ${title}${b.leitura || speechOf(b.nodes)}`;
    case 'exemplo': return `${T}. ${title}${speechOf(b.enunciado)}. Resolução. ${speechOf(b.resolucao)} ${b.resposta?.length ? 'Resposta: ' + speechOf(b.resposta) : ''}`;
    case 'checagem': return `${T}. ${title}${speechOf(b.pergunta)}`;
    case 'exercicio': return `${title ? 'Exercício ' + title : 'Exercício. '}${speechOf(b.enunciado)}`;
    default: return `${title}${speechOf(b.nodes)}`;
  }
}
export const answerSpeech = (b) => `${b.resposta?.length ? 'Resposta: ' + speechOf(b.resposta) + '. ' : ''}${b.resolucao?.length ? 'Resolução. ' + speechOf(b.resolucao) : ''}`;

// ---------- blocos ----------
export function blockHeader(b, { say = true, saved = null } = {}) {
  const T = BLOCK_TYPES[b.type];
  const showTitle = b.title && !(b.type === 'exercicio' && /^\d+$/.test(b.title));
  return `<div class="block-label t-${b.type}"><span class="ic">${T.icon}</span><div class="grow"><div class="k">${T.label}${b.type === 'exercicio' && b.title ? ' ' + esc(b.title) : ''}</div>${showTitle ? `<h2>${inl(b.title)}</h2>` : ''}</div>
    ${saved != null ? `<button type="button" class="icon-btn star ${saved ? 'on' : ''}" data-savex title="${saved ? 'Tirar dos salvos' : 'Salvar este exercício'}" aria-label="Salvar">${saved ? '★' : '☆'}</button>` : ''}
    ${say ? `<button type="button" class="icon-btn" data-sayblock title="Ouvir esta parte" aria-label="Ouvir esta parte">🔊</button>` : ''}</div>`;
}
/** Liga a estrelinha de salvar. */
export function wireStar(el, id, idx) {
  const st = el.querySelector('[data-savex]'); if (!st) return;
  st.onclick = () => {
    const on = toggleSaved(id, idx);
    st.classList.toggle('on', on); st.textContent = on ? '★' : '☆'; st.title = on ? 'Tirar dos salvos' : 'Salvar este exercício';
    toast(on ? 'Salvo em Exercícios salvos' : 'Tirado dos salvos');
  };
}
export function topicLine(b) {
  if (!b.topico && !b.subtopico && !b.descricao && !b.origem) return '';
  return `<div class="ex-meta">${b.topico || b.subtopico ? `<div class="ex-topic">${b.topico ? `<span class="tp">${inl(b.topico)}</span>` : ''}${b.subtopico ? `<span class="sep">›</span><span class="stp">${inl(b.subtopico)}</span>` : ''}</div>` : ''}
    ${b.descricao ? `<div class="ex-desc">${inl(b.descricao)}</div>` : ''}${b.origem ? `<span class="origem">${esc(b.origem)}</span>` : ''}</div>`;
}

/** Área de dica / resposta / resolução (checagens e exercícios). */
export function answerArea(b, { state = null, rate = true, rateLabel = 'Como foi?' } = {}) {
  return `<div class="reveal-tools row">
      ${b.dica?.length ? `<button class="btn sm butter" data-hint>Mostrar dica</button>` : ''}
      ${b.formula?.length ? `<button class="btn sm lav" data-fml>Mostrar fórmula</button>` : ''}
      <button class="btn sm primary" data-show>Mostrar resposta</button></div>
    ${b.dica?.length ? `<div class="hint" data-hintbox hidden><div class="caps muted small">Dica</div>${richHtml(b.dica)}</div>` : ''}
    ${b.formula?.length ? `<div class="fml" data-fmlbox hidden><div class="caps muted small">Fórmula</div>${richHtml(b.formula)}</div>` : ''}
    <div class="answer" data-ansbox hidden>
      ${b.resposta?.length ? `<div class="ans-final"><div class="row between"><div class="caps muted small">Resposta</div><button type="button" class="icon-btn sm" data-sayans title="Ouvir resposta e resolução">🔊</button></div>${richHtml(b.resposta)}</div>` : ''}
      ${b.resolucao?.length ? `<details class="steps-box" open><summary>Resolução passo a passo</summary>${richHtml(b.resolucao)}</details>` : ''}
      ${rate ? `<div class="rate-row"><span class="small muted">${rateLabel}</span><button class="btn ok-btn ${state === 'ok' ? 'on' : ''}" data-rate="ok">✓ Acertei</button><button class="btn bad-btn ${state === 'erro' ? 'on' : ''}" data-rate="erro">✗ Errei</button></div>` : ''}
    </div>`;
}
export function wireAnswer(el, b, { onRate, onReveal, open = false } = {}) {
  const hint = el.querySelector('[data-hint]'), fml = el.querySelector('[data-fml]'), show = el.querySelector('[data-show]');
  hint?.addEventListener('click', () => { el.querySelector('[data-hintbox]').hidden = false; hint.remove(); fitMath(el); bump(); });
  fml?.addEventListener('click', () => { el.querySelector('[data-fmlbox]').hidden = false; fml.remove(); fitMath(el); bump(); });
  const reveal = (scroll) => {
    el.querySelector('[data-ansbox]').hidden = false; show.remove(); hint?.remove(); fml?.remove();
    el.querySelector('[data-hintbox]') && (el.querySelector('[data-hintbox]').hidden = false);
    el.querySelector('[data-fmlbox]') && (el.querySelector('[data-fmlbox]').hidden = false);
    fitMath(el);
    if (!scroll) return;
    bump(); onReveal?.();
    el.querySelector('[data-ansbox]').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  show.onclick = () => reveal(true);
  if (open) reveal(false);
  const sa = el.querySelector('[data-sayans]'); if (sa) wireSay(sa, () => answerSpeech(b));
  el.querySelectorAll('[data-rate]').forEach((r) => (r.onclick = () => {
    el.querySelectorAll('[data-rate]').forEach((x) => x.classList.toggle('on', x === r));
    onRate?.(r.dataset.rate === 'ok');
  }));
}

export function blockBody(b) {
  switch (b.type) {
    case 'explicacao': case 'resumo': return richHtml(b.nodes);
    case 'formula': return `${topicLine(b)}<div class="formula-box">${richHtml(b.nodes)}</div>`;
    case 'exemplo': return `<div class="q-box">${richHtml(b.enunciado)}</div>
      ${b.resolucao.length ? `<div class="caps muted small" style="margin:16px 0 6px">Resolução</div>${richHtml(b.resolucao)}` : ''}
      ${b.resposta.length ? `<div class="ans-final" style="margin-top:12px"><div class="caps muted small">Resposta</div>${richHtml(b.resposta)}</div>` : ''}`;
    case 'checagem': return `${topicLine(b)}<div class="q-box">${richHtml(b.pergunta)}</div>`;
    case 'exercicio': return `${topicLine(b)}<div class="q-box">${richHtml(b.enunciado)}</div>`;
  }
  return '';
}

// ---------------------------------------------------------------
//  Player
// ---------------------------------------------------------------
export function openAula(view, id, { go }) {
  teardown();
  const A = itemById(id);
  if (!A || A.tipo !== 'aula') { view.innerHTML = `<div class="empty" data-notfound><span class="orn">✎</span>Aula não encontrada (ou ainda carregando).<div style="margin-top:14px"><button class="btn" onclick="location.hash='#materias'">Voltar</button></div></div>`; return; }
  const blocks = A.parsed.blocks;
  const back = () => go('#materia/' + A.mkey);
  const S = { i: -1, start: Date.now(), auto: false };
  Store.state.perfil.ultima = { id: A.id, t: Date.now() }; save('perfil');

  function render() {
    TTS.stop();
    window.scrollTo({ top: 0 });
    if (S.i < 0) return renderIntro();
    if (S.i >= blocks.length) return renderEnd();
    const b = blocks[S.i];
    const p = aulaProg(A.id) || {};
    const feitos = new Set(p.feitos || []);
    const chkState = p.chk?.[S.i] || null;
    view.innerHTML = `<div class="lesson-shell fade-in">
      <div class="lesson-top"><button class="icon-btn" data-close title="Sair da aula">✕</button>
        <div class="steps">${blocks.map((x, k) => `<button title="${esc(BLOCK_TYPES[x.type].label)}${x.title ? ' — ' + esc(x.title) : ''}" data-step="${k}" class="${k === S.i ? 'cur' : feitos.has(k) ? 'done' : ''} ${x.type === 'checagem' ? 'chk' : ''}"></button>`).join('')}</div>
        <button class="icon-btn ${S.auto ? 'playing' : ''}" data-auto title="${S.auto ? 'Parar a leitura da aula' : 'Ouvir a aula em voz alta (segue sozinha até a próxima checagem)'}">${S.auto ? '■' : '🎧'}</button>
        <span class="small muted">${S.i + 1}/${blocks.length}</span></div>
      <div class="card block-card t-${b.type}" data-block>${blockHeader(b, { saved: b.type === 'checagem' ? isSaved(A.id, S.i) : null })}${blockBody(b)}${b.type === 'checagem' ? answerArea(b, { state: chkState, rateLabel: 'Acertou? (opcional)' }) : ''}</div>
      <div class="lesson-foot"><button class="btn ghost" data-prev>${S.i > 0 ? '← Anterior' : '← Início'}</button><button class="btn primary lg" data-next>${S.i === blocks.length - 1 ? 'Concluir ✓' : 'Continuar →'}</button></div>
    </div>`;
    const card = view.querySelector('[data-block]');
    hydrate(card);
    wireSay(card.querySelector('[data-sayblock]'), () => blockSpeech(b));
    wireStar(card, A.id, S.i);
    if (b.type === 'checagem') {
      wireAnswer(card, b, { open: !!chkState, onRate: (ok) => { markCheck(A, S.i, ok); toast(ok ? 'Boa! ✓' : 'Anotado — vale rever essa parte.'); } });
    }
    card.addEventListener('click', bump);
    view.querySelector('[data-close]').onclick = back;
    view.querySelector('[data-prev]').onclick = () => { S.i--; render(); };
    view.querySelector('[data-next]').onclick = () => complete();
    view.querySelector('[data-auto]').onclick = () => { S.auto = !S.auto; if (!S.auto) TTS.stop(); render(); };
    view.querySelectorAll('[data-step]').forEach((s) => (s.onclick = () => { S.i = +s.dataset.step; render(); }));
    setAulaProg(A.id, { passo: S.i, status: p.status === 'concluida' ? 'concluida' : 'andamento' });
    if (S.auto) autoRead(b);
  }
  function autoRead(b) {
    const btn = view.querySelector('[data-sayblock]');
    btn?.classList.add('playing');
    const myI = S.i;
    speakText(blockSpeech(b)).then((finished) => {
      btn?.classList.remove('playing');
      if (!finished || !S.auto || S.i !== myI) return;
      if (b.type === 'checagem') { toast('Resolva a checagem. Ao continuar, a leitura segue.', 4000); return; }
      setTimeout(() => { if (S.auto && S.i === myI) complete(); }, 700);
    });
  }
  function complete() {
    const p = aulaProg(A.id) || { feitos: [] };
    const feitos = new Set(p.feitos || []); feitos.add(S.i);
    setAulaProg(A.id, { feitos: [...feitos] });
    bump(); S.i++; render();
  }
  function renderIntro() {
    const p = aulaProg(A.id);
    const m = A.meta;
    const feitos = new Set(p?.feitos || []);
    const nChk = blocks.filter((b) => b.type === 'checagem').length;
    view.innerHTML = `<div class="lesson-shell fade-in">
      <div class="lesson-top"><button class="icon-btn" data-close title="Voltar">✕</button><div class="grow"></div></div>
      <div class="card block-card stack">
        <div class="caps muted">${esc(A.materia)}${m.topico ? ' · ' + esc(m.topico) : ''}${m.subtopico ? ' › ' + esc(m.subtopico) : ''}</div>
        <h1>${inl(A.titulo)}</h1>
        ${m.descricao ? `<p style="margin:0;font-size:1.08em">${inl(m.descricao)}</p>` : ''}
        <div class="row">${m.tempo ? `<span class="chip">≈ ${m.tempo} min</span>` : ''}<span class="chip">${plural(blocks.length, 'parte')}</span>${nChk ? `<span class="chip butter">${plural(nChk, 'checagem', 'checagens')}</span>` : ''}${A.parsed.formulas.length ? `<span class="chip lav">${plural(A.parsed.formulas.length, 'fórmula')}</span>` : ''}</div>
        ${A.tags.length ? `<div class="row">${A.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
        <hr class="orn">
        <div class="stack-s">${blocks.map((b, k) => `<button class="row nowrap btn ghost part-row" data-jump="${k}">
          <span class="chip t-${b.type}" style="min-width:34px;justify-content:center">${BLOCK_TYPES[b.type].icon}</span>
          <span class="grow" style="text-align:left;white-space:normal">${esc(BLOCK_TYPES[b.type].label)}${b.title ? ` · <i>${inl(b.title)}</i>` : ''}</span>
          ${p?.chk?.[k] ? `<span class="status ${p.chk[k] === 'ok' ? 'ok' : 'erro'}">${p.chk[k] === 'ok' ? 'acertei' : 'errei'}</span>` : ''}${feitos.has(k) ? '<span class="done-mark">✓</span>' : ''}</button>`).join('')}</div>
        <div class="row" style="justify-content:flex-end;margin-top:12px">
          ${p && p.passo > 0 && p.status !== 'concluida' ? `<button class="btn" data-restart>Recomeçar</button><button class="btn primary lg" data-go="${p.passo}">Continuar de onde parei</button>` : `<button class="btn primary lg" data-go="0">${p?.status === 'concluida' ? 'Rever aula' : 'Começar'}</button>`}
        </div>
        ${p?.status === 'concluida' ? `<p class="small muted" style="text-align:right;margin:0">Concluída em ${fmtDate(p.concluidaEm)}</p>` : ''}
      </div></div>`;
    view.querySelector('[data-close]').onclick = back;
    view.querySelectorAll('[data-jump]').forEach((x) => (x.onclick = () => { S.i = +x.dataset.jump; render(); }));
    view.querySelector('[data-go]').onclick = (e) => { S.i = +e.currentTarget.dataset.go; render(); };
    view.querySelector('[data-restart]')?.addEventListener('click', () => { setAulaProg(A.id, { feitos: [], passo: 0, chk: {} }); S.i = 0; render(); });
  }
  function renderEnd() {
    S.auto = false;
    const p = aulaProg(A.id) || {};
    setAulaProg(A.id, { status: 'concluida', concluidaEm: Date.now(), passo: 0, vezes: (p.vezes || 0) + 1 });
    const chk = Object.values(aulaProg(A.id).chk || {});
    const nChk = blocks.filter((b) => b.type === 'checagem').length;
    const ok = chk.filter((x) => x === 'ok').length, bad = chk.filter((x) => x === 'erro').length;
    const mins = Math.max(1, Math.round((Date.now() - S.start) / 60000));
    const grp = groupOf(A.mkey, 'aula');
    const next = grp[grp.findIndex((x) => x.id === A.id) + 1];
    const wrong = blocks.map((b, k) => (aulaProg(A.id).chk?.[k] === 'erro' ? k : -1)).filter((k) => k >= 0);
    view.innerHTML = `<div class="lesson-shell fade-in"><div class="card end stack">
      <div class="orn">✦</div><h1>Aula concluída</h1><p class="muted" style="margin:0">${inl(A.titulo)}</p>
      <div class="grid g3" style="margin:22px 0 8px">
        <div class="card flat stat"><div class="v">${nChk ? `${ok}<span class="small muted">/${nChk}</span>` : '—'}</div><div class="k">checagens acertadas</div></div>
        <div class="card flat stat"><div class="v">${bad}</div><div class="k">para rever</div></div>
        <div class="card flat stat"><div class="v">${mins}</div><div class="k">${mins === 1 ? 'minuto' : 'minutos'}</div></div>
      </div>
      ${wrong.length ? `<div class="row" style="justify-content:center"><span class="small muted">Rever:</span>${wrong.map((k) => `<button class="btn xs" data-rev="${k}">${esc(blocks[k].title || 'Checagem ' + (blocks.slice(0, k + 1).filter((b) => b.type === 'checagem').length))}</button>`).join('')}</div>` : ''}
      <div class="row" style="justify-content:center">
        <button class="btn" data-back>Voltar à matéria</button>
        ${next ? `<button class="btn primary" data-nx>Próxima: ${esc(next.titulo)} →</button>` : ''}
      </div></div></div>`;
    view.querySelector('[data-back]').onclick = back;
    view.querySelector('[data-nx]')?.addEventListener('click', () => go('#aula/' + next.id));
    view.querySelectorAll('[data-rev]').forEach((x) => (x.onclick = () => { S.i = +x.dataset.rev; render(); }));
  }
  cleanup.push(() => { S.auto = false; });
  render();
}
