// Lista de exercícios: fila com Pular / Acertei / Errei.
import { esc, plural, toast, modal } from './util.js';
import { richHtml, hydrate, inl } from './render.js';
import * as TTS from './speech.js';
import { Store, save } from './store.js';
import { itemById, listaProg, listaStats, saveLista, bump, dayRec, topicsOf, matchTopic, isSaved } from './data.js';
import { blockHeader, blockBody, answerArea, wireAnswer, wireSay, wireStar } from './aula.js';
import { speechOf } from './render.js';
import { speakable } from './math.js';

const exName = (b, i) => (b.title ? (/^\d+$/.test(b.title) ? 'Exercício ' + b.title : b.title) : 'Exercício ' + (i + 1));

function topicSelect(blocks, filtro) {
  const T = topicsOf(blocks);
  if (!T.length) return '';
  const n = (f) => blocks.filter((b) => matchTopic(b, f)).length;
  return `<select class="select topic-sel" data-topic aria-label="Tópico"><option value="">Todos os tópicos (${blocks.length})</option>
    ${T.map((t) => `<option value="${esc(t.topico)}" ${filtro === t.topico ? 'selected' : ''}>${esc(t.topico)} (${n(t.topico)})</option>${t.subs.map((sb) => { const f = t.topico + ' › ' + sb; return `<option value="${esc(f)}" ${filtro === f ? 'selected' : ''}>${esc(f)} (${n(f)})</option>`; }).join('')}`).join('')}</select>`;
}

