import { stateGame } from './base.js';
import { solve, C } from '../core/csp.js';
import { grid, range, numberOptions, N4 } from '../core/util.js';

const FLEETS = { kolay: { n: 5, ships: [3, 2, 1, 1] }, orta: { n: 6, ships: [3, 2, 2, 1, 1, 1] } };

function place(rng, n, ships) {
  for (let t = 0; t < 200; t++) {
    const g = grid(n, n, 0);
    let ok = true;
    for (const L of ships) {
      const opts = [];
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) for (const h of [true, false]) {
        const cells = range(L).map((i) => (h ? [r, c + i] : [r + i, c]));
        if (cells.some(([a, b]) => a >= n || b >= n)) continue;
        let free = true;
        for (const [a, b] of cells) for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          const x = a + dr, y = b + dc;
          if (x >= 0 && y >= 0 && x < n && y < n && g[x][y]) free = false;
        }
        if (free) opts.push(cells);
        if (L === 1) break; // tek hücreli gemide yön önemsiz
      }
      if (!opts.length) { ok = false; break; }
      for (const [a, b] of rng.pick(opts)) g[a][b] = 1;
    }
    if (ok) return g;
  }
  return null;
}

function fleetOf(a, n) {
  const seen = new Set(), sizes = [];
  for (let i = 0; i < n * n; i++) {
    if (a[i] !== 1 || seen.has(i)) continue;
    const st = [i], comp = [];
    seen.add(i);
    while (st.length) {
      const x = st.pop(); comp.push(x);
      const r = Math.floor(x / n), c = x % n;
      for (const [dr, dc] of N4) {
        const y = (r + dr) * n + (c + dc);
        if (r + dr >= 0 && c + dc >= 0 && r + dr < n && c + dc < n && a[y] === 1 && !seen.has(y)) { seen.add(y); st.push(y); }
      }
    }
    const rs = new Set(comp.map((x) => Math.floor(x / n))), cs = new Set(comp.map((x) => x % n));
    if (rs.size > 1 && cs.size > 1) return null; // düz değil
    sizes.push(comp.length);
  }
  return sizes.sort().join(',');
}

export default stateGame({
  id: 'amiral',
  name: 'Amiral Battı',
  stage: 'okul',
  icon: '🚢',
  syms: { on: 'ship', off: 'water' },
  rules: 'Verilen gemileri diyagrama yerleştir. Diyagramın dışındaki sayılar, o satırda ya da sütunda kaç gemi parçası olduğunu gösterir. Gemiler birbirine kenardan ya da köşeden değemez ve verilen su parçasına yerleşemez. Hücreye bir kez dokun: gemi, iki kez: su, üç kez: boş.',
  levels: { kolay: '5×5', orta: '6×6' },
  info: (p) => 'Filo: ' + p.ships.map((L) => '■'.repeat(L)).join('  '),
  generate(rng, level) {
    const { n, ships } = FLEETS[level] || FLEETS.kolay;
    const g = place(rng, n, ships);
    const sol = g.flat();
    const rowC = range(n).map((r) => g[r].reduce((s, x) => s + x, 0));
    const colC = range(n).map((c) => range(n).reduce((s, r) => s + g[r][c], 0));
    const cs = [];
    for (let i = 0; i < n; i++) {
      cs.push(C.countOnes(range(n).map((c) => i * n + c), rowC[i]));
      cs.push(C.countOnes(range(n).map((r) => r * n + i), colC[i]));
    }
    for (let r = 0; r + 1 < n; r++) for (let c = 0; c < n; c++) {
      const a = r * n + c;
      if (c + 1 < n) { const b = a + n + 1; cs.push({ vars: [a, b], check: (x) => !(x[a] === 1 && x[b] === 1) }); }
      if (c > 0) { const b = a + n - 1; cs.push({ vars: [a, b], check: (x) => !(x[a] === 1 && x[b] === 1) }); }
    }
    const want = ships.slice().sort().join(',');
    const final = (a) => fleetOf(a, n) === want;
    const revealed = new Map();
    for (let t = 0; t < 60; t++) {
      const r = solve({ n: n * n, domains: range(n * n).map((i) => (revealed.has(i) ? [sol[i]] : [0, 1])), constraints: cs, final, limit: 2 });
      if (r.count === 1 && !r.aborted) break;
      // çözümlerin farklılaştığı bir hücreyi aç
      const other = r.solutions.find((s) => s.some((v, i) => v !== sol[i])) || r.solutions[0];
      const diff = range(n * n).filter((i) => other[i] !== sol[i]);
      const pref = diff.filter((i) => sol[i] === 1);
      const i = rng.pick(pref.length && rng.chance(0.6) ? pref : diff);
      revealed.set(i, sol[i]);
    }
    const solG = range(n).map((r) => range(n).map((c) => sol[r * n + c]));
    const rev = [...revealed].map(([i, v]) => [Math.floor(i / n), i % n, v]);
    const free = range(n * n).filter((i) => !revealed.has(i));
    // soru hücreleri: 1-4 gemi parçası + geri kalanı su (toplam 5 hücre)
    const shipsFree = rng.shuffle(free.filter((i) => sol[i] === 1)), waterFree = rng.shuffle(free.filter((i) => sol[i] === 0));
    const k = Math.min(rng.int(1, 4), shipsFree.length);
    const pick = rng.shuffle([...shipsFree.slice(0, k), ...waterFree.slice(0, 5 - k)]).map((i) => [Math.floor(i / n), i % n]);
    const ans = pick.reduce((s, [r, c]) => s + solG[r][c], 0);
    return {
      n, rows: n, cols: n, ships, sol: solG, show: grid(n, n, ''), revealed: rev, rowC, colC,
      q: { text: 'Amiral battı sorusunun çözümünde soru işareti (?) olan hücrelere gelecek gemi parçası sayısı kaçtır?', cells: pick, qmark: true, ...numberOptions(rng, ans, { min: 0, spread: 2 }) },
    };
  },
  extra: (p) => ({
    pad: { t: 1, l: 1 },
    outside: [...p.rowC.map((k, i) => ({ side: 'left', i, text: String(k) })), ...p.colC.map((k, i) => ({ side: 'top', i, text: String(k) }))],
  }),
});
