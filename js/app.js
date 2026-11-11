import { GAMES, byId } from './games/index.js?v=5';
import { makeRng, newSeed } from './core/rng.js?v=5';
import { renderBoard, attachInput, esc } from './core/board.js?v=5';
import { LETTERS, clone2 } from './core/util.js?v=5';
import { mountLesson } from './tutorial.js?v=5';
import { buildLesson } from './lessons/index.js?v=5';
import { createProfile, levelOf, dailyPick, dayKey, fmtMs } from './profile.js?v=5';
import { play, confetti, toast, shake, celebrate, soundOn, setSound } from './fun.js?v=5';
import { renderHistory, compareHtml } from './history.js?v=5';

const $app = document.getElementById('app');

// ---------- kalıcı ilerleme (localStorage, hata olursa sessizce geç) ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* yok say */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* yok say */ } },
};
const progress = () => store.get('zo-progress', { solved: {}, best: {} });
function markSolved(id) {
  const p = progress();
  p.solved[id] = (p.solved[id] || 0) + 1;
  store.set('zo-progress', p);
}

// ---------- profil, puan, ses ----------
const prof = createProfile(store, { gameCount: GAMES.length });
const daily = () => dailyPick(GAMES.map((g) => g.id), dayKey());
function hud() {
  const p = prof.get(), lv = levelOf(p.xp);
  return `<div class="hud">
    <a class="hud-lv" href="#/gecmis" title="Gelişimim">${lv.icon} <b>${p.name ? esc(p.name) : 'Ben'}</b> · ${lv.name}
      <span class="xpbar" title="${lv.next ? 'Sonraki seviyeye ' + lv.toNext + ' puan' : 'En üst seviye!'}"><i style="width:${lv.pct}%"></i></span><b class="xp">${p.xp}</b>⭐</a>
    ${p.streak && p.streak.count ? `<span class="streak" title="Üst üste çalıştığın gün">🔥 ${p.streak.count}</span>` : ''}
    ${p.combo >= 2 ? `<span class="combo" title="Art arda ilk denemede doğru">⚡ ${p.combo}</span>` : ''}
    <button class="sndbtn" aria-label="Sesi aç/kapa">${soundOn() ? '🔊' : '🔇'}</button>
  </div>`;
}
function refreshHud() { document.querySelectorAll('.hud').forEach((h) => { h.outerHTML = hud(); }); }
document.addEventListener('click', (ev) => {
  const b = ev.target.closest('.sndbtn');
  if (!b) return;
  setSound(!soundOn());
  b.textContent = soundOn() ? '🔊' : '🔇';
  play('tap');
});
function askName(force = false) {
  if (!force && prof.get().name) return;
  if (document.querySelector('.modal')) return;
  const cur = prof.get().name || '';
  const ov = document.createElement('div');
  ov.className = 'modal';
  ov.innerHTML = `<form class="mbox pop-in">
    <div class="mbig">👋</div>
    <h2>${cur ? 'Adını değiştir' : 'Merhaba! Adın ne?'}</h2>
    <p class="muted">Adın sonuçlarında ve gelişim sayfanda görünecek. Sadece bu cihazda saklanır.</p>
    <input name="n" maxlength="24" autocomplete="given-name" placeholder="Adını yaz" value="${esc(cur)}" required>
    <button class="btn big" type="submit">${cur ? 'Kaydet' : 'Başlayalım! 🚀'}</button>
    ${cur ? '<button class="btn ghost" type="button" data-x>Vazgeç</button>' : ''}
  </form>`;
  document.body.appendChild(ov);
  const inp = ov.querySelector('input');
  setTimeout(() => inp.focus(), 50);
  const x = ov.querySelector('[data-x]');
  if (x) x.addEventListener('click', () => ov.remove());
  ov.querySelector('form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const n = inp.value.trim();
    if (!n) return;
    prof.setName(n);
    ov.remove();
    if (!cur) { confetti(60); play('badge'); toast(`<b>Hoş geldin ${esc(n)}!</b> Hadi ilk bulmacanı çöz 🧩`, 'level', 3500); }
    route();
  });
}
document.addEventListener('click', (ev) => { if (ev.target.closest('[data-rename]')) askName(true); });

// ---------- bulmaca üretimi (önbellekli) ----------
const cache = new Map();
function puzzle(id, level, seed) {
  const k = id + '|' + level + '|' + seed;
  if (!cache.has(k)) {
    const p = byId[id].generate(makeRng(id + ':' + level + ':' + seed), level);
    cache.set(k, p);
    if (cache.size > 80) cache.delete(cache.keys().next().value);
  }
  return cache.get(k);
}

