import { valueGame } from './base.js?v=4';
import { randomFill, reduceGivens, to2 } from './latin.js?v=4';
import { C } from '../core/csp.js?v=4';
import { numberOptions, range } from '../core/util.js?v=4';

export default valueGame({
  id: 'komsular',
  name: 'Farklı Komşular',
  stage: 'okul',
  icon: '🏘️',
  rules: '1’den 4’e kadar rakamları diyagrama yerleştir. Aynı rakamlar kenardan ya da çaprazdan birbirine değemez. Satır ve sütunda tekrar olabilir.',
  levels: { kolay: '4×4', orta: '5×5' },
  generate(rng, level) {
    const n = level === 'orta' ? 5 : 4;
    const cs = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        const r2 = r + dr, c2 = c + dc;
        if (r2 < n && c2 >= 0 && c2 < n) cs.push(C.notEqual(r * n + c, r2 * n + c2));
      }
    const vals = [1, 2, 3, 4];
    const sol = randomFill(n, vals, cs, rng);
    const kept = reduceGivens(n, vals, cs, sol, rng, level === 'orta' ? 0 : 5);
    const sol2 = to2(n, sol, String);
    const given = to2(n, sol.map((v, i) => (kept.has(i) ? String(v) : null)));
    // soru: boş hücrelerden 3 tanesi
    const empty = range(n * n).filter((i) => !kept.has(i));
    const pick = rng.shuffle(empty).slice(0, Math.min(3, empty.length)).map((i) => [Math.floor(i / n), i % n]);
    const ans = pick.reduce((s, [r, c]) => s + sol[r * n + c], 0);
    return {
      n, rows: n, cols: n, sol: sol2, given,
      q: { text: 'Farklı komşular sorusunun çözümünde soru işareti (?) bulunan hücrelere gelecek rakamların toplamı kaçtır?', cells: pick, qmark: true, ...numberOptions(rng, ans, { min: 3 }) },
    };
  },
  palette: () => ['1', '2', '3', '4'],
});
