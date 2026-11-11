// Profil, puan (XP), seviye, rozet, gün serisi ve geçmiş kayıtları.
// Saf fonksiyonlar + verilen depolama (store) üzerinde çalışan küçük bir sarmalayıcı.

export const LEVELS = [
  { name: 'Çırak', icon: '🐣', min: 0 },
  { name: 'Meraklı', icon: '🔍', min: 100 },
  { name: 'Kâşif', icon: '🧭', min: 300 },
  { name: 'Usta', icon: '🛠️', min: 700 },
  { name: 'Dahi', icon: '🧠', min: 1500 },
  { name: 'Efsane', icon: '👑', min: 3000 },
];

export function levelOf(xp) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].min) i++;
  const cur = LEVELS[i], nx = LEVELS[i + 1];
  const pct = nx ? Math.round(((xp - cur.min) / (nx.min - cur.min)) * 100) : 100;
  return { i, ...cur, next: nx || null, pct, toNext: nx ? nx.min - xp : 0 };
}

// Yerel tarih anahtarı (YYYY-MM-DD)
export function dayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function prevDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
}

// Gün serisi: aynı gün tekrar → değişmez; dün oynandıysa +1; daha eskiyse 1'den başlar
export function bumpStreak(streak, today) {
  const s = streak || { last: null, count: 0, best: 0 };
  if (s.last === today) return s;
  const count = s.last === prevDay(today) ? s.count + 1 : 1;
  return { last: today, count, best: Math.max(s.best || 0, count) };
}

// Prova karşılaştırması: cur ve prev {correct, wrong, empty, ms}
export function compareExams(cur, prev) {
  if (!cur || !prev) return null;
  const d = { correct: cur.correct - prev.correct, wrong: cur.wrong - prev.wrong, empty: cur.empty - prev.empty, ms: cur.ms - prev.ms };
  const parts = [];
  if (d.correct) parts.push({ good: d.correct > 0, text: `${Math.abs(d.correct)} doğru ${d.correct > 0 ? 'fazla ▲' : 'az ▼'}` });
  else parts.push({ good: null, text: 'doğru sayısı aynı' });
  if (d.wrong) parts.push({ good: d.wrong < 0, text: `${Math.abs(d.wrong)} yanlış ${d.wrong < 0 ? 'az ▼' : 'fazla ▲'}` });
  const min = Math.round(Math.abs(d.ms) / 60000);
  if (min >= 1) parts.push({ good: d.ms < 0, text: `${min} dk daha ${d.ms < 0 ? 'hızlı ⚡' : 'yavaş 🐢'}` });
  else parts.push({ good: null, text: 'süre neredeyse aynı' });
  return { d, parts };
}

