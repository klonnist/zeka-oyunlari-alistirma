import { valueGame } from './base.js?v=6';

const WORDS = (
  'ARI AYI KUŞ BALIK KEDİ KÖPEK ASLAN KAPLAN ZEBRA ZÜRAFA PANDA MANDA MARTI KARGA SERÇE TAVUK HOROZ ÖRDEK KUZU KEÇİ ' +
  'İNEK ATLAR TİLKİ KURT TAVŞAN KAPLUMBAĞA YUNUS FOK BALİNA AHTAPOT KARINCA KELEBEK ARMUT ELMA KİRAZ ÇİLEK ÜZÜM KAVUN ' +
  'KARPUZ MUZ İNCİR AYVA ERİK LİMON PORTAKAL MANDALİNA DOMATES BİBER PATATES SOĞAN HAVUÇ TURP MASA SANDALYE KALEM ' +
  'SİLGİ DEFTER KİTAP ÇANTA OKUL SINIF TAHTA KAPI PENCERE HALI LAMBA SAAT TABAK KAŞIK ÇATAL BARDAK TENCERE TOPAÇ ' +
  'BALON UÇAK GEMİ TREN OTOBÜS ARABA BİSİKLET ROKET YILDIZ GÜNEŞ BULUT YAĞMUR KAR RÜZGAR DENİZ NEHİR GÖL DAĞ ORMAN ' +
  'AĞAÇ ÇİÇEK YAPRAK TOHUM BAHÇE PARK KÖPRÜ KULE ŞEHİR KÖY SOKAK EKMEK PEYNİR ZEYTİN BAL REÇEL ÇORBA PİLAV MAKARNA ' +
  'KEK PASTA ŞEKER SÜT AYRAN ÇAY KAZAK ETEK GÖMLEK ÇORAP ŞAPKA ATKI ELDİVEN MONT BOTLAR DAVUL GİTAR KEMAN FLÜT ZİL ' +
  'OYUN TOPLAR KALE KUM TAŞ KAYA ADA SAHİL MARAL MANTAR MERAL KARTAL ŞAHİN BAYKUŞ PAPAĞAN KANARYA LEYLEK DEVE AT'
).split(/\s+/).filter((w) => [...w].length >= 3 && [...w].length <= 7);

const chars = (w) => [...w];

function tryPlace(cells, word, r, c, horiz) {
  const L = chars(word);
  const get = (a, b) => cells.get(a + ',' + b);
  const before = horiz ? get(r, c - 1) : get(r - 1, c);
  const after = horiz ? get(r, c + L.length) : get(r + L.length, c);
  if (before || after) return false;
  let cross = 0;
  for (let i = 0; i < L.length; i++) {
    const a = horiz ? r : r + i, b = horiz ? c + i : c;
    const ex = get(a, b);
    if (ex) {
      if (ex.ch !== L[i] || ex[horiz ? 'h' : 'v']) return false;
      cross++;
    } else {
      // yanlara değme olmasın
      const s1 = horiz ? get(a - 1, b) : get(a, b - 1);
      const s2 = horiz ? get(a + 1, b) : get(a, b + 1);
      if (s1 || s2) return false;
    }
  }
  return cross >= 1;
}
function put(cells, word, r, c, horiz) {
  chars(word).forEach((ch, i) => {
    const a = horiz ? r : r + i, b = horiz ? c + i : c;
    const k = a + ',' + b;
    const ex = cells.get(k) || { ch };
    ex[horiz ? 'h' : 'v'] = true;
    cells.set(k, ex);
  });
}

// slots: [{r,c,horiz,len}] ; words -> kaç farklı yerleşim var
function countFits(slots, words) {
  let count = 0, firstOut = null;
  const used = new Array(words.length).fill(false);
  const grid = new Map();
  const rec = (si) => {
    if (si === slots.length) { count++; firstOut = words.find((w, i) => !used[i]); return; }
    const s = slots[si];
    for (let wi = 0; wi < words.length; wi++) {
      if (used[wi] || chars(words[wi]).length !== s.len) continue;
      const L = chars(words[wi]);
      const changed = [];
      let ok = true;
      for (let i = 0; i < s.len; i++) {
        const k = s.horiz ? s.r + ',' + (s.c + i) : (s.r + i) + ',' + s.c;
        const ex = grid.get(k);
        if (ex && ex !== L[i]) { ok = false; break; }
        if (!ex) { grid.set(k, L[i]); changed.push(k); }
      }
      if (ok) { used[wi] = true; rec(si + 1); used[wi] = false; }
      for (const k of changed) grid.delete(k);
    }
  };
  rec(0);
  return { count, out: firstOut };
}

