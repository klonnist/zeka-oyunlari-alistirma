import { stateGame } from './base.js';
import { isUnique, reduceClues } from '../core/csp.js';
import { range, numberOptions, N4 } from '../core/util.js';

// saat yönünde 8 komşu
const RING = [[-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1]];

function pattern(bits) {
  // bits: 8 elemanlı 0/1 dizisi (dairesel)
  if (bits.every((b) => b)) return [8];
  if (!bits.some((b) => b)) return [0];
  const start = bits.indexOf(0);
  const runs = [];
  let k = 0;
  for (let i = 1; i <= 8; i++) {
    const b = bits[(start + i) % 8];
    if (b) k++;
    else if (k) { runs.push(k); k = 0; }
  }
  if (k) runs.push(k);
  return runs.sort((a, b) => a - b);
}

function growBlack(rng, n, target) {
  const g = range(n * n).map(() => 0);
  const s = rng.int(0, n * n - 1);
  g[s] = 1;
  let size = 1;
  const makes2x2 = (i) => {
    const r = Math.floor(i / n), c = i % n;
    for (const [dr, dc] of [[-1, -1], [-1, 0], [0, -1], [0, 0]]) {
      const a = r + dr, b = c + dc;
      if (a < 0 || b < 0 || a + 1 >= n || b + 1 >= n) continue;
      const cells = [a * n + b, a * n + b + 1, (a + 1) * n + b, (a + 1) * n + b + 1];
      if (cells.every((x) => x === i || g[x])) return true;
    }
    return false;
  };
  for (let t = 0; t < 500 && size < target; t++) {
    const front = [];
    for (let i = 0; i < n * n; i++) {
      if (!g[i]) continue;
      const r = Math.floor(i / n), c = i % n;
      for (const [dr, dc] of N4) {
        const a = r + dr, b = c + dc;
        if (a >= 0 && b >= 0 && a < n && b < n && !g[a * n + b]) front.push(a * n + b);
      }
    }
    if (!front.length) break;
    const i = rng.pick(front);
    if (!makes2x2(i)) { g[i] = 1; size++; }
  }
  return g;
}

function connected(a, n) {
  let first = -1, total = 0;
  for (let i = 0; i < n * n; i++) if (a[i] === 1) { total++; if (first < 0) first = i; }
  if (!total) return false;
  const seen = new Set([first]), st = [first];
  while (st.length) {
    const x = st.pop(), r = Math.floor(x / n), c = x % n;
    for (const [dr, dc] of N4) {
      const p = r + dr, q = c + dc, y = p * n + q;
      if (p >= 0 && q >= 0 && p < n && q < n && a[y] === 1 && !seen.has(y)) { seen.add(y); st.push(y); }
    }
  }
  return seen.size === total;
}

export default stateGame({
  id: 'tapa',
  name: 'Tapa',
  stage: 'final',
  icon: '⬛',
  syms: { on: 'fill', off: 'dot' },
  rules: 'Verilen sayılar, çevresindeki 8 hücrede kesintisiz karalanacak hücre sayılarını gösterir. Bir hücrede birden fazla sayı varsa, gruplar arasında en az bir boşluk olmalıdır. Karalanan hücrelerin hepsi kenardan birbirine bağlı olmalı ve 2×2’lik kare oluşturmamalıdır. Sayı içeren hücreler karalanmaz.',
  levels: { kolay: '5×5', orta: '6×6' },
  generate(rng, level) {
    const n = level === 'orta' ? 6 : 5;
    for (let t = 0; t < 100; t++) {
      const blk = growBlack(rng, n, Math.round(n * n * rng.int(40, 50) / 100));
      if (!connected(blk, n)) continue;
      const ringOf = (i) => {
        const r = Math.floor(i / n), c = i % n;
        return RING.map(([dr, dc]) => { const a = r + dr, b = c + dc; return a >= 0 && b >= 0 && a < n && b < n ? a * n + b : -1; });
      };
      const clueOf = (i) => pattern(ringOf(i).map((x) => (x >= 0 ? blk[x] : 0))).join(' ');
      const masksFor = (i, clues) => {
        const ring = ringOf(i), want = clueOf(i), out = [];
        for (let m = 0; m < 256; m++) {
          let okm = true;
          const bits = [];
          for (let k = 0; k < 8; k++) {
            const b = (m >> k) & 1;
            if (b && (ring[k] < 0 || clues.has(ring[k]))) { okm = false; break; }
            bits.push(b);
          }
          if (okm && pattern(bits).join(' ') === want) out.push(m);
        }
        return { ring, masks: out };
      };
      const whites = range(n * n).filter((i) => !blk[i]);
      const build = (clues) => {
        const cs = [];
        for (const i of clues) {
          const { ring, masks } = masksFor(i, clues);
          const vars = ring.filter((x) => x >= 0 && !clues.has(x));
          cs.push({
            vars,
            check(a) {
              let am = 0, bb = 0;
              for (let k = 0; k < 8; k++) {
                const x = ring[k];
                if (x < 0 || clues.has(x)) { am |= 1 << k; continue; }
                if (a[x] >= 0) { am |= 1 << k; if (a[x] === 1) bb |= 1 << k; }
              }
              for (const m of masks) if ((m & am) === bb) return true;
              return false;
            },
          });
        }
        for (let r = 0; r + 1 < n; r++) for (let c = 0; c + 1 < n; c++) {
          const q = [r * n + c, r * n + c + 1, (r + 1) * n + c, (r + 1) * n + c + 1];
          if (q.some((x) => clues.has(x))) continue;
          cs.push({ vars: q, check: (a) => !q.every((x) => a[x] === 1) });
        }
        return {
          n: n * n,
          domains: range(n * n).map((i) => (clues.has(i) ? [0] : [0, 1])),
          constraints: cs.filter((c) => c.vars.length),
          final: (a) => connected(a, n),
          maxNodes: 30000,
        };
      };
      if (!isUnique(build(new Set(whites)))) continue;
      const kept = reduceClues(whites, (k) => isUnique(build(k)), rng, level === 'orta' ? 3 : 5);
      const total = blk.reduce((s, x) => s + x, 0);
      const sol = range(n).map((r) => range(n).map((c) => (kept.has(r * n + c) ? null : blk[r * n + c])));
      const show = range(n).map((r) => range(n).map((c) => (kept.has(r * n + c) ? clueOf(r * n + c) : '')));
      return {
        n, rows: n, cols: n, sol, show,
        q: { text: 'Tapa sorusunun çözümünde kaç hücre karalanmalıdır?', ...numberOptions(rng, total, { min: 1 }) },
      };
    }
    throw new Error('tapa üretilemedi');
  },
});
