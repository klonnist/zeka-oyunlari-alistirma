// Profil, puan, seri, rozet, karşılaştırma ve yedekleme testleri
import test from 'node:test';
import assert from 'node:assert/strict';
import { levelOf, bumpStreak, compareExams, createProfile, dailyPick, dayKey, PRACTICE_CAP, XP, fmtMs } from '../js/profile.js';

const memStore = () => {
  const m = new Map();
  return {
    get: (k, d) => (m.has(k) ? JSON.parse(m.get(k)) : d),
    set: (k, v) => m.set(k, JSON.stringify(v)),
    del: (k) => m.delete(k),
    _m: m,
  };
};

test('seviye hesabı', () => {
  assert.equal(levelOf(0).name, 'Çırak');
  assert.equal(levelOf(99).name, 'Çırak');
  assert.equal(levelOf(100).name, 'Meraklı');
  assert.equal(levelOf(200).pct, 50);
  assert.equal(levelOf(5000).name, 'Efsane');
  assert.equal(levelOf(5000).next, null);
});

test('gün serisi', () => {
  let s = bumpStreak(null, '2026-11-09');
  assert.deepEqual([s.count, s.best], [1, 1]);
  s = bumpStreak(s, '2026-11-09');
  assert.equal(s.count, 1, 'aynı gün artmaz');
  s = bumpStreak(s, '2026-11-10');
  s = bumpStreak(s, '2026-11-11');
  assert.deepEqual([s.count, s.best], [3, 3]);
  s = bumpStreak(s, '2026-11-14');
  assert.deepEqual([s.count, s.best], [1, 3], 'gün atlanınca sıfırlanır, en iyi kalır');
  // ay sonu geçişi
  assert.equal(bumpStreak({ last: '2026-11-30', count: 4, best: 4 }, '2026-12-01').count, 5);
});

test('prova karşılaştırması', () => {
  const c = compareExams({ correct: 12, wrong: 2, empty: 1, ms: 30 * 60000 }, { correct: 10, wrong: 3, empty: 2, ms: 34 * 60000 });
  const txt = c.parts.map((p) => p.text);
  assert.deepEqual(txt, ['2 doğru fazla ▲', '1 yanlış az ▼', '4 dk daha hızlı ⚡']);
  assert.ok(c.parts.every((p) => p.good === true));
  const w = compareExams({ correct: 8, wrong: 5, empty: 2, ms: 40 * 60000 }, { correct: 10, wrong: 3, empty: 2, ms: 34 * 60000 });
  assert.ok(w.parts.every((p) => p.good === false));
  assert.equal(compareExams({ correct: 1 }, null), null);
  assert.equal(fmtMs(42000), '42 sn');
  assert.equal(fmtMs(125000), '2 dk 5 sn');
});

test('alıştırma kaydı: puan, kombo, rozet', () => {
  const st = memStore();
  const prof = createProfile(st, { gameCount: 18 });
  prof.setName('  Elif  ');
  assert.equal(prof.get().name, 'Elif');
  st.set('zo-progress', { solved: { sudoku: 1 }, best: {} });
  let r = prof.recordPractice({ id: 'sudoku', level: 'kolay', ms: 30000, ok1: true, hints: 0, sol: false });
  assert.equal(r.xp, XP.practice('kolay', true, false));
  assert.equal(r.profile.combo, 1);
  const ids = r.badges.map((b) => b.id);
  assert.ok(ids.includes('ilk') && ids.includes('hizli'), 'ilk adım ve hızlı beyin');
  for (let i = 0; i < 4; i++) r = prof.recordPractice({ id: 'kendoku', level: 'orta', ms: 90000, ok1: true, hints: 0, sol: false });
  assert.equal(r.profile.bestCombo, 5);
  assert.ok(prof.get().badges.hatasiz, 'hatasız rozeti');
  prof.practiceWrong();
  assert.equal(prof.get().combo, 0);
  r = prof.recordPractice({ id: 'cit', level: 'kolay', ms: 5000, ok1: true, hints: 0, sol: true });
  assert.equal(r.xp, 2, 'çözüme bakınca az puan');
  assert.equal(r.profile.combo, 0);
  // aynı rozet ikinci kez verilmez
  assert.equal(prof.checkBadges().badges.length, 0);
});

test('günün bulmacası bir kez ekstra puan', () => {
  const prof = createProfile(memStore());
  const a = prof.recordPractice({ id: 'tapa', level: 'kolay', ms: 1000, ok1: false, daily: true });
  const b = prof.recordPractice({ id: 'tapa', level: 'kolay', ms: 1000, ok1: false, daily: true });
  assert.equal(a.xp - b.xp, XP.daily);
  assert.ok(prof.get().daily[dayKey()]);
  const d1 = dailyPick(['a', 'b', 'c'], '2026-11-11'), d2 = dailyPick(['a', 'b', 'c'], '2026-11-11');
  assert.deepEqual(d1, d2, 'aynı gün aynı bulmaca');
  assert.equal(d1.seed, 'GUN-20261111');
});

test('prova kaydı, önceki/en iyi ve gelişim rozeti', () => {
  const prof = createProfile(memStore());
  const base = { level: 'kolay', empty: 0, spareOk: 0, total: 15, items: [] };
  let r = prof.recordExam({ kind: 'okul', ms: 40 * 60000, correct: 9, wrong: 6, ...base });
  assert.equal(r.prev, null);
  assert.ok(r.badges.some((b) => b.id === 'prova'));
  r = prof.recordExam({ kind: 'final', ms: 80 * 60000, correct: 10, wrong: 12, ...base, total: 22 });
  assert.equal(r.prev, null, 'farklı türün provası önceki sayılmaz');
  r = prof.recordExam({ kind: 'okul', ms: 35 * 60000, correct: 13, wrong: 2, ...base });
  assert.equal(r.prev.correct, 9);
  assert.equal(r.xp, 130);
  const ids = r.badges.map((b) => b.id);
  assert.ok(ids.includes('gelisim') && ids.includes('kahraman'));
  assert.equal(prof.hist().exams.length, 3);
});

test('alıştırma geçmişi 500 kayıtla sınırlı', () => {
  const prof = createProfile(memStore());
  for (let i = 0; i < PRACTICE_CAP + 20; i++) prof.recordPractice({ id: 'sudoku', level: 'kolay', ms: i, ok1: false });
  const h = prof.hist();
  assert.equal(h.practice.length, PRACTICE_CAP);
  assert.equal(h.practice[0].ms, 20, 'en eskiler atılır');
});

test('yedek dışa/içe aktarma gidiş-dönüş', () => {
  const a = createProfile(memStore());
  a.setName('Ali');
  a.recordExam({ kind: 'okul', level: 'orta', ms: 1000, correct: 5, wrong: 1, empty: 0, spareOk: 0, total: 15, items: [] });
  const json = a.exportJSON();
  const st2 = memStore();
  const b = createProfile(st2);
  b.importJSON(json);
  assert.equal(b.get().name, 'Ali');
  assert.equal(b.hist().exams.length, 1);
  assert.throws(() => b.importJSON('{"app":"baska"}'), /bu siteye ait/);
  assert.throws(() => b.importJSON('bozuk'));
  b.resetAll();
  assert.equal(b.get().name, '');
});