export default valueGame({
  id: 'kelime',
  name: 'Yerleşmeyen Kelime',
  stage: 'okul',
  icon: '📝',
  rules: 'Verilen kelimelerden biri hariç hepsini diyagrama yerleştir (kolayda 4 kelimeden 3’ü, ortada 5 kelimeden 4’ü). Her hücreye bir harf gelecek şekilde soldan sağa ve yukarıdan aşağıya yazılmalıdır. Diyagrama yerleşmeyen kelimeyi bul.',
  levels: { kolay: '3 kelime', orta: '4 kelime' },
  info: (p) => 'Kelimeler: ' + p.words.join(', '),
  generate(rng, level) {
    const nWords = level === 'orta' ? 4 : 3;
    for (let t = 0; t < 2000; t++) {
      const cells = new Map();
      const placed = [];
      const w1 = rng.pick(WORDS);
      put(cells, w1, 0, 0, true);
      placed.push({ w: w1, r: 0, c: 0, horiz: true });
      let fail = false;
      while (placed.length < nWords && !fail) {
        let done = false;
        for (let k = 0; k < 200 && !done; k++) {
          const w = rng.pick(WORDS);
          if (placed.some((p) => p.w === w)) continue;
          const base = rng.pick(placed);
          const horiz = !base.horiz;
          const B = chars(base.w), W = chars(w);
          const i = rng.int(0, B.length - 1);
          const j = W.indexOf(B[i]);
          if (j < 0) continue;
          const r = base.horiz ? base.r - j : base.r + i;
          const c = base.horiz ? base.c + i : base.c - j;
          if (tryPlace(cells, w, r, c, horiz)) { put(cells, w, r, c, horiz); placed.push({ w, r, c, horiz }); done = true; }
        }
        if (!done) fail = true;
      }
      if (fail) continue;
      // yerleşmeyen kelime: bir slotla aynı uzunlukta
      const slots = placed.map((p) => ({ r: p.r, c: p.c, horiz: p.horiz, len: chars(p.w).length }));
      const lenPick = rng.pick(slots).len;
      const cands = rng.shuffle(WORDS.filter((w) => chars(w).length === lenPick && !placed.some((p) => p.w === w)));
      let odd = null;
      for (const w of cands.slice(0, 40)) {
        const words = [...placed.map((p) => p.w), w];
        const res = countFits(slots, words);
        if (res.count === 1 && res.out === w) { odd = w; break; }
      }
      if (!odd) continue;
      // normalize
      let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
      for (const k of cells.keys()) { const [r, c] = k.split(',').map(Number); minR = Math.min(minR, r); minC = Math.min(minC, c); maxR = Math.max(maxR, r); maxC = Math.max(maxC, c); }
      const R = maxR - minR + 1, Cc = maxC - minC + 1;
      if (R > 8 || Cc > 8) continue;
      const sol = Array.from({ length: R }, () => Array(Cc).fill(null));
      for (const [k, v] of cells) { const [r, c] = k.split(',').map(Number); sol[r - minR][c - minC] = v.ch; }
      const given = sol.map((row) => row.map(() => null));
      const words = [...placed.map((p) => p.w), odd].sort((a, b) => a.localeCompare(b, 'tr'));
      const letters = [...new Set(words.flatMap(chars))].sort((a, b) => a.localeCompare(b, 'tr'));
      return {
        rows: R, cols: Cc, sol, given, words, letters,
        q: { text: 'Diyagrama yerleşmeyen kelime hangisidir?', options: [odd, ...rng.shuffle(words.filter((w) => w !== odd)).slice(0, 3)].sort((a, b) => a.localeCompare(b, 'tr')), answer: odd },
      };
    }
    throw new Error('kelime üretilemedi');
  },
  palette: (p) => p.letters,
  extra: (p) => ({ cell: (r, c) => (p.sol[r][c] == null ? { void: true } : {}) }),
  // Harf yazınca kelime boyunca otomatik ilerleme (yatay 'h' / dikey 'v')
  cursor: {
    dirs(p, r, c) {
      const on = (a, b) => a >= 0 && b >= 0 && a < p.rows && b < p.cols && p.sol[a][b] != null;
      const out = [];
      if (on(r, c - 1) || on(r, c + 1)) out.push('h');
      if (on(r - 1, c) || on(r + 1, c)) out.push('v');
      return out;
    },
    step(p, r, c, dir, delta) {
      const a = dir === 'v' ? r + delta : r, b = dir === 'h' ? c + delta : c;
      return a >= 0 && b >= 0 && a < p.rows && b < p.cols && p.sol[a][b] != null ? [a, b] : null;
    },
    word(p, r, c, dir) {
      const cells = [[r, c]];
      for (const d of [-1, 1]) {
        let cur = [r, c];
        while ((cur = this.step(p, cur[0], cur[1], dir, d))) cells.push(cur);
      }
      return cells;
    },
  },
});
