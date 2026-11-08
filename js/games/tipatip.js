import { choiceGame } from './base.js';
import { markerSvg, figGrid, PALETTE } from './visual.js';
import { textOptions } from '../core/util.js';

const SHAPES = ['circle', 'tri', 'square', 'star', 'heart', 'dot'];

function cardSvg(card, n) {
  const s = 26, W = n * s + 8;
  const out = [`<svg viewBox="0 0 ${W} ${W}" class="fig"><rect x="2" y="2" width="${W - 4}" height="${W - 4}" rx="8" fill="#fff" stroke="#2b2d42" stroke-width="2"/>`];
  card.forEach((cell, i) => {
    const r = Math.floor(i / n), c = i % n;
    const x = 4 + c * s, y = 4 + r * s;
    if (cell.bg) out.push(`<rect x="${x + 1}" y="${y + 1}" width="${s - 2}" height="${s - 2}" rx="4" fill="${cell.bg}"/>`);
    if (cell.m) out.push(markerSvg(cell.m, x + s / 2, y + s / 2, s * 0.28));
  });
  out.push('</svg>');
  return out.join('');
}
const keyCard = (card) => card.map((c) => (c.bg || '-') + '/' + (c.m || '-')).join('|');

export default choiceGame({
  id: 'tipatip',
  name: 'Tıpatıp Bulmaca',
  stage: 'okul',
  icon: '👯',
  rules: 'Verilen resimlerden yalnızca iki tanesi birbirinin tıpatıp aynısıdır. Diğerlerinde küçük birer fark vardır. Aynı olan iki resmi bul.',
  levels: { kolay: '3×3', orta: '4×4' },
  generate(rng, level) {
    const n = level === 'orta' ? 4 : 3;
    const cols = PALETTE.slice(0, 5);
    const base = Array.from({ length: n * n }, () => ({
      bg: rng.chance(0.45) ? rng.pick(cols) : '',
      m: rng.chance(0.55) ? rng.pick(SHAPES) : '',
    }));
    const seen = new Set([keyCard(base)]);
    const others = [];
    let g = 0;
    while (others.length < 6 && g++ < 500) {
      const card = base.map((c) => ({ ...c }));
      const i = rng.int(0, n * n - 1);
      const mode = rng.int(0, 2);
      if (mode === 0) card[i].bg = rng.pick(['', ...cols]);
      else if (mode === 1) card[i].m = rng.pick(['', ...SHAPES]);
      else { const j = rng.int(0, n * n - 1); [card[i], card[j]] = [card[j], card[i]]; }
      const k = keyCard(card);
      if (seen.has(k)) continue;
      seen.add(k); others.push(card);
    }
    const slots = rng.shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
    const [a, b] = [slots[0], slots[1]].sort((x, y) => x - y);
    const cards = Array(8);
    cards[a] = base; cards[b] = base;
    let k = 0;
    for (let i = 0; i < 8; i++) if (!cards[i]) cards[i] = others[k++];
    const ans = `${a + 1}-${b + 1}`;
    const q = {
      text: 'Verilen resimlerden iki tanesi birbirinin aynısıdır. Acaba hangileri?',
      ...textOptions(rng, ans, () => { const x = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 2).sort((p, q2) => p - q2); return `${x[0]}-${x[1]}`; }),
    };
    q.options.sort((x, y) => parseInt(x) - parseInt(y) || parseInt(x.split('-')[1]) - parseInt(y.split('-')[1]));
    return { n, cards, q };
  },
  view(p) {
    return { html: figGrid(p.cards.map((c, i) => ({ label: String(i + 1), svg: cardSvg(c, p.n) })), 'eight') };
  },
});
