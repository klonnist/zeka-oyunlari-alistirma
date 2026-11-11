// Eğlence katmanı: konfeti, sesler, bildirim kartları (kütüphanesiz)

// ---------- ses ----------
let ac = null;
const soundKey = 'zo-sound';
export function soundOn() { try { return localStorage.getItem(soundKey) !== '0'; } catch { return true; } }
export function setSound(on) { try { localStorage.setItem(soundKey, on ? '1' : '0'); } catch { /* yok say */ } }

function tone(freq, start, dur, type = 'sine', vol = 0.18) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, ac.currentTime + start);
  g.gain.setValueAtTime(0.0001, ac.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, ac.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  o.connect(g).connect(ac.destination);
  o.start(ac.currentTime + start);
  o.stop(ac.currentTime + start + dur + 0.05);
}
export function play(kind) {
  if (!soundOn()) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    if (kind === 'right') { tone(660, 0, 0.14, 'triangle'); tone(990, 0.1, 0.22, 'triangle'); }
    else if (kind === 'wrong') { tone(220, 0, 0.18, 'square', 0.07); tone(180, 0.12, 0.2, 'square', 0.06); }
    else if (kind === 'combo') { [523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.15, 'triangle')); }
    else if (kind === 'level') { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.2, 'triangle', 0.2)); }
    else if (kind === 'badge') { [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.09, 0.25, 'sine', 0.16)); }
    else if (kind === 'tap') tone(880, 0, 0.05, 'sine', 0.05);
  } catch { /* ses desteklenmiyor */ }
}

// ---------- konfeti ----------
const COLORS = ['#e4572e', '#3a86ff', '#ffbe0b', '#2a9d8f', '#9b5de5', '#f15bb5', '#43aa8b'];
export function confetti(n = 70) {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) n = Math.min(n, 12);
  const box = document.createElement('div');
  box.className = 'confetti';
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    const x = Math.random() * 100, dx = (Math.random() - 0.5) * 40, rot = Math.random() * 720 - 360;
    s.style.cssText = `left:${x}vw;background:${COLORS[i % COLORS.length]};--dx:${dx}vw;--rot:${rot}deg;animation-delay:${Math.random() * 0.3}s;animation-duration:${1.6 + Math.random() * 1.2}s;${Math.random() < 0.4 ? 'border-radius:50%;' : ''}`;
    box.appendChild(s);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3400);
}

// ---------- bildirim kartları ----------
let stack = null;
export function toast(html, kind = '', ms = 3200) {
  if (!stack || !document.body.contains(stack)) {
    stack = document.createElement('div');
    stack.className = 'toasts';
    document.body.appendChild(stack);
  }
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.innerHTML = html;
  stack.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, ms);
}

export function shake(el) {
  if (!el) return;
  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
}

// Puan/rozet/seviye sonucunu kutla (profile.award çıktısı)
export function celebrate(res, { quiet = false } = {}) {
  if (!res) return;
  if (res.xp > 0 && !quiet) toast(`<b>+${res.xp} puan</b> ⭐`, 'xp', 1800);
  for (const b of res.badges || []) {
    play('badge'); confetti(90);
    toast(`<span class="tbig">${b.icon}</span><div><b>Yeni rozet: ${b.name}</b><small>${b.desc}</small></div>`, 'badge', 4500);
  }
  if (res.levelUp) {
    play('level'); confetti(140);
    toast(`<span class="tbig">${res.levelUp.icon}</span><div><b>Seviye atladın!</b><small>Artık ${res.levelUp.name} oldun</small></div>`, 'level', 5000);
  }
}
