import { valueGame } from './base.js?v=5';
import { range, numberOptions } from '../core/util.js?v=5';

function allNumbers(L) {
  const out = [];
  const rec = (s) => {
    if (s.length === L) { out.push(s); return; }
    for (let d = 0; d <= 9; d++) {
      if (s.length === 0 && d === 0) continue;
      if (s.includes(String(d))) continue;
      rec(s + d);
    }
  };
  rec('');
  return out;
}
const score = (secret, g) => {
  let plus = 0, minus = 0;
  for (let i = 0; i < g.length; i++) {
    if (g[i] === secret[i]) plus++;
    else if (secret.includes(g[i])) minus++;
  }
  return plus + ':' + minus;
};
const fmt = (s) => {
  const [p, m] = s.split(':').map(Number);
  const parts = [];
  if (p) parts.push('+' + p);
  if (m) parts.push('−' + m);
  return parts.length ? parts.join(' ') : '0';
};

export default valueGame({
  id: 'sayi',
  name: 'Sayı Bulmaca',
  stage: 'final',
  icon: '🔍',
  rules: 'İpuçlarını değerlendirerek aranan sayıyı bul. Her (−), aranan sayıya ait doğru bir rakamın yanlış yerde; her (+) ise doğru bir rakamın doğru yerde olduğunu gösterir. 0, tahmindeki rakamların hiçbirinin aranan sayıda olmadığını gösterir. Aranan sayıda rakam tekrarı olmaz ve sayı 0 ile başlamaz.',
  levels: { kolay: '3 basamak', orta: '4 basamak' },
  generate(rng, level) {
    const L = level === 'orta' ? 4 : 3;
    const pool = allNumbers(L);
    for (let t = 0; t < 50; t++) {
      const secret = rng.pick(pool);
      let cand = pool.slice();
      const clues = [];
      while (cand.length > 1 && clues.length < 7) {
        let best = null, bestLeft = Infinity;
        for (let k = 0; k < 40; k++) {
          const g = rng.pick(pool);
          if (g === secret || clues.some((c) => c.g === g)) continue;
          const sc = score(secret, g);
          if (sc.startsWith(L + ':')) continue;
          const left = cand.filter((x) => score(x, g) === sc).length;
          // tek ipucuyla bitirmesin; ilerleme sağlasın
          if (left < bestLeft && left < cand.length) { best = { g, sc }; bestLeft = left; }
        }
        if (!best) break;
        clues.push(best);
        cand = cand.filter((x) => score(x, best.g) === best.sc);
      }
      if (cand.length !== 1 || clues.length < 3) continue;
      const rows = clues.length + 1;
      const given = range(rows).map((r) => (r < clues.length ? clues[r].g.split('') : Array(L).fill(null)));
      const sol = range(rows).map((r) => (r < clues.length ? Array(L).fill(null) : secret.split('')));
      const names = 'ABCD'.slice(0, L).split('');
      const ans = secret.split('').reduce((s, d) => s + Number(d), 0);
      return {
        L, rows, cols: L, given, sol, clues: clues.map((c) => fmt(c.sc)),
        q: { text: `Sayı bulmaca sorusunun çözümünde bulunan ${names.join(' + ')} işleminin sonucu kaçtır?`, cells: [], ...numberOptions(rng, ans, { min: 1 }) },
      };
    }
    throw new Error('sayı üretilemedi');
  },
  palette: () => range(10).map(String),
  extra: (p) => ({
    pad: { r: 2.2, t: 0.2 },
    outside: p.clues.map((t, i) => ({ side: 'right', i, text: t, wide: 2 })).concat([{ side: 'right', i: p.rows - 1, text: '= ?', wide: 2 }]),
    cell(r, c) {
      if (r < p.rows - 1) return { fill: '#eef1f6' };
      return { label: 'ABCD'[c], fill: '#fff8e1' };
    },
  }),
});
