// Çalıştır: node --test tests/   (bu makinede: ELECTRON_RUN_AS_NODE=1 Antigravity.exe --test tests/)
import test from 'node:test';
import assert from 'node:assert/strict';
import { GAMES } from '../js/games/index.js';
import { makeRng } from '../js/core/rng.js';

const N = Number(process.env.N || 150);

for (const g of GAMES) {
  for (const level of ['kolay', 'orta']) {
    test(`${g.id} / ${level}`, () => {
      let worst = 0;
      const pos = [0, 0, 0, 0];
      for (let i = 0; i < N; i++) {
        const t = performance.now();
        const p = g.generate(makeRng(`${g.id}:${level}:${i}`), level);
        worst = Math.max(worst, performance.now() - t);
        const { options, answer } = p.q;
        assert.equal(options.length, 4, 'dört şık');
        assert.equal(new Set(options).size, 4, 'şıklar farklı');
        assert.ok(options.includes(answer), 'doğru cevap şıklarda');
        pos[options.indexOf(answer)]++;
        // aynı tohum -> aynı bulmaca
        if (i < 3) assert.deepEqual(JSON.stringify(g.generate(makeRng(`${g.id}:${level}:${i}`), level).q), JSON.stringify(p.q));
        // çözüm, kontrol fonksiyonundan geçmeli
        if (g.kind === 'value') {
          const u = p.sol.map((row) => row.map((v) => v ?? ''));
          assert.ok(g.check(p, u).done, 'çözüm kontrolü');
          assert.ok(!g.check(p, g.initUser(p)).done || p.sol.flat().every((v, k) => v == null || p.given.flat()[k]), 'boş tahta çözülmüş sayılmamalı');
          if (p.q.cells && p.q.cells.length && /toplam/.test(p.q.text)) {
            const s = p.q.cells.reduce((a, [r, c]) => a + Number(p.sol[r][c]), 0);
            assert.equal(String(s), answer, 'toplam cevabı çözümle tutarlı');
          }
        }
        if (g.kind === 'state') {
          const u = p.sol.map((row) => row.map((v) => (v === 1 ? 1 : v === 0 ? 2 : 0)));
          assert.ok(g.check(p, u).done, 'çözüm kontrolü');
        }
        if (g.kind === 'edge') assert.ok(g.check(p, new Set(p.solEdges)).done, 'çözüm kontrolü');
      }
      assert.ok(worst < 1500, `üretim çok yavaş: ${worst.toFixed(0)} ms`);
      // doğru şık hep aynı yerde olmasın
      assert.ok(Math.max(...pos) < N * 0.6, `şık dağılımı dengesiz: ${pos}`);
      console.log(`  ${g.id}/${level}: en yavaş ${worst.toFixed(0)} ms, cevap yerleri A-D ${pos.join('/')}`);
    });
  }
}