// ---------- tam ekran ----------
const fsApi = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
function setFsClass(on) {
  document.body.classList.toggle('fs', on);
  document.querySelectorAll('.fsbtn').forEach((b) => { b.textContent = on ? '✕ Tam ekrandan çık' : '⛶ Tam ekran'; b.setAttribute('aria-pressed', on); });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let fsSince = 0, fsUserExit = false;
async function toggleFs() {
  const on = document.body.classList.contains('fs');
  if (fsEl()) { // gerçek tam ekrandan çık
    fsUserExit = true;
    try { await (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch { /* yok say */ }
    return; // sınıf, fullscreenchange olayıyla güncellenir
  }
  if (!on && fsApi) {
    fsSince = Date.now(); fsUserExit = false;
    try {
      const req = (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen).call(document.documentElement);
      await Promise.race([req, wait(500)]);
    } catch { /* izin verilmedi */ }
    await wait(60);
    if (fsEl()) { fsSince = Date.now(); fsUserExit = false; return; }
  }
  // Tam ekran API'si yoksa ya da izin verilmediyse (ör. iPhone): ekranı kaplayan sayfa içi mod
  document.body.classList.toggle('pseudo', !on);
  setFsClass(!on);
}
['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) => document.addEventListener(ev, () => {
  const on = !!fsEl();
  // tarayıcı tam ekranı hemen geri aldıysa (kullanıcı çıkmadan) sayfa içi moda geç
  if (!on && !fsUserExit && Date.now() - fsSince < 1500) { document.body.classList.add('pseudo'); setFsClass(true); return; }
  document.body.classList.remove('pseudo');
  setFsClass(on);
}));
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && document.body.classList.contains('pseudo')) toggleFs(); });
const fsExit = document.createElement('button');
fsExit.className = 'fs-exit';
fsExit.textContent = '✕ Çık';
fsExit.setAttribute('aria-label', 'Tam ekrandan çık');
fsExit.addEventListener('click', toggleFs);
document.body.appendChild(fsExit);
document.addEventListener('click', (ev) => { if (ev.target.closest('.fsbtn')) toggleFs(); });
const fsBtn = () => `<button class="fsbtn btn small ghost" aria-pressed="${document.body.classList.contains('fs')}">${document.body.classList.contains('fs') ? '✕ Tam ekrandan çık' : '⛶ Tam ekran'}</button>`;

// ---------- yönlendirme ----------
window.addEventListener('hashchange', route);
setTimeout(() => { route(); askName(); }, 0); // tüm sabitler tanımlandıktan sonra

function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  window.scrollTo(0, 0);
  if (parts[0] === 'oyun' && byId[parts[1]]) {
    const level = parts[2] === 'orta' ? 'orta' : 'kolay';
    if (!parts[3]) { location.replace(`#/oyun/${parts[1]}/${level}/${newSeed()}`); return; }
    return playScreen(parts[1], level, parts[3]);
  }
  if (parts[0] === 'ders' && byId[parts[1]]) return lessonScreen(parts[1]);
  if (parts[0] === 'gecmis' || parts[0] === 'profil') {
    $app.innerHTML = `<div class="bar"><a class="back" href="#/">← Ana sayfa</a><button class="btn small ghost" data-rename>✏️ Adımı değiştir</button></div><div class="hroot"></div>`;
    return renderHistory($app.querySelector('.hroot'), prof, { GAMES, byId, esc });
  }
  if (parts[0] === 'prova' && (parts[1] === 'okul' || parts[1] === 'final')) return examScreen(parts[1], parts[2]);
  return homeScreen();
}

// ---------- ana sayfa ----------
const DATES = [
  ['Okul İçi Seçmeleri', '2027-01-05'],
  ['Bireysel Yarışmalar', '2027-01-09'],
  ['Türkiye Finalleri', '2027-04-03'],
];
function daysTo(d) { return Math.ceil((new Date(d + 'T09:00:00') - new Date()) / 86400000); }

