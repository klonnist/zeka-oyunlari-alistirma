import { choiceGame } from './base.js';
import { figGrid, PALETTE } from './visual.js';

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  const r = ch(n >> 16), g = ch((n >> 8) & 255), b = ch(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// h[j][i]: j = derinlik (0 = ön), i = soldan sağa
export function cubesSvg(h, color) {
  const D = h.length, W = h[0].length, s = 30, dx = s * 0.5, dy = -s * 0.5;
  const maxH = Math.max(...h.flat());
  const width = W * s + D * dx + 10, height = maxH * s + D * -dy + s * 0.2 + 10;
  const baseY = height - 5;
  const out = [`<svg viewBox="0 0 ${width} ${height}" class="fig wide">`];
  // zemin
  const P = (i, j) => [5 + i * s + j * dx, baseY + j * dy];
  const g0 = P(0, 0), g1 = P(W, 0), g2 = P(W, D), g3 = P(0, D);
  out.push(`<path d="M${g0}L${g1}L${g2}L${g3}Z" fill="#eef1f6" stroke="#c5cbd8"/>`);
  for (let j = D - 1; j >= 0; j--) for (let i = 0; i < W; i++) for (let k = 0; k < h[j][i]; k++) {
    const [X, Y0] = P(i, j);
    const Y = Y0 - k * s;
    const col = color[j][i];
    const st = 'stroke="#2b2d42" stroke-width="1.2" stroke-linejoin="round"';
    out.push(`<rect x="${X}" y="${Y - s}" width="${s}" height="${s}" fill="${col}" ${st}/>`);
    out.push(`<path d="M${X} ${Y - s}L${X + s} ${Y - s}L${X + s + dx} ${Y - s + dy}L${X + dx} ${Y - s + dy}Z" fill="${shade(col, 1.25)}" ${st}/>`);
    out.push(`<path d="M${X + s} ${Y}L${X + s + dx} ${Y + dy}L${X + s + dx} ${Y - s + dy}L${X + s} ${Y - s}Z" fill="${shade(col, 0.72)}" ${st}/>`);
  }
  out.push('</svg>');
  return out.join('');
}

// üstten görünüm: arka sıra yukarıda
export function topSvg(top, rings = []) {
  const R = top.length, C = top[0].length, s = 22;
  const out = [`<svg viewBox="0 0 ${C * s + 8} ${R * s + 8}" class="fig">`];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const v = top[r][c];
    out.push(`<rect x="${4 + c * s}" y="${4 + r * s}" width="${s}" height="${s}" fill="${v || '#fff'}" stroke="${v ? '#2b2d42' : '#d5dae3'}" stroke-width="1.5"/>`);
  }
  for (const [r, c] of rings) out.push(`<rect class="pulse" x="${5 + c * s}" y="${5 + r * s}" width="${s - 2}" height="${s - 2}" fill="none" stroke="#e4572e" stroke-width="3"/>`);
  out.push('</svg>');
  return out.join('');
}
const keyTop = (t) => t.map((r) => r.join(',')).join('|');

export default choiceGame({
  id: 'ustten',
  name: 'Üstten Görünüş',
  stage: 'okul',
  icon: '🧊',
  rules: 'Küplerden oluşan şekle tam yukarıdan bakıldığında nasıl göründüğünü bul. Üstten görünüşte şeklin arka tarafı yukarıda, ön tarafı aşağıdadır. Her küp kulesinin en üstteki rengi görünür.',
  levels: { kolay: '3×3', orta: '4×3' },
  generate(rng, level) {
    const W = level === 'orta' ? 4 : 3, D = 3;
    for (;;) {
      const cols = rng.shuffle(PALETTE).slice(0, 3);
      const h = Array.from({ length: D }, () => Array.from({ length: W }, () => (rng.chance(0.75) ? rng.int(1, 3) : 0)));
      const filled = h.flat().filter(Boolean).length;
      if (filled < W + 2 || filled === W * D) continue;
      const color = h.map((row) => row.map(() => rng.pick(cols)));
      // üstten: satır 0 = en arka (j = D-1)
      const top = Array.from({ length: D }, (_, r) => Array.from({ length: W }, (_, c) => (h[D - 1 - r][c] ? color[D - 1 - r][c] : '')));
      const k0 = keyTop(top);
      const cands = [
        top.map((row) => row.slice().reverse()), // sağ-sol ayna
        top.slice().reverse(), // ön-arka ayna (yaygın hata)
        top.slice().reverse().map((row) => row.slice().reverse()), // 180°
      ];
      for (let g = 0; g < 20; g++) {
        const t = top.map((row) => row.slice());
        const r = rng.int(0, D - 1), c = rng.int(0, W - 1);
        t[r][c] = t[r][c] ? (rng.chance(0.5) ? '' : rng.pick(cols.filter((x) => x !== t[r][c]))) : rng.pick(cols);
        cands.push(t);
      }
      const seen = new Set([k0]), wrong = [];
      for (const t of cands) { const k = keyTop(t); if (!seen.has(k) && wrong.length < 3) { seen.add(k); wrong.push(t); } }
      if (wrong.length < 3) continue;
      const pos = rng.int(0, 3);
      const opts = rng.shuffle(wrong);
      opts.splice(pos, 0, top);
      return {
        h, color, opts,
        q: { text: 'Verilen şeklin üstten görünüşü hangisidir?', options: ['1', '2', '3', '4'], answer: String(pos + 1) },
      };
    }
  },
  view(p) {
    return { html: `<div class="figmain">${cubesSvg(p.h, p.color)}<div class="hint-front">↓ ön taraf</div></div>` + figGrid(p.opts.map((t, i) => ({ label: String(i + 1), svg: topSvg(t) }))) };
  },
});
