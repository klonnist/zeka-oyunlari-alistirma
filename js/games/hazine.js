import { stateGame } from './base.js';
import { isUnique, C, reduceClues } from '../core/csp.js';
import { range, numberOptions, N8 } from '../core/util.js';

export default stateGame({
  id: 'hazine',
  name: 'Hazine Avı',
  stage: 'okul',
  icon: '💎',
  syms: { on: 'diamond', off: 'cross' },
  rules: 'Diyagrama elmaslar yerleştir. Hücrelerin içindeki rakamlar, o hücrenin çevresindeki (kenar ve köşe komşusu olan) 8 hücreye kaç elmas geldiğini gösterir. Rakamlı hücrelere elmas konmaz. Bir kez dokun: elmas, iki kez: boş (×).',
  levels: { kolay: '5×5', orta: '6×6' },
  generate(rng, level) {
    const n = level === 'orta' ? 6 : 5;
    for (let t = 0; t < 200; t++) {
      const dia = range(n * n).map(() => (rng.chance(0.32) ? 1 : 0));
      const cnt = (i) => {
        const r = Math.floor(i / n), c = i % n;
        let k = 0;
        for (const [dr, dc] of N8) { const a = r + dr, b = c + dc; if (a >= 0 && b >= 0 && a < n && b < n) k += dia[a * n + b]; }
        return k;
      };
      const nbr = (i) => {
        const r = Math.floor(i / n), c = i % n, out = [];
        for (const [dr, dc] of N8) { const a = r + dr, b = c + dc; if (a >= 0 && b >= 0 && a < n && b < n) out.push(a * n + b); }
        return out;
      };
      const whites = range(n * n).filter((i) => !dia[i]);
      const build = (clues) => ({
        n: n * n,
        domains: range(n * n).map((i) => (clues.has(i) ? [0] : [0, 1])),
        constraints: [...clues].map((i) => C.countOnes(nbr(i), cnt(i))),
        maxNodes: 30000,
      });
      if (!isUnique(build(new Set(whites)))) continue;
      const kept = reduceClues(whites, (k) => isUnique(build(k)), rng, level === 'orta' ? 0 : Math.ceil(whites.length * 0.6));
      const total = dia.reduce((s, x) => s + x, 0);
      if (total < 4) continue;
      const sol = range(n).map((r) => range(n).map((c) => (kept.has(r * n + c) ? null : dia[r * n + c])));
      const show = range(n).map((r) => range(n).map((c) => (kept.has(r * n + c) ? String(cnt(r * n + c)) : '')));
      return {
        n, rows: n, cols: n, sol, show,
        q: { text: 'Hazine avı sorusunun çözümünde diyagrama kaç adet elmas yerleşir?', ...numberOptions(rng, total, { min: 1 }) },
      };
    }
    throw new Error('hazine üretilemedi');
  },
});