function homeScreen() {
  const pr = progress();
  const card = (g) => {
    const n = pr.solved[g.id] || 0;
    const stars = n >= 10 ? '⭐⭐⭐' : n >= 5 ? '⭐⭐' : n >= 1 ? '⭐' : '';
    return `<a class="gcard" href="#/oyun/${g.id}/kolay"><span class="gicon">${g.icon}</span><span class="gname">${g.name}</span><span class="gstat">${n ? n + ' çözüldü ' + stars : 'Yeni'}</span></a>`;
  };
  const best = (k) => pr.best[k] ? `En iyi: ${pr.best[k].correct}/${pr.best[k].total}` : 'Henüz denenmedi';
  $app.innerHTML = `
    <header class="hero">
      ${hud()}
      <h1>${prof.get().name ? 'Merhaba ' + esc(prof.get().name) + '! 👋' : 'Zeka Oyunları Alıştırma'}</h1>
      <p class="sub">3. ve 4. sınıflar için zeka oyunları · her soru yepyeni, sorular hiç bitmez!</p>
      <div class="dates">${DATES.map(([t, d]) => { const k = daysTo(d); return `<div class="date"><b>${k > 0 ? k + ' gün' : 'Geçti'}</b><span>${t}</span><small>${d.split('-').reverse().join('.')}</small></div>`; }).join('')}</div>
    </header>
    <section class="today">
      ${(() => { const d = daily(), g = byId[d.id], done = prof.get().daily[dayKey()]; return `<a class="dcard ${done ? 'done' : ''}" href="#/oyun/${d.id}/kolay/${d.seed}"><span class="dicon">${done ? '✅' : '☀️'}</span><span><b>Günün bulmacası: ${g.icon} ${g.name}</b><small>${done ? 'Bugünkü bulmacayı çözdün, yarın yenisi gelecek!' : 'Çöz, +20 ekstra puan kazan!'}</small></span></a>`; })()}
      <a class="dcard" href="#/gecmis"><span class="dicon">📈</span><span><b>Gelişimim</b><small>Prova sonuçların, sürelerin, rozetlerin</small></span></a>
    </section>
    <section>
      <h2>📚 Önce Öğren</h2>
      <p class="muted">Her oyunun kurallarını küçük bir örnek üzerinde, adım adım animasyonla izle. İstersen sesli anlatımı aç.</p>
      <div class="lgrid">${GAMES.map((g) => `<a class="lcard ${watched()[g.id] ? 'seen' : ''}" href="#/ders/${g.id}"><span>${g.icon}</span><b>${g.name}</b>${watched()[g.id] ? '<i>✓</i>' : ''}</a>`).join('')}</div>
    </section>
    <section>
      <h2>🏁 Yarışma Provası</h2>
      <div class="exams">
        <a class="exam" href="#/prova/okul"><b>Okul İçi Seçmeleri</b><span>15 soru · 60 dakika</span><small>${best('okul')}</small></a>
        <a class="exam final" href="#/prova/final"><b>Final Provası</b><span>22 asıl + 3 yedek soru · 90 dakika</span><small>${best('final')}</small></a>
      </div>
    </section>
    <section>
      <h2>🧠 Okul İçi Seçmeleri Oyunları</h2>
      <div class="ggrid">${GAMES.filter((g) => g.stage === 'okul').map(card).join('')}</div>
    </section>
    <section>
      <h2>🏆 Finalde Eklenecek Oyunlar</h2>
      <div class="ggrid">${GAMES.filter((g) => g.stage === 'final').map(card).join('')}</div>
    </section>
    <footer>Bu site yarışmaya hazırlık için hazırlanmış bağımsız bir alıştırma sitesidir; resmi yarışma sitesi değildir. Sorular bilgisayar tarafından üretilir.</footer>`;
}

