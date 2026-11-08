// Ortak yardımcılar: şık üretimi, ızgara yardımcıları
export const LETTERS = ['A', 'B', 'C', 'D'];

// Doğru sayısal cevap + yakın 3 yanlış, karıştırılmış.
// Doğru cevabın yeri (A-D) eşit olasılıklı seçilir; şıklar yarışmadaki gibi küçükten büyüğe.
export function numberOptions(rng, answer, { min = 0, spread = 3 } = {}) {
  const gap = () => rng.int(1, spread >= 3 ? 2 : 1);
  let below = Math.min(rng.int(0, 3), answer - min);
  const opts = [answer];
  let x = answer;
  for (let i = 0; i < below; i++) {
    const nx = x - gap();
    x = nx >= min ? nx : x - 1;
    if (x < min) break;
    opts.unshift(x);
  }
  x = answer;
  while (opts.length < 4) { x += gap(); opts.push(x); }
  return { options: opts.map(String), answer: String(answer) };
}

// Metin cevap + aday üretici fonksiyonu
export function textOptions(rng, answer, makeWrong, { sort = false } = {}) {
  const set = new Set([answer]);
  let guard = 0;
  while (set.size < 4 && guard++ < 500) {
    const w = makeWrong();
    if (w && w !== answer) set.add(w);
  }
  let opts = [...set];
  opts = sort ? opts.sort() : rng.shuffle(opts);
  return { options: opts, answer };
}

export const grid = (r, c, v) => Array.from({ length: r }, () => Array(c).fill(v));
export const clone2 = (g) => g.map((row) => row.slice());
export const range = (n) => Array.from({ length: n }, (_, i) => i);

export const N4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];
export const N8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

// Diyagonal ok (sol üstten sağ alta ya da sağ üstten sol alta)
export function diagonalArrow(rng, n) {
  const anti = rng.chance(0.5);
  const cells = range(n).map((i) => [i, anti ? n - 1 - i : i]);
  return { arrow: { kind: 'diag', anti }, cells };
}

// Rastgele latin kare (1..n), satır/sütun karıştırma ile
export function randomLatin(rng, n) {
  const base = range(n).map((r) => range(n).map((c) => ((r + c) % n) + 1));
  const rows = rng.shuffle(range(n)), cols = rng.shuffle(range(n));
  const syms = rng.shuffle(range(n).map((i) => i + 1));
  return rows.map((r) => cols.map((c) => syms[base[r][c] - 1]));
}

// Kenar anahtarı: (r1,c1)-(r2,c2) komşu noktalar arasındaki doğru parçası
export function edgeKey(r1, c1, r2, c2) {
  if (r1 === r2) return `h${r1},${Math.min(c1, c2)}`;
  return `v${Math.min(r1, r2)},${c1}`;
}
export function parseEdge(k) {
  const [r, c] = k.slice(1).split(',').map(Number);
  return k[0] === 'h' ? [r, c, r, c + 1] : [r, c, r + 1, c];
}
