// Dersler: her dersin adımları bulmacayı sonuna kadar doğru çözmeli
import test from 'node:test';
import assert from 'node:assert/strict';
import { GAMES } from '../js/games/index.js';
import { buildLesson } from '../js/lessons/index.js';
import { singles } from '../js/lessons/kit.js';

for (const g of GAMES) {
  test(`ders: ${g.id}`, () => {
    const { p, steps } = buildLesson(g);
    assert.ok(steps.length >= 4 && steps.length <= 16, `adım sayısı ${steps.length}`);
    for (const s of steps) assert.ok(s.say && s.say.length > 10, 'anlatım dolu');
    assert.ok(steps[steps.length - 1].qa, 'son adım yarışma sorusu');
    assert.ok(steps[steps.length - 1].say.includes(p.q.answer), 'son adımda doğru cevap söylenir');
    if (g.kind !== 'choice') {
      const last = steps[steps.length - 1].user;
      assert.ok(g.check(p, last).done, 'ders sonunda bulmaca çözülmüş olmalı');
    } else {
      for (const s of steps) assert.ok(s.html && s.html.includes('<svg'), 'görsel adım');
    }
    console.log(`  ${g.id}: ${steps.length} adım`);
  });
}

test('sudoku tek-aday adımları gerçekten tek aday', () => {
  const g = GAMES.find((x) => x.id === 'sudoku');
  const { p } = buildLesson(g);
  const list = singles(p, g.initUser(p), { latin: true, box: p.regions, values: ['1', '2', '3', '4'] });
  const ones = list.filter((s) => s.single);
  assert.ok(ones.length >= list.length * 0.7, `çoğu adım tek aday: ${ones.length}/${list.length}`);
  for (const s of ones) assert.deepEqual(s.left, [s.v]);
});
