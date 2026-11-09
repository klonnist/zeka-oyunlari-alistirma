// Ders adımlarını kurmak için yardımcılar
export function kit(game, p) {
  let user = game.initUser(p);
  let crosses = new Set();
  const steps = [];
  const copy = (u) => (u instanceof Set ? new Set(u) : u ? u.map((r) => r.slice()) : u);
  return {
    p,
    get user() { return user; },
    // o: { set:[[r,c,v]], edges:[keys], cross:[edgeKeys], focus, scan, pointer, notes:{'r,c':txt}, html, qa, final }
    step(say, o = {}) {
      const pop = new Set(), fresh = [];
      if (o.set && o.set.length) {
        user = copy(user);
        for (const [r, c, v] of o.set) { user[r][c] = v; pop.add(r + ',' + c); }
      }
      if (o.edges && o.edges.length) {
        user = new Set(user);
        for (const k of o.edges) { if (!user.has(k)) fresh.push(k); user.add(k); }
      }
      if (o.cross) { crosses = new Set([...crosses, ...o.cross]); }
      steps.push({ ...o, say, user: copy(user), pop, fresh, crosses: [...crosses] });
    },
    steps,
  };
}

export const rowBand = (r, n, color) => ({ r, c: 0, h: 1, w: n, color });
export const colBand = (c, n, color) => ({ r: 0, c, h: n, w: 1, color });
export const C1 = '#5b4bdb', C2 = '#2a9d8f', C3 = '#e4572e';

export function listTr(xs) {
  if (!xs.length) return '';
  if (xs.length === 1) return String(xs[0]);
  return xs.slice(0, -1).join(', ') + ' ve ' + xs[xs.length - 1];
}

// Latin türleri için "tek aday" akıl yürütmesi.
// opts.box: bölge kimlikleri (sudoku), opts.king: 8 komşu kuralı (farklı komşular), opts.latin: satır/sütun tekrarsız
// opts.extra(r,c,v,grid) -> false ise aday değil (ör. ardışık nokta, kendoku bölgesi)
export function singles(p, grid, opts) {
  const n = p.rows, vals = opts.values;
  const out = [];
  const g = grid.map((r) => r.slice());
  const val = (r, c) => (p.given[r][c] != null && p.given[r][c] !== '' ? p.given[r][c] : g[r][c]);
  const cands = (r, c) => {
    const seenR = new Set(), seenC = new Set(), seenB = new Set(), seenK = new Set();
    for (let i = 0; i < n; i++) {
      if (opts.latin) { if (val(r, i)) seenR.add(val(r, i)); if (val(i, c)) seenC.add(val(i, c)); }
    }
    if (opts.box) for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (opts.box[a][b] === opts.box[r][c] && val(a, b)) seenB.add(val(a, b));
    if (opts.king) for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const a = r + dr, b = c + dc;
      if ((dr || dc) && a >= 0 && b >= 0 && a < n && b < n && val(a, b)) seenK.add(val(a, b));
    }
    const left0 = vals.filter((v) => !seenR.has(v) && !seenC.has(v) && !seenB.has(v) && !seenK.has(v));
    const left = left0.filter((v) => !opts.extra || opts.extra(r, c, v, val));
    return { left, left0, seenR, seenC, seenB, seenK };
  };
  for (let guard = 0; guard < n * n; guard++) {
    let best = null;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (val(r, c)) continue;
      const k = cands(r, c);
      if (!best || k.left.length < best.k.left.length) best = { r, c, k };
    }
    if (!best) break;
    const { r, c, k } = best;
    const v = p.sol[r][c];
    out.push({ r, c, v, single: k.left.length === 1 && k.left[0] === v, left: k.left, ...k });
    g[r][c] = v;
  }
  return out;
}

// Bir tek-aday adımını çocuk diliyle anlat
export function explainSingle(s, opts) {
  const parts = [];
  const srt = (set) => [...set].sort();
  if (s.seenR && s.seenR.size) parts.push(`satırında ${listTr(srt(s.seenR))}`);
  if (s.seenC && s.seenC.size) parts.push(`sütununda ${listTr(srt(s.seenC))}`);
  if (s.seenB && s.seenB.size) parts.push(`bölgesinde ${listTr(srt(s.seenB))}`);
  if (s.seenK && s.seenK.size) parts.push(`komşularında ${listTr(srt(s.seenK))}`);
  const ruleWhy = opts && opts.why && s.left0 && s.left0.length > s.left.length ? opts.why(s) : '';
  if (s.single) {
    const why = parts.length ? `Bu hücrenin ${parts.join(', ')} var. ` : '';
    if (ruleWhy) return `${why}${why ? 'Ayrıca ' + ruleWhy[0].toLocaleLowerCase('tr') + ruleWhy.slice(1) : ruleWhy} O halde buraya ${s.v} yazıyoruz.`;
    return `${why}Geriye yalnızca ${s.v} kalıyor, o halde buraya ${s.v} yazıyoruz.`;
  }
  return `Burada ${listTr(s.left)} olabilir. Diğer ipuçlarıyla birlikte düşününce doğrusu ${s.v}.`;
}