// ---------- ortak: bulmaca paneli ----------
// opts: { exam:bool, onAnswer(letterIdx), chosen, reveal:bool, solved:bool }
function mountPuzzle(root, g, p, opts = {}) {
  const state = opts.state || { user: g.initUser(p), sel: null, errors: null, showSol: false };
  const input = g.input(p);
  root.innerHTML = `
    ${g.info ? `<div class="info">${esc(g.info(p))}</div>` : ''}
    <div class="boardwrap"></div>
    ${input && input.kind === 'value' ? `<div class="palette">${input.palette.map((v) => `<button class="pk" data-v="${esc(v)}">${esc(v)}</button>`).join('')}<button class="pk del" data-v="">⌫</button></div>` : ''}
    ${input && input.kind === 'state' ? `<div class="tip">İpucu: hücreye dokundukça ${g.syms.on === 'ship' ? 'gemi → su → boş' : g.syms.on === 'diamond' ? 'elmas → boş (×) → temizle' : 'karala → nokta → temizle'} sırasıyla değişir.</div>` : ''}
    ${input && input.kind === 'edge' ? `<div class="tip">${g.id === 'cit' ? 'İki nokta arasına dokun ya da parmağını noktadan noktaya sürükle.' : 'Bir harften başlayıp parmağını hücre hücre sürükle. Bir bağlantıya dokunursan silinir.'}</div>` : ''}
    ${input ? `<div class="actions">
      ${opts.exam ? '' : '<button class="btn" data-a="check">✔ Kontrol Et</button><button class="btn" data-a="hint">💡 İpucu</button>'}
      <button class="btn ghost" data-a="clear">🧽 Temizle</button>
      ${opts.exam ? '' : '<button class="btn ghost" data-a="sol">👀 Çözüm</button>'}
    </div>` : ''}
    <div class="msg" aria-live="polite"></div>
    <div class="qcard">
      <p class="qtext">${esc(p.q.text)}</p>
      <div class="opts">${p.q.options.map((o, i) => `<button class="opt" data-i="${i}"><b>${LETTERS[i]})</b> ${esc(o)}</button>`).join('')}</div>
    </div>`;
  const wrap = root.querySelector('.boardwrap');
  const msg = root.querySelector('.msg');
  let svg = null;

  function draw() {
    const cfg = g.view(p, state.user, { sel: state.sel, errors: state.errors, showSol: state.showSol });
    if (cfg.html) { wrap.innerHTML = cfg.html; return; }
    const html = renderBoard(cfg);
    if (svg) {
      const t = document.createElement('div');
      t.innerHTML = html;
      svg.innerHTML = t.firstElementChild.innerHTML;
    } else {
      wrap.innerHTML = html;
      svg = wrap.firstElementChild;
      bind(cfg);
    }
  }
  function changed() { state.errors = null; state.showSol = false; msg.textContent = ''; msg.className = 'msg'; draw(); opts.onChange && opts.onChange(state); }

  function bind(cfg) {
    if (!input) return;
    if (input.kind === 'value') {
      attachInput(svg, cfg.rows, cfg.cols, null, {
        cell(r, c) {
          if (!g.editable(p, r, c)) return;
          state.sel = [r, c];
          draw();
        },
      });
    } else if (input.kind === 'state') {
      attachInput(svg, cfg.rows, cfg.cols, null, {
        cell(r, c) {
          if (!g.editable(p, r, c)) return;
          state.user = clone2(state.user);
          state.user[r][c] = g.cycle(state.user[r][c]);
          changed();
        },
      });
    } else if (input.kind === 'edge') {
      attachInput(svg, cfg.rows, cfg.cols, input.lattice, {
        edge(k, mode) {
          const has = state.user.has(k);
          const m = mode || (has ? 'del' : 'add');
          const u = new Set(state.user);
          if (m === 'add') u.add(k); else u.delete(k);
          state.user = u;
          changed();
          return m;
        },
      });
    }
  }

  function setValue(v) {
    if (!state.sel) { msg.textContent = 'Önce bir hücre seç.'; return; }
    const [r, c] = state.sel;
    state.user = clone2(state.user);
    state.user[r][c] = v;
    changed();
  }
  root.querySelectorAll('.pk').forEach((b) => b.addEventListener('click', () => setValue(b.dataset.v)));
  if (input && input.kind === 'value') {
    const keyH = (ev) => {
      if (!document.body.contains(root)) { document.removeEventListener('keydown', keyH); return; }
      if (!state.sel) return;
      const k = ev.key.toLocaleUpperCase('tr');
      if (input.palette.includes(k)) { setValue(k); ev.preventDefault(); }
      else if (ev.key === 'Backspace' || ev.key === 'Delete') { setValue(''); ev.preventDefault(); }
      else if (ev.key.startsWith('Arrow')) {
        const [r, c] = state.sel;
        const d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[ev.key];
        const nr = r + d[0], nc = c + d[1];
        if (nr >= 0 && nc >= 0 && nr < p.rows && nc < p.cols) { state.sel = [nr, nc]; draw(); }
        ev.preventDefault();
      }
    };
    document.addEventListener('keydown', keyH);
  }
  root.querySelectorAll('.btn').forEach((b) => b.addEventListener('click', () => {
    const a = b.dataset.a;
    if (opts.onAction) opts.onAction(a);
    if (a === 'check') {
      const res = g.check(p, state.user);
      if (res.done) { msg.textContent = '🎉 Harika! Bulmacayı doğru çözdün. Şimdi soruyu cevapla.'; msg.className = 'msg ok'; }
      else {
        state.errors = new Set(res.wrong);
        const bad = res.wrong.length || res.wrongCount || 0;
        msg.textContent = (bad ? `${bad} hatalı yer var${res.wrong.length ? ' (kırmızı)' : ''}. ` : 'Şu ana kadar hata yok. ') + (res.empty ? `${res.empty} eksik yer kaldı.` : '');
        msg.className = 'msg warn';
        draw();
      }
    } else if (a === 'hint') {
      const u = g.hint(p, state.user);
      if (u) { state.user = u; changed(); msg.textContent = '💡 Bir yeri senin için doldurdum.'; }
    } else if (a === 'clear') {
      state.user = g.initUser(p); state.sel = null; changed();
    } else if (a === 'sol') {
      state.showSol = !state.showSol; state.errors = null; draw();
    }
  }));

  const optBtns = [...root.querySelectorAll('.opt')];
  const paintOpts = () => optBtns.forEach((b, i) => {
    b.classList.toggle('chosen', opts.chosen === i);
    if (opts.reveal) {
      b.classList.toggle('right', p.q.options[i] === p.q.answer);
      b.classList.toggle('wrong', opts.chosen === i && p.q.options[i] !== p.q.answer);
    }
  });
  optBtns.forEach((b, i) => b.addEventListener('click', () => {
    if (opts.lockOptions) return;
    opts.chosen = i;
    if (opts.onAnswer) opts.onAnswer(i);
    paintOpts();
  }));
  draw();
  paintOpts();
  return {
    state,
    showSolution() { state.showSol = true; draw(); },
    reveal() { opts.reveal = true; paintOpts(); },
  };
}