export function openLista(view, id, { go }) {
  TTS.stop();
  const L = itemById(id);
  if (!L || L.tipo !== 'lista') { view.innerHTML = `<div class="empty" data-notfound><span class="orn">✐</span>Lista não encontrada (ou ainda carregando).<div style="margin-top:14px"><button class="btn" onclick="location.hash='#materias'">Voltar</button></div></div>`; return; }
  const blocks = L.parsed.blocks;
  const back = () => go('#materia/' + L.mkey, { aba: 'listas' });
  Store.state.perfil.ultima = { id: L.id, t: Date.now() }; save('perfil');

  function render() {
    TTS.stop();
    window.scrollTo({ top: 0 });
    const p = listaProg(L);
    if (!p) return renderIntro();
    if (!p.fila.length) return renderDone();
    const vis = p.fila.filter((k) => matchTopic(blocks[k], p.filtro));
    if (!vis.length) return renderTopicDone();
    const i = vis[0];
    const b = blocks[i];
    const r = p.res[i] || {};
    const st = listaStats(L);
    view.innerHTML = `<div class="lesson-shell fade-in">
      <div class="lesson-top"><button class="icon-btn" data-close title="Sair da lista">✕</button>
        <div class="grow"><div class="small muted" style="line-height:1.2">${inl(L.titulo)}</div><div class="progress" style="margin-top:6px"><i style="width:${st.pct}%"></i></div></div>
        <button class="btn sm ghost" data-all title="Ver todos os exercícios">☰ ${st.ok}/${st.n}</button></div>
      ${topicSelect(blocks, p.filtro) ? `<div class="topic-row"><span class="caps muted small">Estudar</span>${topicSelect(blocks, p.filtro)}</div>` : ''}
      <div class="card block-card t-exercicio" data-block>
        ${r.erros || r.pulos ? `<div class="selos">${r.erros ? `<span class="selo erro">✗ Você errou este ${r.erros === 1 ? 'uma vez' : r.erros + ' vezes'}</span>` : ''}${r.pulos ? `<span class="selo pulo">↷ pulado ${r.pulos === 1 ? 'uma vez' : r.pulos + ' vezes'}</span>` : ''}</div>` : ''}
        ${blockHeader({ ...b, title: b.title || String(i + 1) }, { saved: isSaved(L.id, i) })}${blockBody(b)}${answerArea(b, { rateLabel: 'Como foi?' })}
      </div>
      <div class="lesson-foot"><span class="small muted" style="align-self:center">${vis.length === 1 ? 'Último que falta' + (p.filtro ? ' neste tópico' : '') : plural(vis.length, 'exercício na fila', 'exercícios na fila') + (p.filtro ? ' deste tópico' : '')}</span><button class="btn lg" data-skip>Pular ↷</button></div>
    </div>`;
    const card = view.querySelector('[data-block]');
    hydrate(card);
    wireSay(card.querySelector('[data-sayblock]'), () => `${exName(b, i)}. ${speechOf(b.enunciado)}`);
    wireAnswer(card, b, { onRate: (ok) => rate(i, ok) });
    wireStar(card, L.id, i);
    wireTopic();
    card.addEventListener('click', bump);
    view.querySelector('[data-close]').onclick = back;
    view.querySelector('[data-all]').onclick = overview;
    view.querySelector('[data-skip]').onclick = () => {
      const q = listaProg(L);
      if (q.fila.filter((k) => matchTopic(blocks[k], q.filtro)).length === 1) { toast('Este é o último que falta 🙂'); return; }
      q.res[i] = { ...(q.res[i] || {}), pulos: (q.res[i]?.pulos || 0) + 1 };
      q.fila.push(q.fila.shift());
      saveLista(); render();
    };
  }
  function rate(i, ok) {
    const q = listaProg(L);
    const prev = q.res[i] || {};
    const stt = Store.state.progresso.stats;
    stt.ex++; if (ok) stt.exOk++;
    dayRec().itens++;
    if (ok) {
      q.res[i] = { ...prev, st: 'ok', em: Date.now() };
      q.fila = q.fila.filter((x) => x !== i);
      toast(q.fila.length ? 'Boa! ✓' : 'Lista concluída ✦');
    } else {
      q.res[i] = { ...prev, st: 'erro', erros: (prev.erros || 0) + 1 };
      q.fila = [...q.fila.filter((x) => x !== i), i];
      toast(q.fila.length > 1 ? 'Foi para o fim da lista, marcado como errado.' : 'Tente de novo com calma.');
    }
    saveLista();
    setTimeout(render, 450);
  }
  function wireTopic() {
    view.querySelector('[data-topic]')?.addEventListener('change', (e) => {
      const q = listaProg(L, { create: true }); q.filtro = e.target.value; saveLista(); render();
    });
  }
  function renderTopicDone() {
    const q = listaProg(L);
    view.innerHTML = `<div class="lesson-shell fade-in">
      <div class="lesson-top"><button class="icon-btn" data-close title="Sair da lista">✕</button><div class="grow small muted">${inl(L.titulo)}</div></div>
      <div class="topic-row">${topicSelect(blocks, q.filtro)}</div>
      <div class="card end stack"><div class="orn">✦</div><h2>Tópico concluído</h2>
        <p class="muted" style="margin:0">Você acertou todos os exercícios de <b>${esc(q.filtro)}</b>. Ainda ${q.fila.length === 1 ? 'falta 1 exercício' : 'faltam ' + q.fila.length + ' exercícios'} de outros tópicos.</p>
        <div class="row" style="justify-content:center"><button class="btn" data-back>Voltar ao mapa</button><button class="btn primary" data-alltopics>Ver todos os tópicos</button></div></div></div>`;
    view.querySelector('[data-close]').onclick = back;
    view.querySelector('[data-back]').onclick = back;
    view.querySelector('[data-alltopics]').onclick = () => { q.filtro = ''; saveLista(); render(); };
    wireTopic();
  }
  function overview() {
    const q = listaProg(L);
    modal(`<div class="stack"><div class="row between"><h3>${inl(L.titulo)}</h3><button class="btn sm ghost" data-close>Fechar</button></div>
      <p class="small muted" style="margin:0">Toque num exercício pendente para resolvê-lo agora.</p>
      <div class="stack-s">${blocks.map((b, i) => { const r = q.res[i] || {}; const pos = q.fila.indexOf(i);
        return `<button class="ov-row ${r.st === 'ok' ? 'ok' : ''}" data-ov="${i}"><span class="ov-st">${r.st === 'ok' ? '✓' : r.st === 'erro' ? '✗' : r.pulos ? '↷' : '○'}</span>
          <span class="grow" style="text-align:left">${esc(exName(b, i))}${b.topico ? ` <span class="tiny muted">· ${esc(b.topico)}${b.subtopico ? ' › ' + esc(b.subtopico) : ''}</span>` : ''}${b.descricao ? `<div class="tiny muted">${inl(b.descricao)}</div>` : ''}</span>
          <span class="tiny muted">${r.st === 'ok' ? (r.erros ? `acertei depois de ${plural(r.erros, 'erro')}` : 'acertei de primeira') : pos === 0 ? 'agora' : pos > 0 ? `${pos + 1}º na fila` : ''}${r.st !== 'ok' && r.erros ? ` · ${plural(r.erros, 'erro')}` : ''}</span></button>`; }).join('')}</div></div>`, (m, close) => {
      m.querySelectorAll('[data-ov]').forEach((x) => (x.onclick = () => {
        const i = +x.dataset.ov;
        if (q.res[i]?.st === 'ok') { close(); peek(i); return; }
        q.fila = [i, ...q.fila.filter((k) => k !== i)];
        if (!matchTopic(blocks[i], q.filtro)) q.filtro = '';
        saveLista(); close(); render();
      }));
    });
  }
  function peek(i) {
    const b = blocks[i];
    modal(`<div class="t-exercicio">${blockHeader({ ...b, title: b.title || String(i + 1) }, { say: false, saved: isSaved(L.id, i) })}${blockBody(b)}${answerArea(b, { rate: false })}</div><div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn sm" data-close>Fechar</button></div>`, (m) => { hydrate(m); wireAnswer(m, b, { open: true }); wireStar(m, L.id, i); }, { wide: true });
  }
  function renderIntro() {
    const st = listaStats(L);
    const origens = [...new Set(blocks.map((b) => b.origem).filter(Boolean))];
    view.innerHTML = `<div class="lesson-shell fade-in">
      <div class="lesson-top"><button class="icon-btn" data-close title="Voltar">✕</button><div class="grow"></div></div>
      <div class="card block-card stack">
        <div class="caps muted">${esc(L.materia)} · Lista de exercícios</div>
        <h1>${inl(L.titulo)}</h1>
        ${L.meta.descricao ? `<p style="margin:0;font-size:1.08em">${inl(L.meta.descricao)}</p>` : ''}
        <div class="row"><span class="chip">${plural(st.n, 'exercício')}</span>${origens.length ? `<span class="chip">${esc(origens.slice(0, 3).join(' · '))}${origens.length > 3 ? '…' : ''}</span>` : ''}</div>
        ${L.tags.length ? `<div class="row">${L.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
        <div class="card flat soft small stack-s" style="padding:14px 16px">
          <div>↷ <b>Pular</b> manda o exercício para o fim da fila.</div>
          <div>✗ <b>Errei</b> também manda para o fim, marcado como errado.</div>
          <div>✓ <b>Acertei</b> tira da fila. A lista termina quando todos estiverem certos.</div></div>
        ${topicSelect(blocks, '') ? `<div><label class="lbl">Estudar</label>${topicSelect(blocks, '')}</div>` : ''}
        <div class="row" style="justify-content:flex-end"><button class="btn primary lg" data-start>Começar</button></div>
      </div></div>`;
    view.querySelector('[data-close]').onclick = back;
    view.querySelector('[data-start]').onclick = () => { const q = listaProg(L, { create: true }); q.filtro = view.querySelector('[data-topic]')?.value || ''; saveLista(); render(); };
  }
  function renderDone() {
    const q = listaProg(L);
    const st = listaStats(L);
    const first = blocks.filter((b, i) => q.res[i]?.st === 'ok' && !q.res[i]?.erros).length;
    const errados = blocks.map((b, i) => i).filter((i) => q.res[i]?.erros);
    if (!q.concluida) { q.concluida = Date.now(); saveLista(); }
    view.innerHTML = `<div class="lesson-shell fade-in"><div class="card end stack">
      <div class="orn">✦</div><h1>Lista concluída</h1><p class="muted" style="margin:0">${inl(L.titulo)}</p>
      <div class="grid g3" style="margin:22px 0 8px">
        <div class="card flat stat"><div class="v">${first}<span class="small muted">/${st.n}</span></div><div class="k">de primeira</div></div>
        <div class="card flat stat"><div class="v">${errados.length}</div><div class="k">com algum erro</div></div>
        <div class="card flat stat"><div class="v">${st.erros}</div><div class="k">${st.erros === 1 ? 'erro no total' : 'erros no total'}</div></div>
      </div>
      ${errados.length ? `<div class="row" style="justify-content:center"><span class="small muted">Errei:</span>${errados.map((i) => `<button class="btn xs" data-peek="${i}">${esc(exName(blocks[i], i))}</button>`).join('')}</div>` : ''}
      <div class="row" style="justify-content:center">
        <button class="btn" data-back>Voltar ao mapa</button>
        ${errados.length ? `<button class="btn" data-redo-err>Refazer os que errei</button>` : ''}
        <button class="btn primary" data-redo>Refazer a lista toda</button>
      </div></div></div>`;
    view.querySelector('[data-back]').onclick = back;
    view.querySelectorAll('[data-peek]').forEach((x) => (x.onclick = () => peek(+x.dataset.peek)));
    view.querySelector('[data-redo]').onclick = () => { Store.state.progresso.listas[L.id] = { fila: blocks.map((b, i) => i), res: {}, inicio: Date.now(), rodada: (q.rodada || 1) + 1, filtro: '' }; saveLista(); render(); };
    view.querySelector('[data-redo-err]')?.addEventListener('click', () => {
      errados.forEach((i) => { q.res[i] = { ...q.res[i], st: null, erros: 0, pulos: 0 }; });
      q.fila = [...errados]; q.concluida = null; q.rodada = (q.rodada || 1) + 1; saveLista(); render();
    });
  }
  render();
}