export const fmtMs = (ms) => {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} sn`;
  const m = Math.floor(s / 60);
  return s % 60 ? `${m} dk ${s % 60} sn` : `${m} dk`;
};

// ---------- rozetler ----------
// ctx: { profile, history, solvedTotal, solvedBy, lessonsWatched, gameCount }
export const BADGES = [
  { id: 'ilk', icon: '🌱', name: 'İlk Adım', desc: 'İlk soruyu doğru cevapla', test: (c) => c.solvedTotal >= 1 },
  { id: 'on', icon: '🔟', name: 'On Parmak', desc: '10 soru çöz', test: (c) => c.solvedTotal >= 10 },
  { id: 'elli', icon: '🏅', name: 'Elli Bulmaca', desc: '50 soru çöz', test: (c) => c.solvedTotal >= 50 },
  { id: 'yuz', icon: '💯', name: 'Yüzler Kulübü', desc: '100 soru çöz', test: (c) => c.solvedTotal >= 100 },
  { id: 'kasif', icon: '🧭', name: 'Her Şeyi Dene', desc: '18 oyun türünün hepsinden en az bir soru çöz', test: (c) => Object.keys(c.solvedBy).filter((k) => c.solvedBy[k] > 0).length >= c.gameCount },
  { id: 'ogrenci', icon: '📚', name: 'Çalışkan Öğrenci', desc: 'Bütün animasyonlu dersleri izle', test: (c) => c.lessonsWatched >= c.gameCount },
  { id: 'hizli', icon: '⚡', name: 'Hızlı Beyin', desc: 'Bir soruyu 1 dakikadan kısa sürede ilk denemede bil', test: (c) => c.history.practice.some((x) => x.ok1 && x.ms < 60000 && !x.sol) },
  { id: 'hatasiz', icon: '🎯', name: 'Hatasız', desc: 'Art arda 5 soruyu ilk denemede bil', test: (c) => (c.profile.bestCombo || 0) >= 5 },
  { id: 'kombo10', icon: '🔥', name: 'Ateş Gibi', desc: 'Art arda 10 soruyu ilk denemede bil', test: (c) => (c.profile.bestCombo || 0) >= 10 },
  { id: 'prova', icon: '🏁', name: 'İlk Prova', desc: 'Bir yarışma provasını bitir', test: (c) => c.history.exams.length >= 1 },
  { id: 'kahraman', icon: '🦸', name: 'Prova Kahramanı', desc: 'Bir provada %80 ya da daha fazla doğru yap', test: (c) => c.history.exams.some((e) => e.total && e.correct / e.total >= 0.8) },
  { id: 'final', icon: '⚔️', name: 'Final Savaşçısı', desc: 'Final provasını bitir', test: (c) => c.history.exams.some((e) => e.kind === 'final') },
  { id: 'gelisim', icon: '📈', name: 'Gelişiyorum', desc: 'Bir provada öncekinden daha çok doğru yap', test: (c) => improved(c.history.exams) },
  { id: 'seri3', icon: '📅', name: '3 Gün Seri', desc: '3 gün üst üste çalış', test: (c) => (c.profile.streak?.best || 0) >= 3 },
  { id: 'seri7', icon: '🗓️', name: 'Bir Hafta', desc: '7 gün üst üste çalış', test: (c) => (c.profile.streak?.best || 0) >= 7 },
  { id: 'gunluk', icon: '☀️', name: 'Günün Yıldızı', desc: 'Günün bulmacasını çöz', test: (c) => Object.keys(c.profile.daily || {}).length >= 1 },
];
function improved(exams) {
  for (let i = 1; i < exams.length; i++) {
    const prev = exams.slice(0, i).filter((e) => e.kind === exams[i].kind).pop();
    if (prev && exams[i].correct > prev.correct) return true;
  }
  return false;
}
export function newBadges(ctx) {
  const have = ctx.profile.badges || {};
  return BADGES.filter((b) => !have[b.id] && b.test(ctx)).map((b) => b.id);
}

// ---------- puanlar ----------
export const XP = {
  practice(level, firstTry, sawSolution) {
    if (sawSolution) return 2;
    return (level === 'orta' ? 15 : 10) + (firstTry ? 5 : 0);
  },
  lesson: 5,
  examCorrect: 10,
  daily: 20,
};

// ---------- günün bulmacası ----------
export function dailyPick(gameIds, today = dayKey()) {
  let h = 2166136261;
  for (const ch of today) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return { id: gameIds[(h >>> 0) % gameIds.length], seed: 'GUN-' + today.replace(/-/g, '') };
}

// ---------- depolama sarmalayıcısı ----------
export const PRACTICE_CAP = 500;
const EMPTY_PROFILE = () => ({ name: '', createdAt: Date.now(), xp: 0, badges: {}, streak: null, combo: 0, bestCombo: 0, daily: {} });
const EMPTY_HISTORY = () => ({ exams: [], practice: [] });

export function createProfile(store, { gameCount = 18 } = {}) {
  const get = () => ({ ...EMPTY_PROFILE(), ...store.get('zo-profile', {}) });
  const hist = () => ({ ...EMPTY_HISTORY(), ...store.get('zo-history', {}) });
  const save = (p) => store.set('zo-profile', p);
  const saveHist = (h) => store.set('zo-history', h);

  function ctx(p = get(), h = hist()) {
    const prog = store.get('zo-progress', { solved: {} });
    const solvedBy = prog.solved || {};
    const solvedTotal = Object.values(solvedBy).reduce((s, x) => s + x, 0);
    return { profile: p, history: h, solvedBy, solvedTotal, lessonsWatched: Object.keys(store.get('zo-lessons', {})).length, gameCount };
  }
  // XP ekle; seviye atlama ve yeni rozetleri döndür
  function award(xp, mutate) {
    const p = get();
    const before = levelOf(p.xp);
    p.xp += xp;
    p.streak = bumpStreak(p.streak, dayKey());
    if (mutate) mutate(p);
    const fresh = newBadges(ctx(p));
    for (const id of fresh) p.badges[id] = Date.now();
    save(p);
    const after = levelOf(p.xp);
    return { xp, total: p.xp, levelUp: after.i > before.i ? after : null, badges: fresh.map((id) => BADGES.find((b) => b.id === id)), profile: p };
  }
  return {
    get, hist, ctx,
    setName(name) { const p = get(); p.name = String(name).trim().slice(0, 24); save(p); return p; },
    award,
    practiceWrong() { const p = get(); p.combo = 0; save(p); },
    recordPractice(rec) {
      // rec: { id, level, ms, ok1, hints, sol, daily }
      const h = hist();
      h.practice.push({ t: Date.now(), ...rec });
      if (h.practice.length > PRACTICE_CAP) h.practice = h.practice.slice(-PRACTICE_CAP);
      saveHist(h);
      let xp = XP.practice(rec.level, rec.ok1, rec.sol);
      const today = dayKey();
      const isDaily = rec.daily && !get().daily[today];
      if (isDaily) xp += XP.daily;
      return award(xp, (p) => {
        if (rec.ok1 && !rec.sol) { p.combo = (p.combo || 0) + 1; p.bestCombo = Math.max(p.bestCombo || 0, p.combo); } else p.combo = 0;
        if (isDaily) p.daily[today] = true;
      });
    },
    recordExam(rec) {
      // rec: { kind, level, ms, correct, wrong, empty, spareOk, total, items:[{id, ok, ans}] }
      const h = hist();
      const prev = h.exams.filter((e) => e.kind === rec.kind).pop() || null;
      const best = h.exams.filter((e) => e.kind === rec.kind).sort((a, b) => b.correct - a.correct || a.ms - b.ms)[0] || null;
      h.exams.push({ t: Date.now(), ...rec });
      saveHist(h);
      const res = award(rec.correct * XP.examCorrect);
      return { ...res, prev, best };
    },
    lessonDone() { return award(XP.lesson); },
    checkBadges() { return award(0); },
    exportJSON() {
      return JSON.stringify({ app: 'zeka-oyunlari', version: 1, at: new Date().toISOString(), profile: get(), history: hist(), progress: store.get('zo-progress', null), lessons: store.get('zo-lessons', null) }, null, 1);
    },
    importJSON(text) {
      const d = JSON.parse(text);
      if (!d || d.app !== 'zeka-oyunlari' || !d.profile || !d.history) throw new Error('Bu dosya bu siteye ait bir yedek değil.');
      if (!Array.isArray(d.history.exams) || !Array.isArray(d.history.practice)) throw new Error('Yedek dosyası bozuk.');
      save({ ...EMPTY_PROFILE(), ...d.profile });
      saveHist(d.history);
      if (d.progress) store.set('zo-progress', d.progress);
      if (d.lessons) store.set('zo-lessons', d.lessons);
      return get();
    },
    resetAll() { for (const k of ['zo-profile', 'zo-history', 'zo-progress', 'zo-lessons', 'zo-exam-okul', 'zo-exam-final']) store.del(k); },
  };
}
