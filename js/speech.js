// =============================================================
//  Leitura em voz alta (Web Speech API do próprio navegador)
// =============================================================
export const SPEEDS = [
  { id: 'lenta', label: 'Lenta', rate: 0.7 },
  { id: 'normal', label: 'Normal', rate: 0.95 },
  { id: 'rapida', label: 'Rápida', rate: 1.2 },
];
export const LANG_TTS = { fr: 'fr-FR', ja: 'ja-JP', es: 'es-ES', it: 'it-IT', de: 'de-DE', en: 'en-US', pt: 'pt-BR', ko: 'ko-KR', zh: 'zh-CN', ru: 'ru-RU', nl: 'nl-NL', ca: 'ca-ES', la: 'it-IT' };

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voices = [];
const listeners = new Set();
function loadVoices() {
  if (!synth) return;
  voices = synth.getVoices() || [];
  listeners.forEach((f) => f());
}
if (synth) {
  loadVoices();
  synth.addEventListener?.('voiceschanged', loadVoices);
  setTimeout(loadVoices, 600);
}
export const supported = () => !!synth;
export const onVoices = (f) => listeners.add(f);

// Vozes reconhecidamente boas por idioma (as primeiras da lista ganham prioridade).
const BEST = {
  pt: ['Microsoft Francisca Online (Natural)', 'Microsoft Thalita Online (Natural)', 'Microsoft Antonio Online (Natural)', 'Google português do Brasil', 'Luciana (Premium)', 'Luciana (Enhanced)', 'Felipe (Enhanced)', 'Luciana', 'Felipe', 'Microsoft Maria', 'Microsoft Daniel'],
};
// Vozes "de brincadeira" da Apple e afins — nunca escolher automaticamente.
const NOVELTY = /(bells|boing|bubbles|cellos|good news|bad news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|albert|bahh|fred|junior|kathy|ralph|grandma|grandpa|rocko|shelley|sandy|eddy|flo|reed)\b/i;

export function voicesFor(lang) {
  const tag = (LANG_TTS[lang] || lang).toLowerCase();
  const base = tag.split('-')[0];
  const list = voices.filter((v) => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith(base));
  const best = BEST[base] || [];
  const score = (v) => {
    const vl = v.lang.toLowerCase().replace('_', '-');
    let s = 0;
    const bi = best.findIndex((n) => v.name.toLowerCase().startsWith(n.toLowerCase()) || v.name.toLowerCase().includes(n.toLowerCase()));
    if (bi >= 0) s += 100 - bi;                      // lista curada
    if (vl === tag) s += 30;                         // pt-BR antes de pt-PT
    if (/natural|neural|premium|enhanced|online/i.test(v.name)) s += 20;
    if (/google/i.test(v.name)) s += 12;
    if (NOVELTY.test(v.name)) s -= 200;
    if (/compact|espeak/i.test(v.name)) s -= 15;
    return s;
  };
  return list.sort((a, b) => score(b) - score(a));
}
export const bestVoiceName = (lang) => voicesFor(lang)[0]?.name || '';

let prefs = { voices: {}, speed: 'normal' };
export function setPrefs(p) { prefs = { ...prefs, ...p }; }
export function rateOf(speedId) { return (SPEEDS.find((s) => s.id === speedId) || SPEEDS[1]).rate; }

function pickVoice(lang, idx = 0) {
  const list = voicesFor(lang);
  if (!list.length) return null;
  const chosen = prefs.voices?.[lang];
  const main = list.find((v) => v.name === chosen) || list[0];
  if (!idx) return main;
  const others = list.filter((v) => v !== main && !NOVELTY.test(v.name) && v.lang === main.lang);
  return others.length ? others[(idx - 1) % others.length] : main;
}

let token = 0;
export function stop() { token++; try { synth?.cancel(); } catch (e) {} }

/** Lê uma frase. Retorna Promise que resolve ao terminar (ou ao ser interrompida). */
export function speak(text, { lang = 'pt', speed, rate, voiceIdx = 0, pitch = 1 } = {}) {
  if (!synth || !text) return Promise.resolve(false);
  stop();
  return utter(text, { lang, rate: rate ?? rateOf(speed || prefs.speed), voiceIdx, pitch }, token);
}

function utter(text, { lang, rate, voiceIdx, pitch }, my) {
  return new Promise((resolve) => {
    if (my !== token) return resolve(false);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANG_TTS[lang] || lang;
    const v = pickVoice(lang, voiceIdx);
    if (v) u.voice = v;
    u.rate = rate; u.pitch = pitch;
    let done = false;
    const fin = (ok) => { if (!done) { done = true; clearInterval(keep); resolve(ok); } };
    u.onend = () => fin(my === token);
    u.onerror = () => fin(false);
    // Chrome às vezes "trava" falas longas; isto mantém viva.
    const keep = setInterval(() => { if (my !== token) return fin(false); if (synth.paused) synth.resume(); }, 5000);
    synth.speak(u);
  });
}

/** Lê uma sequência de falas, chamando onLine(i) no início de cada uma. */
export async function speakSeq(items, { lang = 'pt', speed, onLine, from = 0, gap = 350 } = {}) {
  if (!synth) return false;
  stop();
  const my = token;
  const rate = rateOf(speed || prefs.speed);
  for (let i = from; i < items.length; i++) {
    if (my !== token) return false;
    onLine?.(i);
    const it = items[i];
    const ok = await utter(it.text, { lang, rate, voiceIdx: it.voiceIdx || 0, pitch: it.pitch || 1 }, my);
    if (!ok && my !== token) return false;
    await new Promise((r) => setTimeout(r, gap));
  }
  if (my === token) onLine?.(-1);
  return my === token;
}
export const isSpeaking = () => !!synth?.speaking;
