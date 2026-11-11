// Görsel sorular için çokgen (poliomino) ve SVG yardımcıları
import { N4 } from '../core/util.js?v=5';

export const PALETTE = ['#e4572e', '#3a86ff', '#ffbe0b', '#2a9d8f', '#9b5de5', '#f15bb5', '#43aa8b', '#fb8500'];

// hücreler: [[r,c,extra?], ...]
export function randomPoly(rng, size, box) {
  for (;;) {
    const set = new Map();
    const s = [rng.int(0, box - 1), rng.int(0, box - 1)];
    set.set(s.join(','), s);
    let g = 0;
    while (set.size < size && g++ < 500) {
      const [r, c] = rng.pick([...set.values()]);
      const [dr, dc] = rng.pick(N4);
      const a = r + dr, b = c + dc;
      if (a < 0 || b < 0 || a >= box || b >= box) continue;
      set.set(a + ',' + b, [a, b]);
    }
    if (set.size === size) return [...set.values()];
  }
}

export function normalize(cells) {
  const minR = Math.min(...cells.map((x) => x[0])), minC = Math.min(...cells.map((x) => x[1]));
  return cells.map(([r, c, ...rest]) => [r - minR, c - minC, ...rest]).sort((p, q) => p[0] - q[0] || p[1] - q[1]);
}
export const keyOf = (cells) => normalize(cells).map((x) => x.join(':')).join('|');

export function transform(cells, t) {
  // t: 0..7 (4 dönüş × ayna)
  let out = cells.map(([r, c, ...rest]) => [r, c, ...rest]);
  if (t >= 4) out = out.map(([r, c, ...rest]) => [r, -c, ...rest]);
  for (let k = 0; k < t % 4; k++) out = out.map(([r, c, ...rest]) => [c, -r, ...rest]);
  return normalize(out);
}
export const canonical = (cells) => [0, 1, 2, 3, 4, 5, 6, 7].map((t) => keyOf(transform(cells, t))).sort()[0];

export function isConnected(cells) {
  const set = new Set(cells.map(([r, c]) => r + ',' + c));
  const start = cells[0];
  const seen = new Set([start[0] + ',' + start[1]]), st = [start];
  while (st.length) {
    const [r, c] = st.pop();
    for (const [dr, dc] of N4) {
      const k = (r + dr) + ',' + (c + dc);
      if (set.has(k) && !seen.has(k)) { seen.add(k); st.push([r + dr, c + dc]); }
    }
  }
  return seen.size === cells.length;
}

// Poliomino çiz. cells: [[r,c,color?,marker?]]
export function polySvg(cells, { cell = 22, box = 5, fill = null, stroke = '#2b2d42', label = null, shadow = false, red = [], ghost = [], norm = true } = {}) {
  const W = box * cell + 10;
  const n = norm ? normalize(cells) : cells;
  const all = [...n, ...ghost];
  const h = Math.max(...all.map((x) => x[0])) + 1, w = Math.max(...all.map((x) => x[1])) + 1;
  const ox = (W - w * cell) / 2, oy = (W - h * cell) / 2;
  const parts = [`<svg viewBox="0 0 ${W} ${W}" class="fig">`];
  for (const [r, c, color, marker] of n) {
    const x = ox + c * cell, y = oy + r * cell;
    const f = shadow ? '#2b2d42' : fill || color || '#3a86ff';
    parts.push(`<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${f}" stroke="${shadow ? '#2b2d42' : stroke}" stroke-width="1.5"/>`);
    if (marker && !shadow) parts.push(markerSvg(marker, x + cell / 2, y + cell / 2, cell * 0.32));
  }
  const isIn = (arr, r, c) => arr.some((x) => x[0] === r && x[1] === c);
  for (const [r, c] of n) if (isIn(red, r, c)) parts.push(`<rect class="pulse" x="${ox + c * cell + 2}" y="${oy + r * cell + 2}" width="${cell - 4}" height="${cell - 4}" fill="#e4572e" fill-opacity=".85" stroke="#e4572e" stroke-width="2"/>`);
  for (const [r, c] of ghost) parts.push(`<rect class="pulse" x="${ox + c * cell + 1}" y="${oy + r * cell + 1}" width="${cell - 2}" height="${cell - 2}" fill="none" stroke="#e4572e" stroke-width="2.5" stroke-dasharray="4 3"/>`);
  parts.push('</svg>');
  return parts.join('');
}

export function markerSvg(m, cx, cy, s) {
  switch (m) {
    case 'circle': return `<circle cx="${cx}" cy="${cy}" r="${s}" fill="#fff" stroke="#2b2d42" stroke-width="1.5"/>`;
    case 'dot': return `<circle cx="${cx}" cy="${cy}" r="${s * 0.8}" fill="#2b2d42"/>`;
    case 'tri': return `<path d="M${cx} ${cy - s}L${cx + s} ${cy + s * 0.8}L${cx - s} ${cy + s * 0.8}Z" fill="#fff" stroke="#2b2d42" stroke-width="1.5"/>`;
    case 'square': return `<rect x="${cx - s * 0.8}" y="${cy - s * 0.8}" width="${s * 1.6}" height="${s * 1.6}" fill="#2b2d42"/>`;
    case 'star': {
      let d = '';
      for (let i = 0; i < 10; i++) {
        const R = i % 2 ? s * 0.45 : s * 1.1, a = -Math.PI / 2 + (i * Math.PI) / 5;
        d += (i ? 'L' : 'M') + (cx + R * Math.cos(a)).toFixed(1) + ' ' + (cy + R * Math.sin(a)).toFixed(1);
      }
      return `<path d="${d}Z" fill="#ffbe0b" stroke="#2b2d42" stroke-width="1.2"/>`;
    }
    case 'heart': return `<path d="M${cx} ${cy + s}C${cx - s * 2} ${cy - s * 0.2} ${cx - s * 0.6} ${cy - s * 1.6} ${cx} ${cy - s * 0.5}C${cx + s * 0.6} ${cy - s * 1.6} ${cx + s * 2} ${cy - s * 0.2} ${cx} ${cy + s}Z" fill="#f15bb5" stroke="#2b2d42" stroke-width="1.2"/>`;
    default: return '';
  }
}

export function figGrid(items, cls = '') {
  return `<div class="figs ${cls}">${items.map(({ label, svg, cls: bc = "" }) => `<div class="figbox ${bc}"><div class="figlbl">${label}</div>${svg}</div>`).join("")}</div>`;
}