// ---------- alıştırma ekranı ----------
function playScreen(id, level, seed) {
  const g = byId[id];
  let p;
  try { p = puzzle(id, level, seed); } catch (e) {
    console.error(e);
    location.replace(`#/oyun/${id}/${level}/${newSeed()}`);
    return;
  }
  const dd = daily();
  const isDaily = seed === dd.seed && id === dd.id && level === 'kolay';
  const lv = (l) => `<a class="lv ${l === level ? 'on' : ''}" href="#/oyun/${id}/${l}/${newSeed()}">${l === 'kolay' ? 'Kolay' : 'Orta'} <small>${g.levels[l]}</small></a>`;
  $app.innerHTML = `
    <div class="bar"><a class="back" href="#/">← Ana sayfa</a><span class="code" title="Bu kodu not alırsan aynı soruyu tekrar açabilirsin">Soru kodu: <b>${esc(seed)}</b></span>${fsBtn()}</div>
    ${hud()}
    <h1 class="gtitle">${g.icon} ${g.name} <span class="watch" title="Bu soruda geçen süre">⏱ <b id="sw">0:00</b></span>${isDaily ? ' <span class="tag">☀️ Günün bulmacası</span>' : ''}</h1>
    <div class="levels">${lv('kolay')}${lv('orta')}</div>
    <details class="rules" ${progress().solved[id] ? '' : 'open'}><summary>Nasıl oynanır?</summary><p>${esc(g.rules)}</p><a class="btn learn ${watched()[id] ? 'ghost' : 'glow'}" href="#/ders/${id}">▶ Animasyonla öğren</a></details>
    <div class="puz"></div>
    <div class="next"><a class="btn big" href="#/oyun/${id}/${level}/${newSeed()}">Yeni soru ➜</a></div>`;
  let counted = false, wrongs = 0, hints = 0, sawSol = false;
  const t0 = Date.now();
  const sw = () => { const el = document.getElementById('sw'); if (!el || counted) return false; const s = Math.floor((Date.now() - t0) / 1000); el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; return true; };
  const swId = setInterval(() => { if (!sw()) clearInterval(swId); }, 1000);
  const PRAISE = ['Aferin! 🌟', 'Süpersin! 🚀', 'Harika! 🎉', 'Müthiş! 💪', 'Tam isabet! 🎯', 'Beyin fırtınası! 🧠'];
  mountPuzzle($app.querySelector('.puz'), g, p, {
    reveal: false,
    onAction(a) { if (a === 'hint') hints++; if (a === 'sol') sawSol = true; },
    onAnswer(i) {
      const ok = p.q.options[i] === p.q.answer;
      const m = $app.querySelector('.msg');
      if (ok) {
        this.reveal = true;
        if (counted) return;
        counted = true;
        const ms = Date.now() - t0;
        markSolved(id);
        const res = prof.recordPractice({ id, level, ms, ok1: wrongs === 0, hints, sol: sawSol, daily: isDaily });
        const combo = res.profile.combo;
        m.innerHTML = `✅ ${PRAISE[Math.floor(Math.random() * PRAISE.length)]} <span class="muted">${fmtMs(ms)}</span>${combo >= 2 ? ` <span class="combo big">⚡ ${combo}'lü kombo!</span>` : ''}`;
        m.className = 'msg ok';
        play(combo >= 3 ? 'combo' : 'right');
        confetti(combo >= 5 ? 120 : 60);
        celebrate(res);
        if (isDaily) toast('<b>☀️ Günün bulmacası tamam!</b> +20 ekstra puan', 'level', 3500);
        refreshHud();
      } else {
        wrongs++;
        m.textContent = '❌ Bu değil, tekrar dene. Bulmacayı çözmek yardımcı olur.'; m.className = 'msg warn';
        play('wrong');
        shake($app.querySelector('.qcard'));
        if (!counted && wrongs === 1) { prof.practiceWrong(); refreshHud(); }
      }
    },
  });
}

