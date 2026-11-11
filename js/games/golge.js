import { choiceGame } from './base.js?v=5';
import { randomPoly, keyOf, transform, isConnected, polySvg, figGrid, PALETTE } from './visual.js?v=5';
import { N4 } from '../core/util.js?v=5';

export default choiceGame({
  id: 'golge',
  name: 'Gölge Bulmaca',
  stage: 'okul',
  icon: '🌑',
  rules: 'Verilen gölgelerden yalnızca bir tanesi resme aittir. Gölge, resimle aynı yöne bakar. Hangisi olduğunu bul.',
  levels: { kolay: '7 kare', orta: '10 kare' },
  generate(rng, level) {
    const size = level === 'orta' ? 10 : 7;
    for (;;) {
      const fig = randomPoly(rng, size, 5).map(([r, c]) => [r, c, rng.pick(PALETTE), rng.chance(0.25) ? rng.pick(['circle', 'star', 'heart']) : '']);
      const k0 = keyOf(fig.map(([r, c]) => [r, c]));
      const seen = new Set([k0]);
      const wrong = [];
      // ayna görüntüsü (simetrik değilse) çok iyi bir çeldirici
      const mir = transform(fig.map(([r, c]) => [r, c]), 4);
      if (!seen.has(keyOf(mir))) { seen.add(keyOf(mir)); wrong.push(mir); }
      for (let g = 0; g < 200 && wrong.length < 3; g++) {
        let cand = fig.map(([r, c]) => [r, c]);
        const mode = rng.int(0, 2);
        if (mode === 0 || mode === 2) {
          // bir kareyi başka yere taşı
          const i = rng.int(0, cand.length - 1);
          const rest = cand.filter((_, k) => k !== i);
          if (!isConnected(rest)) continue;
          const [r, c] = rng.pick(rest), [dr, dc] = rng.pick(N4);
          if (rest.some((x) => x[0] === r + dr && x[1] === c + dc)) continue;
          cand = [...rest, [r + dr, c + dc]];
        } else {
          // bir kare ekle
          const [r, c] = rng.pick(cand), [dr, dc] = rng.pick(N4);
          if (cand.some((x) => x[0] === r + dr && x[1] === c + dc)) continue;
          cand = [...cand, [r + dr, c + dc]];
        }
        const k = keyOf(cand);
        if (seen.has(k)) continue;
        seen.add(k); wrong.push(cand);
      }
      if (wrong.length < 3) continue;
      const pos = rng.int(0, 3);
      const shadows = rng.shuffle(wrong);
      shadows.splice(pos, 0, fig.map(([r, c]) => [r, c]));
      return {
        fig, shadows,
        q: { text: 'Verilen gölgelerden biri resme aittir. Acaba hangisi?', options: ['1', '2', '3', '4'], answer: String(pos + 1) },
      };
    }
  },
  view(p) {
    const main = `<div class="figmain">${polySvg(p.fig, { box: 6, cell: 24 })}</div>`;
    const box = Math.max(6, ...p.shadows.map((s) => Math.max(...s.map((x) => x[0])) + 2), ...p.shadows.map((s) => Math.max(...s.map((x) => x[1])) + 2));
    return { html: main + figGrid(p.shadows.map((s, i) => ({ label: String(i + 1), svg: polySvg(s, { box, cell: 18, shadow: true }) }))) };
  },
});
