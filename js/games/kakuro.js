import { valueGame } from './base.js?v=4';
import { solve, isUnique, reduceClues } from '../core/csp.js?v=4';
import { range, numberOptions } from '../core/util.js?v=4';

function makeMask(rng, R, Cc, maxRun) {
  for (let t = 0; t < 500; t++) {
    const w = range(R).map((r) => range(Cc).map((c) => r > 0 && c > 0 && rng.chance(0.78)));
    let changed = true;
    const runLen = (r, c, dr, dc) => {
      let k = 1, a = r - dr, b = c - dc;
      while (a >= 0 && b >= 0 && w[a][b]) { k++; a -= dr; b -= dc; }
      a = r + dr; b = c + dc;
      while (a < R && b < Cc && w[a][b]) { k++; a += dr; b += dc; }
      return k;
    };
    while (changed) {
      changed = false;
      for (let r = 1; r < R; r++) for (let c = 1; c < Cc; c++) {
        if (!w[r][c]) continue;
        const h = runLen(r, c, 0, 1), v = runLen(r, c, 1, 0);
        if (h < 2 || v < 2 || h > maxRun || v > maxRun) { w[r][c] = false; changed = true; }
      }
    }
    const whites = [];
    for (let r = 0; r < R; r++) for (let c = 0; c < Cc; c++) if (w[r][c]) whites.push([r, c]);
    if (whites.length < (R - 1) * (Cc - 1) * 0.55) continue;
    // bağlılık
    const key = (r, c) => r * Cc + c;
    const seen = new Set([key(...whites[0])]), st = [whites[0]];
    while (st.length) {
      const [r, c] = st.pop();
      for (const [a, b] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) {
        if (a >= 0 && b >= 0 && a < R && b < Cc && w[a][b] && !seen.has(key(a, b))) { seen.add(key(a, b)); st.push([a, b]); }
      }
    }
    if (seen.size === whites.length) return w;
  }
  return null;
}

export default valueGame({
  id: 'kakuro',
  name: 'Kakuro',
  stage: 'final',
  icon: '🧮',
  rules: 'Boş hücreleri 1’den 9’a kadar rakamlarla doldur. Çizgiyle bölünen karelerde, çizginin altındaki sayı aşağıdaki hücrelerin; üstündeki sayı ise sağdaki hücrelerin toplamını verir. Bir toplamdaki rakamlar birbirinden farklı olmalıdır.',
  levels: { kolay: '4×4', orta: '5×5' },
  generate(rng, level) {
    const R0 = level === 'orta' ? 6 : 5, maxRun = level === 'orta' ? 4 : 3;
    for (let t = 0; t < 200; t++) {
      const w0 = makeMask(rng, R0, R0, maxRun);
      if (!w0) continue;
      // boş kalan dış satır/sütunları kırp
      let r0 = R0, c0 = R0, r1 = 0, c1 = 0;
      w0.forEach((row, r) => row.forEach((x, c) => { if (x) { r0 = Math.min(r0, r); c0 = Math.min(c0, c); r1 = Math.max(r1, r); c1 = Math.max(c1, c); } }));
      const w = w0.slice(r0 - 1, r1 + 1).map((row) => row.slice(c0 - 1, c1 + 1));
      const R = w.length, Cc = w[0].length;
      if (Math.min(R, Cc) < 4) continue;
      const idx = {}, cellsList = [];
      for (let r = 0; r < R; r++) for (let c = 0; c < Cc; c++) if (w[r][c]) { idx[r + ',' + c] = cellsList.length; cellsList.push([r, c]); }
      const runs = []; // {vars, head:[r,c], dir}
      for (let r = 0; r < R; r++) for (let c = 0; c < Cc; c++) {
        if (w[r][c]) continue;
        for (const [dr, dc, dir] of [[0, 1, 'r'], [1, 0, 'd']]) {
          const vars = [];
          let a = r + dr, b = c + dc;
          while (a < R && b < Cc && w[a][b]) { vars.push(idx[a + ',' + b]); a += dr; b += dc; }
          if (vars.length) runs.push({ vars, head: [r, c], dir });
        }
      }
      const n = cellsList.length;
      const distinct = runs.map(({ vars }) => ({
        vars,
        check(a) { let seen = 0; for (const v of vars) { if (a[v] < 0) continue; if (seen & (1 << a[v])) return false; seen |= 1 << a[v]; } return true; },
      }));
      const D = range(9).map((i) => i + 1);
      for (let f = 0; f < 15; f++) {
        const fill = solve({ n, domains: range(n).map(() => D), constraints: distinct, limit: 1, rng, maxNodes: 20000 });
        if (!fill.count) break;
        const sol = fill.solution;
        for (const run of runs) run.sum = run.vars.reduce((s, v) => s + sol[v], 0);
        const sumC = runs.map(({ vars, sum }) => ({
          vars,
          check(a) {
            let s = 0, seen = 0, unk = 0;
            for (const v of vars) { if (a[v] < 0) { unk++; continue; } if (seen & (1 << a[v])) return false; seen |= 1 << a[v]; s += a[v]; }
            return unk ? s + unk <= sum && s + 9 * unk >= sum : s === sum;
          },
        }));
        const build = (kept) => ({ n, domains: range(n).map((i) => (kept.has(i) ? [sol[i]] : D)), constraints: sumC, maxNodes: 40000 });
        const none = new Set();
        let givens = none;
        if (!isUnique(build(none))) {
          if (f < 14) continue;
          givens = reduceClues(range(n), (k) => isUnique(build(k)), rng);
        }
        const solG = range(R).map(() => Array(Cc).fill(null));
        const given = range(R).map(() => Array(Cc).fill(null));
        cellsList.forEach(([r, c], i) => { solG[r][c] = String(sol[i]); if (givens.has(i)) given[r][c] = String(sol[i]); });
        const clues = {};
        for (const run of runs) { const k = run.head.join(','); (clues[k] ||= {})[run.dir] = run.sum; }
        const free = range(n).filter((i) => !givens.has(i));
        const pick = rng.shuffle(free).slice(0, 3).map((i) => cellsList[i]);
        const ans = pick.reduce((s, [r, c]) => s + Number(solG[r][c]), 0);
        return {
          rows: R, cols: Cc, sol: solG, given, clues,
          q: { text: 'Kakuro sorusunun çözümünde soru işareti (?) olan hücrelerdeki sayıların toplamı kaçtır?', cells: pick, qmark: true, ...numberOptions(rng, ans, { min: 3 }) },
        };
      }
    }
    throw new Error('kakuro üretilemedi');
  },
  palette: () => range(9).map((i) => String(i + 1)),
  extra: (p) => ({
    cell(r, c) {
      if (p.sol[r][c] != null) return {};
      const k = p.clues[r + ',' + c];
      return k ? { black: true, kakuro: { d: k.d ?? null, r: k.r ?? null } } : { black: true };
    },
  }),
});