// ---------- yarışma provası ----------
const KINDTXT = { okul: 'Okul İçi', final: 'Final' };
const EXAM = {
  okul: { title: 'Okul İçi Seçmeleri Provası', minutes: 60 },
  final: { title: 'Final Provası', minutes: 90 },
};
function newExam(kind, level) {
  const okul = GAMES.filter((g) => g.stage === 'okul').map((g) => g.id);
  const all = GAMES.map((g) => g.id);
  const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
  let ids;
  if (kind === 'okul') ids = [...okul, rnd(okul)];
  else ids = [...all, rnd(all), rnd(all), rnd(all), rnd(all), rnd(all), rnd(all), rnd(all)];
  const items = ids.map((id, i) => ({ id, seed: newSeed(), level, spare: kind === 'final' && i >= 22 }));
  return { kind, level, items, answers: {}, startedAt: Date.now(), finished: false };
}
const examKey = (k) => 'zo-exam-' + k;
let timerId = null;
const scratch = {}; // soru başına karalama durumu

function examScreen(kind, sub) {
  clearInterval(timerId);
  const E = EXAM[kind];
  let ex = store.get(examKey(kind), null);
  if (!ex || sub === undefined) {
    // giriş ekranı
    const running = ex && !ex.finished;
    $app.innerHTML = `
      <div class="bar"><a class="back" href="#/">← Ana sayfa</a></div>
      <h1 class="gtitle">🏁 ${E.title}</h1>
      <div class="panel">
        <p>${kind === 'okul' ? '15 soru, 60 dakika. Okul içi seçmelerindeki 14 oyun türünün her birinden bir soru ve bir ek soru gelir.' : '22 asıl + 3 yedek soru, 90 dakika. Tüm 18 oyun türü (finalde eklenen Apartmanlar, Sayı Bulmaca, Tapa, Kakuro dahil) yer alır. Yedek sorular eşitlik bozmak içindir.'}</p>
        <p>Her soruda bulmacayı ekranda çözebilir (karalama), sonra 4 şıktan birini işaretlersin. İstediğin soruya geçebilir, cevabını değiştirebilirsin. Süre bitince sınav otomatik biter.</p>
        <div class="levels">
          <button class="btn big" data-l="kolay">Kolay başla</button>
          <button class="btn big" data-l="orta">Orta başla</button>
        </div>
        ${running ? '<p><a class="btn ghost" href="#/prova/' + kind + '/1">Yarım kalan provaya devam et ➜</a></p>' : ''}
        ${ex && ex.finished ? '<p><a class="btn ghost" href="#/prova/' + kind + '/sonuc">Son provanın sonuçları</a></p>' : ''}
      </div>`;
    $app.querySelectorAll('[data-l]').forEach((b) => b.addEventListener('click', () => {
      const e = newExam(kind, b.dataset.l);
      for (const k in scratch) delete scratch[k];
      store.set(examKey(kind), e);
      location.hash = `#/prova/${kind}/1`;
    }));
    return;
  }
  const total = ex.items.length;
  const left = () => ex.startedAt + E.minutes * 60000 - Date.now();
  if (!ex.finished && left() <= 0) { ex.finished = true; store.set(examKey(kind), ex); }
  if (sub === 'sonuc' || ex.finished) return examResults(kind, ex);

  const qi = Math.max(1, Math.min(total, parseInt(sub, 10) || 1)) - 1;
  const it = ex.items[qi];
  const g = byId[it.id];
  const main = ex.items.filter((x) => !x.spare).length;
  $app.innerHTML = `
    <div class="bar exam-bar"><span class="timer">⏱ <b id="tm"></b></span><span>${it.spare ? 'Yedek soru ' + (qi - main + 1) : 'Soru ' + (qi + 1) + ' / ' + main}</span><span class="barbtns">${fsBtn()}<button class="btn small" id="finish">Bitir</button></span></div>
    <div class="nav">${ex.items.map((x, i) => `<a href="#/prova/${kind}/${i + 1}" class="nq ${i === qi ? 'cur' : ''} ${ex.answers[i] != null ? 'done' : ''} ${x.spare ? 'spare' : ''}">${x.spare ? 'Y' + (i - main + 1) : i + 1}</a>`).join('')}</div>
    <h2 class="qtype">${g.icon} ${g.name}</h2>
    <details class="rules"><summary>Kural</summary><p>${esc(g.rules)}</p><a class="learnlink" href="#/ders/${it.id}">▶ Animasyonlu dersi izle (süre işlemeye devam eder)</a></details>
    <div class="puz"><p class="loading">Soru hazırlanıyor…</p></div>
    <div class="qnav">
      ${qi > 0 ? `<a class="btn ghost" href="#/prova/${kind}/${qi}">← Önceki</a>` : '<span></span>'}
      ${qi < total - 1 ? `<a class="btn" href="#/prova/${kind}/${qi + 2}">Sonraki →</a>` : '<button class="btn" id="finish2">Sınavı bitir</button>'}
    </div>`;
  const tick = () => {
    const ms = left();
    if (ms <= 0) { clearInterval(timerId); ex.finished = true; store.set(examKey(kind), ex); examResults(kind, ex); return; }
    const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
    const el = document.getElementById('tm');
    if (el) { el.textContent = `${m}:${String(s).padStart(2, '0')}`; el.parentElement.classList.toggle('low', ms < 5 * 60000); }
  };
  tick();
  timerId = setInterval(tick, 1000);
  const finish = () => {
    const un = ex.items.filter((x, i) => !x.spare && ex.answers[i] == null).length;
    if (confirm(un ? `${un} soru boş. Yine de bitirmek istiyor musun?` : 'Sınavı bitirmek istiyor musun?')) {
      ex.finished = true; ex.endedAt = Date.now(); store.set(examKey(kind), ex); clearInterval(timerId);
      location.hash = `#/prova/${kind}/sonuc`;
    }
  };
  document.getElementById('finish').addEventListener('click', finish);
  const f2 = document.getElementById('finish2');
  if (f2) f2.addEventListener('click', finish);

  setTimeout(() => {
    const p = puzzle(it.id, it.level, it.seed);
    const sk = kind + qi + it.seed;
    const ui = mountPuzzle($app.querySelector('.puz'), g, p, {
      exam: true,
      chosen: ex.answers[qi],
      state: scratch[sk],
      onAnswer(i) { ex.answers[qi] = i; store.set(examKey(kind), ex); document.querySelectorAll('.nq')[qi].classList.add('done'); },
    });
    scratch[sk] = ui.state;
  }, 20);
}

