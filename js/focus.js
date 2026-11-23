// Timer de foco: pílula nas telas de estudo da matéria (tempo de hoje + Pomodoro).
import { esc, modal, toast } from './util.js';
import { lsGet, lsSet } from './store.js';
import { getStudyMat, tempoMateria, fmtTempo, materiaByKey } from './data.js';

let pill = null, tick = null;
const st = () => lsGet('foco', null); // {fim, dur, tipo:'foco'|'pausa', mkey}

function beep() {
  try {
    const C = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach((t) => { const o = C.createOscillator(), g = C.createGain(); o.frequency.value = 660; g.gain.setValueAtTime(0.0001, C.currentTime + t); g.gain.exponentialRampToValueAtTime(0.2, C.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, C.currentTime + t + 0.2); o.connect(g).connect(C.destination); o.start(C.currentTime + t); o.stop(C.currentTime + t + 0.22); });
  } catch (e) {}
  navigator.vibrate?.([200, 100, 200]);
}
const mmss = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

function render() {
  const k = getStudyMat();
  const f = st();
  const running = f && f.fim > Date.now();
  if (!k && !running) { pill?.remove(); pill = null; return; }
  if (!pill) { pill = document.createElement('button'); pill.className = 'focus-pill'; pill.onclick = openPanel; document.body.appendChild(pill); }
  if (running) {
    pill.classList.toggle('pausa', f.tipo === 'pausa');
    pill.classList.add('on');
    pill.innerHTML = `<span class="fp-ic">${f.tipo === 'pausa' ? '☕' : '⏱'}</span>${f.tipo === 'pausa' ? 'Pausa' : 'Foco'} ${mmss(f.fim - Date.now())}`;
  } else {
    pill.classList.remove('on', 'pausa');
    pill.innerHTML = `<span class="fp-ic">⏱</span>${fmtTempo(tempoMateria(k).hoje)} hoje`;
  }
}
function check() {
  const f = st();
  if (f && f.fim <= Date.now() && !f.avisado) {
    lsSet('foco', { ...f, avisado: true });
    beep();
    if (f.tipo === 'foco') {
      modal(`<div class="stack" style="text-align:center"><div style="font-size:2rem">✦</div><h3>${f.dur} minutos de foco!</h3><p class="muted" style="margin:0">Hora de uma pausa curta.</p>
        <div class="row" style="justify-content:center"><button class="btn" data-close>Agora não</button><button class="btn primary" data-pausa>Pausa de 5 min</button></div></div>`, (box, close) => {
        box.querySelector('[data-pausa]').onclick = () => { start(5, 'pausa'); close(); };
      });
    } else toast('Pausa terminada. Bora voltar ✦', 4000);
  }
  render();
}
export function start(min, tipo = 'foco') {
  lsSet('foco', { fim: Date.now() + min * 60000, dur: min, tipo, mkey: getStudyMat() });
  render();
}
function openPanel() {
  const k = getStudyMat() || st()?.mkey;
  const m = k && materiaByKey(k);
  const t = k ? tempoMateria(k) : null;
  const f = st(); const running = f && f.fim > Date.now();
  modal(`<div class="stack"><h3>Timer de foco</h3>
    ${m ? `<div class="small muted">${esc(m.nome)}</div><div class="grid g3 tempo-grid"><div class="as-box"><div class="k">Hoje</div><div class="v">${fmtTempo(t.hoje)}</div></div><div class="as-box"><div class="k">7 dias</div><div class="v">${fmtTempo(t.semana)}</div></div><div class="as-box"><div class="k">Total</div><div class="v">${fmtTempo(t.total)}</div></div></div>
    <p class="tiny muted" style="margin:0">Conta sozinho enquanto você está nas aulas, listas, banco, essenciais, passo a passo e fórmulas desta matéria (pausa depois de 2 minutos sem mexer).</p>` : ''}
    ${running ? `<p style="margin:0">${f.tipo === 'pausa' ? 'Pausa' : 'Foco'} em andamento: <b>${mmss(f.fim - Date.now())}</b></p><div class="row"><button class="btn" data-stop>Parar</button><button class="btn ghost" data-close>Fechar</button></div>`
      : `<div class="row"><button class="btn primary" data-f="25">Foco 25 min</button><button class="btn" data-f="50">Foco 50 min</button><button class="btn ghost" data-close>Fechar</button></div>`}
  </div>`, (box, close) => {
    box.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => { start(+b.dataset.f); close(); toast(`Foco de ${b.dataset.f} min começou ⏱`); }));
    box.querySelector('[data-stop]')?.addEventListener('click', () => { lsSet('foco', null); render(); close(); });
  });
}
export function initFocus() {
  clearInterval(tick);
  tick = setInterval(check, 1000);
  render();
}
export const refreshFocus = render;
