import { choiceGame } from './base.js?v=4';
import { randomPoly, canonical, transform, isConnected, polySvg, figGrid, PALETTE, keyOf } from './visual.js?v=4';
import { N4 } from '../core/util.js?v=4';

const MARKS = ['circle', 'tri', 'dot', 'star'];

export default choiceGame({
  id: 'farkli',
  name: 'Farklı Şekil',
  stage: 'okul',
  icon: '🧩',
  rules: 'Verilen şekillerden biri diğerlerinden farklıdır. Şekiller döndürülmüş ya da ters çevrilmiş olabilir. Farklı olanı bul.',
  levels: { kolay: '4 şekil', orta: '4 şekil + işaret' },
  generate(rng, level) {
    for (;;) {
      const size = level === 'orta' ? 7 : 6;
      const color = rng.pick(PALETTE);
      let base = randomPoly(rng, size, 4).map(([r, c]) => [r, c, color, '']);
      const nMarks = level === 'orta' ? 2 : 1;
      const idx = rng.shuffle(base.map((_, i) => i)).slice(0, nMarks);
      idx.forEach((i, k) => (base[i][3] = MARKS[k]));
      const canonBase = canonical(base);
      // simetrik şekilleri ele (dönüşümler birbirine benzemesin)
      const forms = new Set([0, 1, 2, 3, 4, 5, 6, 7].map((t) => keyOf(transform(base, t))));
      if (forms.size < 4) continue;
      // farklı şekil: bir işaret yer değiştir ya da bir kare taşı
      let odd = null;
      for (let g = 0; g < 50 && !odd; g++) {
        const cand = base.map((x) => x.slice());
        if (rng.chance(0.5)) {
          const i = idx[0], j = rng.int(0, cand.length - 1);
          if (i === j) continue;
          [cand[i][3], cand[j][3]] = [cand[j][3], cand[i][3]];
        } else {
          const i = rng.int(0, cand.length - 1);
          const rest = cand.filter((_, k) => k !== i);
          if (!isConnected(rest)) continue;
          const [r, c] = rng.pick(rest);
          const [dr, dc] = rng.pick(N4);
          if (rest.some((x) => x[0] === r + dr && x[1] === c + dc)) continue;
          cand[i] = [r + dr, c + dc, color, cand[i][3]];
        }
        if (isConnected(cand) && canonical(cand) !== canonBase) odd = cand;
      }
      if (!odd) continue;
      const ts = rng.shuffle([...forms]).slice(0, 3);
      const fig = [0, 1, 2, 3, 4, 5, 6, 7];
      const tlist = rng.shuffle(fig);
      const shapes = tlist.slice(0, 3).map((t) => transform(base, t));
      const oddPos = rng.int(0, 3);
      shapes.splice(oddPos, 0, transform(odd, rng.pick(fig)));
      void ts;
      return {
        shapes,
        q: { text: 'Verilen şekillerden hangisi diğerlerinden farklıdır? Şekiller döndürülmüş ya da ters çevrilmiş olabilir.', options: ['1', '2', '3', '4'], answer: String(oddPos + 1) },
      };
    }
  },
  view(p) {
    return { html: figGrid(p.shapes.map((s, i) => ({ label: String(i + 1), svg: polySvg(s, { box: 5, cell: 22 }) }))) };
  },
});