function examResults(kind, ex) {
  clearInterval(timerId);
  const E = EXAM[kind];
  const rows = [];
  let correct = 0, wrong = 0, empty = 0, spareOk = 0;
  const main = ex.items.filter((x) => !x.spare).length;
  ex.items.forEach((it, i) => {
    const p = puzzle(it.id, it.level, it.seed);
    const a = ex.answers[i];
    const ok = a != null && p.q.options[a] === p.q.answer;
    if (it.spare) { if (ok) spareOk++; }
    else if (a == null) empty++; else if (ok) correct++; else wrong++;
    rows.push({ it, i, p, a, ok });
  });
  if (!ex.endedAt) ex.endedAt = Math.min(Date.now(), ex.startedAt + E.minutes * 60000);
  const used = Math.min(E.minutes * 60000, ex.endedAt - ex.startedAt);
  let fresh = null;
  if (!ex.scored) {
    ex.scored = true;
    const pr = progress();
    const prevBest = pr.best[kind];
    if (!prevBest || correct > prevBest.correct) pr.best[kind] = { correct, total: main, at: Date.now() };
    store.set('zo-progress', pr);
    fresh = prof.recordExam({ kind, level: ex.level, ms: used, correct, wrong, empty, spareOk, total: main, items: rows.map(({ it, a, ok }) => ({ id: it.id, ok, ans: a != null, spare: !!it.spare })) });
    ex.cmp = { me: { t: Date.now(), correct, wrong, empty, ms: used, total: main }, prev: fresh.prev, best: fresh.best };
  }
  store.set(examKey(kind), ex);
  const nm = prof.get().name;
  $app.innerHTML = `
    <div class="bar"><a class="back" href="#/">← Ana sayfa</a></div>
    <h1 class="gtitle">📋 ${nm ? esc(nm) + ' — ' : ''}${E.title} Sonucu</h1>
    <div class="score">
      <div class="sname">${correct / main >= 0.8 ? '🏆 Muhteşem!' : correct / main >= 0.5 ? '👏 Çok iyi gidiyorsun!' : '💪 Çalıştıkça daha iyi olacak!'}</div>
      <div class="big">${correct}<small>/${main}</small></div>
      <div>✅ Doğru: <b>${correct}</b> · ❌ Yanlış: <b>${wrong}</b> · ⬜ Boş: <b>${empty}</b>${kind === 'final' ? ` · Yedek doğru: <b>${spareOk}</b>/3` : ''}</div>
      <div class="muted">Geçen süre: ${Math.floor(used / 60000)} dk ${Math.floor((used % 60000) / 1000)} sn · Seviye: ${ex.level === 'orta' ? 'Orta' : 'Kolay'}</div>
      ${ex.cmp && ex.cmp.prev ? compareHtml(ex.cmp.me, ex.cmp.prev, 'Bir önceki provana göre:') : ex.cmp ? `<p class="muted">Bu ilk ${KINDTXT[kind]} provan. Bir sonrakinde karşılaştırma göreceksin!</p>` : ''}
      ${ex.cmp && ex.cmp.best && (!ex.cmp.prev || ex.cmp.best.t !== ex.cmp.prev.t) ? compareHtml(ex.cmp.me, ex.cmp.best, 'En iyi provana göre:') : ''}
      <div class="levels"><a class="btn big" href="#/prova/${kind}">Yeni prova başlat</a><a class="btn big ghost" href="#/gecmis">📈 Gelişimim</a></div>
    </div>
    <div class="results">${rows.map(({ it, i, p, a, ok }) => `
      <div class="rrow ${a == null ? 'empty' : ok ? 'ok' : 'bad'}">
        <div class="rhead"><span>${it.spare ? 'Y' + (i - main + 1) : i + 1}. ${byId[it.id].icon} ${byId[it.id].name}</span>
        <span>Senin: <b>${a == null ? '—' : LETTERS[a] + ') ' + esc(p.q.options[a])}</b> · Doğru: <b>${LETTERS[p.q.options.indexOf(p.q.answer)]}) ${esc(p.q.answer)}</b></span>
        <button class="btn small ghost" data-i="${i}">Çözümü gör</button></div>
        <div class="rbody" id="rb${i}"></div>
      </div>`).join('')}</div>`;
  if (fresh) {
    if (correct / main >= 0.5) confetti(correct / main >= 0.8 ? 160 : 80);
    play(correct / main >= 0.5 ? 'level' : 'right');
    celebrate(fresh);
  }
  $app.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => {
    const i = +b.dataset.i, el = document.getElementById('rb' + i);
    if (el.innerHTML) { el.innerHTML = ''; return; }
    const { it, p, a } = rows[i];
    const ui = mountPuzzle(el, byId[it.id], p, { exam: true, chosen: a, reveal: true, lockOptions: true });
    ui.showSolution();
    el.querySelectorAll('.actions,.palette,.tip').forEach((x) => x.remove());
  }));
}

