// Animasyonlu ders oynatıcısı
import { renderBoard, esc } from './core/board.js';
import { LETTERS } from './core/util.js';

const speech = typeof window !== 'undefined' && 'speechSynthesis' in window;
let voice = null;
function pickVoice() {
  if (!speech) return null;
  const vs = speechSynthesis.getVoices();
  voice = vs.find((v) => /^tr/i.test(v.lang)) || null;
  return voice;
}
if (speech) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

export const canSpeak = () => speech;

function say(text, onEnd) {
  if (!speech) return;
  speechSynthesis.cancel();
  const clean = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').replace(/→/g, ', ').replace(/×/g, ' çarpı ');
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = 'tr-TR';
  if (voice) u.voice = voice;
  u.rate = 0.95;
  if (onEnd) u.onend = onEnd;
  speechSynthesis.speak(u);
}

// steps: kit().steps ; game: oyun modülü ; p: örnek bulmaca
export function mountLesson(root, game, p, steps, { onFinish, tryHref } = {}) {
  let i = 0, playing = false, timer = null, voiceOn = false, slow = false;
  root.innerHTML = `
    <div class="lesson">
      <div class="ls-stage"></div>
      <div class="ls-say" aria-live="polite"><span class="ls-num"></span><p></p></div>
      <div class="ls-q"></div>
      <div class="ls-ctrl">
        <button class="lc" data-c="first" title="Baştan">⏮</button>
        <button class="lc" data-c="prev" title="Geri">◀</button>
        <button class="lc play" data-c="play" title="Oynat / Durdur">▶</button>
        <button class="lc" data-c="next" title="İleri">▶▶</button>
        ${speech ? '<button class="lc" data-c="voice" title="Sesli anlatım">🔇</button>' : ''}
        <button class="lc" data-c="speed" title="Hız">🐇</button>
      </div>
      <div class="ls-dots">${steps.map((_, k) => `<button class="ld" data-k="${k}" aria-label="Adım ${k + 1}"></button>`).join('')}</div>
      <div class="ls-end"></div>
    </div>`;
  const stage = root.querySelector('.ls-stage');
  const sayP = root.querySelector('.ls-say p'), num = root.querySelector('.ls-num');
  const qBox = root.querySelector('.ls-q'), endBox = root.querySelector('.ls-end');
  const playBtn = root.querySelector('[data-c="play"]');

  function draw() {
    const s = steps[i];
    if (s.html) stage.innerHTML = s.html;
    else {
      const cfg = game.view(p, s.user, { showSol: false });
      cfg.pop = s.pop; cfg.focus = s.focus; cfg.scan = s.scan; cfg.pointer = s.pointer;
      if (cfg.lattice) { cfg.lattice.fresh = s.fresh; cfg.lattice.crosses = s.crosses; }
      if (s.notes) for (const k in s.notes) { const [r, c] = k.split(',').map(Number); if (cfg.cells[r] && cfg.cells[r][c]) cfg.cells[r][c].note = s.notes[k]; }
      if (s.fills) for (const [r, c, col] of s.fills) cfg.cells[r][c].fill = col;
      if (s.noQ) { cfg.arrow = null; }
      stage.innerHTML = renderBoard(cfg);
    }
    num.textContent = `${i + 1}/${steps.length}`;
    sayP.textContent = s.say;
    sayP.parentElement.classList.remove('in'); void sayP.parentElement.offsetWidth; sayP.parentElement.classList.add('in');
    qBox.innerHTML = s.qa ? `<p class="qtext">${esc(p.q.text)}</p><div class="opts">${p.q.options.map((o, k) => `<div class="opt ${o === p.q.answer ? 'right pop-in' : 'dim'}"><b>${LETTERS[k]})</b> ${esc(o)}</div>`).join('')}</div>` : '';
    root.querySelectorAll('.ld').forEach((d, k) => { d.classList.toggle('on', k === i); d.classList.toggle('seen', k < i); });
    const last = i === steps.length - 1;
    endBox.innerHTML = last ? `<div class="ls-done pop-in">🎉 Ders bitti! ${tryHref ? `<a class="btn big" href="${tryHref}">Şimdi sen dene ➜</a>` : ''}</div>` : '';
    if (last && onFinish) onFinish();
    if (voiceOn) say(s.say, playing ? () => schedule(700) : null);
    else if (playing) schedule();
  }
  function schedule(ms) {
    clearTimeout(timer);
    if (!playing) return;
    if (i >= steps.length - 1) { setPlaying(false); return; }
    const words = steps[i].say.split(/\s+/).length;
    const t = ms != null ? ms : Math.max(2800, words * 330) * (slow ? 1.6 : 1);
    timer = setTimeout(() => { if (!document.body.contains(root)) return stop(); i++; draw(); }, t);
  }
  function setPlaying(v) {
    playing = v;
    playBtn.textContent = v ? '⏸' : '▶';
    playBtn.classList.toggle('on', v);
    if (!v) clearTimeout(timer);
  }
  function stop() { setPlaying(false); if (speech) speechSynthesis.cancel(); }
  function go(k) { clearTimeout(timer); if (speech) speechSynthesis.cancel(); i = Math.max(0, Math.min(steps.length - 1, k)); draw(); }

  root.querySelector('.ls-ctrl').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-c]');
    if (!b) return;
    const c = b.dataset.c;
    if (c === 'first') { setPlaying(false); go(0); }
    if (c === 'prev') { setPlaying(false); go(i - 1); }
    if (c === 'next') { setPlaying(false); go(i + 1); }
    if (c === 'play') {
      if (playing) { stop(); return; }
      if (i >= steps.length - 1) i = -1;
      setPlaying(true);
      go(i + 1);
    }
    if (c === 'voice') {
      voiceOn = !voiceOn;
      b.textContent = voiceOn ? '🔊' : '🔇';
      b.classList.toggle('on', voiceOn);
      if (voiceOn) say(steps[i].say, playing ? () => schedule(700) : null); else speechSynthesis.cancel();
    }
    if (c === 'speed') { slow = !slow; b.textContent = slow ? '🐢' : '🐇'; }
  });
  root.querySelector('.ls-dots').addEventListener('click', (ev) => {
    const d = ev.target.closest('.ld');
    if (d) { setPlaying(false); go(+d.dataset.k); }
  });
  const keyH = (ev) => {
    if (!document.body.contains(root)) { document.removeEventListener('keydown', keyH); stop(); return; }
    if (ev.key === 'ArrowRight') { setPlaying(false); go(i + 1); }
    if (ev.key === 'ArrowLeft') { setPlaying(false); go(i - 1); }
    if (ev.key === ' ') { ev.preventDefault(); playBtn.click(); }
  };
  document.addEventListener('keydown', keyH);
  draw();
  // otomatik başlatma: yalnızca kullanıcı henüz bir şeye dokunmadıysa
  let touched = false;
  root.addEventListener('pointerdown', () => { touched = true; }, { capture: true });
  return { play() { if (!playing && !touched && i === 0 && document.body.contains(root)) playBtn.click(); }, stop };
}