// ---------- animasyonlu ders ----------
function watched() { return store.get('zo-lessons', {}); }
function lessonScreen(id) {
  const g = byId[id];
  const idx = GAMES.indexOf(g);
  const next = GAMES[(idx + 1) % GAMES.length];
  $app.innerHTML = `
    <div class="bar"><a class="back" href="#/">← Ana sayfa</a><a class="back" href="#/oyun/${id}/kolay">Oyuna git →</a>${fsBtn()}</div>
    <h1 class="gtitle">${g.icon} ${g.name} <small class="tag">Nasıl oynanır?</small></h1>
    <div class="lroot"><p class="loading">Ders hazırlanıyor…</p></div>
    <div class="lnav"><a class="btn ghost" href="#/ders/${next.id}">Sonraki ders: ${next.icon} ${next.name} →</a></div>`;
  setTimeout(() => {
    const { p, steps } = buildLesson(g);
    const ui = mountLesson($app.querySelector('.lroot'), g, p, steps, {
      tryHref: `#/oyun/${id}/kolay/${newSeed()}`,
      onFinish() { const w = watched(); if (!w[id]) { w[id] = true; store.set('zo-lessons', w); celebrate(prof.lessonDone()); confetti(50); } },
    });
    setTimeout(() => ui.play(), 600);
  }, 20);
}
