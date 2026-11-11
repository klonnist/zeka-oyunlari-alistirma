// Izgara oyunlarının animasyonlu dersleri
import { kit, singles, explainSingle, rowBand, colBand, listTr, C1, C2, C3 } from './kit.js?v=5';
import { edgeKey, parseEdge, N4, N8 } from '../core/util.js?v=5';

// ---------- ortak: yarışma sorusu adımı ----------
function qaStep(k, extra = '') {
  const p = k.p, q = p.q;
  let say;
  if (q.cells && q.cells.length && /toplam/.test(q.text) && p.sol && typeof p.sol[0][0] !== 'number') {
    const vs = q.cells.map(([r, c]) => p.sol[r][c]);
    say = `Şimdi yarışma sorusu: işaretli hücrelerdeki sayılar ${vs.join(' + ')} = ${q.answer}. Doğru şık ${'ABCD'[q.options.indexOf(q.answer)]}) ${q.answer}.`;
  } else say = `Şimdi yarışma sorusu: ${extra ? extra[0].toLocaleLowerCase('tr') + extra.slice(1) + ' ' : ''}Doğru şık ${'ABCD'[q.options.indexOf(q.answer)]}) ${q.answer}.`;
  k.step(say, { qa: true, focus: (q.cells || []).map(([r, c]) => [r, c, '#2a9d8f']) });
}

// ---------- latin türleri ----------
function boxBand(p, r, c) {
  const id = p.regions[r][c];
  let r0 = 99, c0 = 99, r1 = -1, c1 = -1;
  for (let a = 0; a < p.rows; a++) for (let b = 0; b < p.cols; b++) if (p.regions[a][b] === id) { r0 = Math.min(r0, a); c0 = Math.min(c0, b); r1 = Math.max(r1, a); c1 = Math.max(c1, b); }
  return { r: r0, c: c0, h: r1 - r0 + 1, w: c1 - c0 + 1, color: C3 };
}

function solveSteps(k, opts, { solo = 4, chunk = 5, bands, cont = 'Aynı yöntemle devam: her boş hücre için satırına, sütununa ve bölgesine bakıp eksik kalan rakamı buluyoruz.' } = {}) {
  const p = k.p;
  const list = singles(p, k.user, opts);
  const first = list.slice(0, solo), rest = list.slice(solo);
  for (const s of first) {
    k.step(explainSingle(s, opts), { set: [[s.r, s.c, s.v]], focus: [[s.r, s.c]], pointer: [s.r, s.c], scan: bands ? bands(s) : [rowBand(s.r, p.cols, C1), colBand(s.c, p.rows, C2)] });
  }
  for (let i = 0; i < rest.length; i += chunk) {
    const part = rest.slice(i, i + chunk);
    const last = i + chunk >= rest.length;
    k.step(last ? 'Aynı yöntemle son hücreleri de dolduralım. Bulmaca çözüldü! 🎉' : cont, { set: part.map((s) => [s.r, s.c, s.v]), focus: part.map((s) => [s.r, s.c]) });
  }
}

const intro = (k, say, o = {}) => k.step(say, { noQ: true, ...o });

function sudoku(k) {
  const p = k.p, n = p.n;
  intro(k, `Bu bir ${n}×${n} sudoku. Her satırda 1’den ${n}’e kadar rakamlar birer kez bulunur.`, { scan: [rowBand(0, n)] });
  intro(k, 'Her sütunda da her rakam bir kez bulunur.', { scan: [colBand(0, n, C2)] });
  intro(k, 'Kalın çizgiyle ayrılmış her bölgede de rakamlar tekrar etmez.', { scan: [boxBand(p, 0, 0)] });
  solveSteps(k, { latin: true, box: p.regions, values: range1(n) }, { bands: (s) => [rowBand(s.r, n, C1), colBand(s.c, n, C2), boxBand(p, s.r, s.c)] });
  qaStep(k);
}
const range1 = (n) => Array.from({ length: n }, (_, i) => String(i + 1));

function ardisik(k) {
  const p = k.p, n = p.n;
  intro(k, `Bu bir ardışık sudoku. Normal sudoku gibi her satırda, sütunda ve bölgede 1’den ${n}’e kadar rakamlar birer kez olur.`, { scan: [rowBand(0, n), colBand(0, n, C2)] });
  const d = p.dots[0];
  if (d) intro(k, 'Siyah nokta, iki komşu hücredeki rakamların ardışık olduğunu söyler: 1-2, 2-3, 3-4 gibi.', { focus: [[d[0], d[1]], [d[2], d[3]]] });
  const extra = (r, c, v, val) => p.dots.every(([a, b, e, f]) => {
    let o = null;
    if (a === r && b === c) o = val(e, f); else if (e === r && f === c) o = val(a, b);
    return !o || Math.abs(Number(o) - Number(v)) === 1;
  });
  const why = () => 'Yanındaki siyah nokta, komşusuyla ardışık olması gerektiğini söylüyor.';
  solveSteps(k, { latin: true, box: p.regions, values: range1(n), extra, why }, { bands: (s) => [rowBand(s.r, n, C1), colBand(s.c, n, C2), boxBand(p, s.r, s.c)], cont: 'Aynı yöntemle devam: satır, sütun, bölge ve siyah noktalara bakarak kalan hücreleri dolduruyoruz.' });
  qaStep(k);
}

function komsular(k) {
  const p = k.p, n = p.n;
  intro(k, 'Diyagrama 1, 2, 3, 4 rakamlarını yerleştireceğiz. Satırda ve sütunda tekrar olabilir!', { scan: [rowBand(0, n)] });
  intro(k, 'Ama aynı rakamlar kenardan ya da köşeden birbirine değemez. Bir hücrenin çevresindeki 8 komşuya bakarız.', { scan: [{ r: 1, c: 1, h: 3, w: 3, color: C3 }], focus: [[2, 2]] });
  solveSteps(k, { king: true, values: ['1', '2', '3', '4'] }, {
    cont: 'Aynı yöntemle devam: her hücrenin 8 komşusundaki rakamları eleyip kalanı yazıyoruz.',
    bands: (s) => [{ r: Math.max(0, s.r - 1), c: Math.max(0, s.c - 1), h: Math.min(n, s.r + 2) - Math.max(0, s.r - 1), w: Math.min(n, s.c + 2) - Math.max(0, s.c - 1), color: C3 }],
  });
  qaStep(k);
}

function kendoku(k) {
  const p = k.p, n = p.n;
  const cages = {};
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) (cages[p.regions[r][c]] ||= []).push([r, c]);
  const labelOf = (id) => { for (const [r, c] of cages[id]) if (p.labels[r + ',' + c]) return p.labels[r + ',' + c]; return ''; };
  intro(k, `Her satır ve sütunda 1’den ${n}’e kadar rakamlar birer kez yer alır.`, { scan: [rowBand(0, n), colBand(0, n, C2)] });
  const ex = Object.keys(cages).map((id) => ({ id, L: labelOf(id), cells: cages[id] })).find((x) => x.cells.length === 2 && x.L.startsWith('+'));
  if (ex) {
    const t = Number(ex.L.slice(1));
    const pairs = [];
    for (let a = 1; a <= n; a++) for (let b = a + 1; b <= n; b++) if (a + b === t) pairs.push(`${a}+${b}`);
    intro(k, `Kalın çizgili bölgenin köşesindeki “${ex.L}”, bu bölgedeki rakamların toplamının ${t} olduğunu söyler. Olabilecekler: ${listTr(pairs)}.`, { focus: ex.cells });
  }
  const ex2 = Object.keys(cages).map((id) => ({ id, L: labelOf(id), cells: cages[id] })).find((x) => x.L.startsWith('-'));
  if (ex2) intro(k, `“${ex2.L}” ise büyük rakamdan küçük rakamı çıkarınca ${ex2.L.slice(1)} kaldığını söyler.`, { focus: ex2.cells });
  const extra = (r, c, v, val) => {
    const id = p.regions[r][c], cells = cages[id], L = labelOf(id);
    const others = cells.filter(([a, b]) => a !== r || b !== c).map(([a, b]) => val(a, b));
    const x = Number(v);
    if (/^\d+$/.test(L)) return x === Number(L);
    if (others.some((o) => !o)) { if (L[0] === '+') return others.reduce((s, o) => s + Number(o || 0), 0) + x <= Number(L.slice(1)); return true; }
    const all = [...others.map(Number), x], t = Number(L.slice(1));
    if (L[0] === '+') return all.reduce((s, o) => s + o, 0) === t;
    if (L[0] === '-') return Math.abs(all[0] - all[1]) === t;
    if (L[0] === '×') return all.reduce((s, o) => s * o, 1) === t;
    return true;
  };
  const why = (s) => {
    const L = labelOf(p.regions[s.r][s.c]);
    if (/^[0-9]+$/.test(L)) return `Bu tek hücrelik bölgede “${L}” yazıyor, yani rakam doğrudan ${L}.`;
    const op = L[0] === '+' ? 'toplamı' : L[0] === '-' ? 'farkı' : 'çarpımı';
    return `Bölgenin işareti “${L}”: bölgedeki rakamların ${op} ${L.slice(1)} olmalı, bunu yalnızca ${s.v} sağlıyor.`;
  };
  solveSteps(k, { latin: true, values: range1(n), extra, why }, { bands: (s) => [rowBand(s.r, n, C1), colBand(s.c, n, C2)], cont: 'Aynı yöntemle devam: satır, sütun ve bölgelerdeki işlemlere bakarak kalan hücreleri dolduruyoruz.' });
  qaStep(k);
}

function abc(k) {
  const p = k.p, n = p.n, nx = n - 3;
  intro(k, 'Her satıra ve sütuna A, B ve C harflerini birer kez yazacağız. Kalan hücreler boş kalır; boşu X ile gösteririz.', { scan: [rowBand(0, n)] });
  const cl = p.outside[0];
  if (cl) {
    const band = cl.side === 'left' || cl.side === 'right' ? rowBand(cl.i, n, C3) : colBand(cl.i, n, C3);
    const yon = { left: 'soldan', right: 'sağdan', top: 'yukarıdan', bottom: 'aşağıdan' }[cl.side];
    intro(k, `Dışarıdaki harf, o yönden bakınca görülen ilk harftir. Bu satıra ${yon} bakınca ilk görülen harf ${cl.text} olmalı (aradaki X’ler görünmez).`, { scan: [band] });
  }
  const lineCells = (cl) => {
    const cells = [];
    for (let j = 0; j < n; j++) cells.push(cl.side === 'left' ? [cl.i, j] : cl.side === 'right' ? [cl.i, n - 1 - j] : cl.side === 'top' ? [j, cl.i] : [n - 1 - j, cl.i]);
    return cells;
  };
  const extra = (r, c, v, val) => {
    let xr = 0, xc = 0;
    for (let j = 0; j < n; j++) {
      if (v !== 'X') { if ((val(r, j) === v && j !== c) || (val(j, c) === v && j !== r)) return false; }
      if (val(r, j) === 'X') xr++;
      if (val(j, c) === 'X') xc++;
    }
    if (v === 'X' && (xr >= nx || xc >= nx)) return false;
    for (const o of p.outside) {
      const cells = lineCells(o);
      for (const [a, b] of cells) {
        const w = a === r && b === c ? v : val(a, b);
        if (!w) break;
        if (w === 'X') continue;
        if (w !== o.text) return false;
        break;
      }
    }
    return true;
  };
  const why = () => 'Satırında, sütununda ve dışarıdaki harf ipuçlarında başka seçenek kalmıyor.';
  solveSteps(k, { latin: false, values: ['A', 'B', 'C', 'X'], extra, why }, { cont: 'Aynı yöntemle devam: her satır ve sütunda A, B, C birer kez olacak; dışarıdaki harflere uyacak şekilde kalan hücreleri dolduruyoruz.' });
  const dv = p.q.cells.map(([r, c]) => p.sol[r][c]);
  k.step(`Şimdi yarışma sorusu: ok yönündeki hücrelerde sırayla ${listTr(dv)} var, yani ${p.q.answer}. Doğru şık ${'ABCD'[p.q.options.indexOf(p.q.answer)]}) ${p.q.answer}.`, { qa: true, focus: p.q.cells.map(([r, c]) => [r, c, '#2a9d8f']) });
}

function apartman(k) {
  const p = k.p, n = p.n;
  intro(k, `Her satır ve sütuna 1’den ${n}’e kadar yükseklikte apartmanlar birer kez gelir. Rakam, apartmanın kat sayısıdır.`, { scan: [rowBand(0, n)] });
  const ex = p.outside.find((o) => o.side === 'left' || o.side === 'right') || p.outside[0];
  if (ex) {
    const isRow = ex.side === 'left' || ex.side === 'right';
    const line = Array.from({ length: n }, (_, j) => (isRow ? p.sol[ex.i][j] : p.sol[j][ex.i]));
    const seq = ex.side === 'right' || ex.side === 'bottom' ? line.slice().reverse() : line;
    let m = 0; const vis = [];
    for (const x of seq) if (Number(x) > m) { m = Number(x); vis.push(x); }
    intro(k, `Dışarıdaki ${ex.text}, o yönden kaç apartman görüldüğünü söyler. Yüksek bir apartman, arkasındaki alçak apartmanları saklar. Örneğin ${seq.join('-')} sırasında yalnızca ${listTr(vis)} görünür.`, { scan: [isRow ? rowBand(ex.i, n, C3) : colBand(ex.i, n, C3)] });
  }
  intro(k, `İpucu: “1” görülüyorsa en yakındaki apartman ${n} katlıdır, çünkü o hepsini saklar. “${n}” görülüyorsa apartmanlar 1, 2, 3… diye sıralanır.`);
  const lines = p.outside.map((o) => {
    const cells = [];
    for (let j = 0; j < n; j++) cells.push(o.side === 'left' ? [o.i, j] : o.side === 'right' ? [o.i, n - 1 - j] : o.side === 'top' ? [j, o.i] : [n - 1 - j, o.i]);
    return { k: Number(o.text), cells };
  });
  const extra = (r, c, v, val) => {
    for (const L of lines) {
      const idx = L.cells.findIndex(([a, b]) => a === r && b === c);
      if (idx < 0) continue;
      const x = Number(v);
      if (L.k === 1 && idx === 0 && x !== n) return false;
      if (L.k === n && x !== idx + 1) return false;
      if (idx === 0 && x > n - L.k + 1) return false;
      const vals = L.cells.map(([a, b]) => (a === r && b === c ? v : val(a, b)));
      if (vals.every(Boolean)) { let m = 0, cnt = 0; for (const y of vals) if (Number(y) > m) { m = Number(y); cnt++; } if (cnt !== L.k) return false; }
    }
    return true;
  };
  const why = () => 'Dışarıdaki görünen apartman sayısı başka bir yüksekliğe izin vermiyor.';
  solveSteps(k, { latin: true, values: range1(n), extra, why }, { cont: 'Aynı yöntemle devam: satır ve sütunda tekrar olmayacak, dışarıdaki sayılar da tutacak şekilde kalan apartmanları yerleştiriyoruz.' });
  qaStep(k);
}

// ---------- kakuro ----------
function kakuro(k) {
  const p = k.p;
  const runs = [];
  for (const key in p.clues) {
    const [r, c] = key.split(',').map(Number);
    for (const dir of ['r', 'd']) {
      if (p.clues[key][dir] == null) continue;
      const cells = [];
      let a = r + (dir === 'd' ? 1 : 0), b = c + (dir === 'r' ? 1 : 0);
      while (a < p.rows && b < p.cols && p.sol[a][b] != null) { cells.push([a, b]); if (dir === 'r') b++; else a++; }
      runs.push({ r, c, dir, sum: p.clues[key][dir], cells });
    }
  }
  const band = (run) => (run.dir === 'r' ? { r: run.r, c: run.c, h: 1, w: run.cells.length + 1 } : { r: run.r, c: run.c, h: run.cells.length + 1, w: 1, color: C2 });
  const h0 = runs.find((x) => x.dir === 'r'), v0 = runs.find((x) => x.dir === 'd');
  intro(k, `Siyah karelerdeki çizginin üstündeki sayı, sağdaki beyaz hücrelerin toplamıdır. Burada ${h0.cells.length} hücrenin toplamı ${h0.sum}.`, { scan: [band(h0)], focus: [[h0.r, h0.c]] });
  intro(k, `Çizginin altındaki sayı ise aşağıdaki hücrelerin toplamıdır: ${v0.sum}. Bir toplamdaki rakamlar birbirinden farklı olmalı.`, { scan: [band(v0)], focus: [[v0.r, v0.c]] });
  const magic = { 2: { 3: '1+2', 4: '1+3', 16: '7+9', 17: '8+9' }, 3: { 6: '1+2+3', 7: '1+2+4', 23: '6+8+9', 24: '7+8+9' } };
  const m = runs.find((x) => magic[x.cells.length] && magic[x.cells.length][x.sum]);
  if (m) intro(k, `Sihirli toplam! ${m.cells.length} farklı rakamla ${m.sum} yapmanın tek yolu var: ${magic[m.cells.length][m.sum]}. Böyle toplamlardan başlamak işi kolaylaştırır.`, { scan: [band(m)] });
  const done = new Set();
  const order = runs.filter((x) => x.dir === 'r');
  if (m && m.dir === 'r') order.sort((a) => (a === m ? -1 : 0));
  for (const run of order) {
    const set = run.cells.filter(([a, b]) => !done.has(a + ',' + b) && !(p.given[a][b])).map(([a, b]) => [a, b, p.sol[a][b]]);
    run.cells.forEach(([a, b]) => done.add(a + ',' + b));
    if (!set.length) continue;
    const vs = run.cells.map(([a, b]) => p.sol[a][b]);
    k.step(`Bu satırda ${vs.join(' + ')} = ${run.sum}. Kesiştiği sütunların toplamlarına da uyuyor.`, { set, scan: [band(run)], focus: set.map(([a, b]) => [a, b]) });
  }
  const vr = runs.find((x) => x.dir === 'd' && x.cells.length >= 2);
  if (vr) k.step(`Kontrol: bu sütunda ${vr.cells.map(([a, b]) => p.sol[a][b]).join(' + ')} = ${vr.sum}. Bütün toplamlar tutuyor! 🎉`, { scan: [band(vr)] });
  qaStep(k);
}

// ---------- sayı bulmaca ----------
function sayi(k) {
  const p = k.p, L = p.L, last = p.rows - 1;
  intro(k, `${L} basamaklı gizli bir sayı arıyoruz. Rakamları farklı ve 0 ile başlamıyor. Her satır bir tahmin, sağında ipucu var.`, { scan: [rowBand(last, L, C2)] });
  intro(k, '“+” bir rakamın hem doğru hem de doğru yerde olduğunu, “−” rakamın doğru ama yanlış yerde olduğunu söyler. “0” ise o rakamların hiçbiri sayıda yok demektir.');
  const secret = p.sol[last];
  p.clues.forEach((t, r) => {
    const g = p.given[r];
    const right = g.filter((d, i) => secret[i] === d), wrong = g.filter((d, i) => secret[i] !== d && secret.includes(d));
    let say;
    if (t === '0') say = `${g.join(' ')} → 0: bu rakamların hiçbiri gizli sayıda yok, hepsini eleyebiliriz.`;
    else {
      const parts = [];
      if (right.length) parts.push(`${right.length} rakam doğru yerde`);
      if (wrong.length) parts.push(`${wrong.length} rakam var ama yeri yanlış`);
      say = `${g.join(' ')} → ${t}: ${listTr(parts)}.`;
    }
    k.step(say, { scan: [rowBand(r, L)] });
  });
  k.step(`Bütün ipuçlarını birlikte düşününce gizli sayı ${secret.join('')} çıkar. Her satırı kontrol et: hepsi tutuyor!`, { set: secret.map((d, i) => [last, i, d]), scan: [rowBand(last, L, C2)] });
  k.step(`Soru A + B + C${L > 3 ? ' + D' : ''} işlemini soruyor: ${secret.join(' + ')} = ${p.q.answer}. Doğru şık ${'ABCD'[p.q.options.indexOf(p.q.answer)]}) ${p.q.answer}.`, { qa: true });
}

// ---------- yerleşmeyen kelime ----------
function slotsOf(p) {
  const out = [];
  for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.cols; c++) {
    if (p.sol[r][c] == null) continue;
    if ((c === 0 || p.sol[r][c - 1] == null) && c + 1 < p.cols && p.sol[r][c + 1] != null) {
      const cells = []; let b = c; while (b < p.cols && p.sol[r][b] != null) cells.push([r, b++]);
      out.push({ cells, h: true });
    }
    if ((r === 0 || p.sol[r - 1][c] == null) && r + 1 < p.rows && p.sol[r + 1][c] != null) {
      const cells = []; let a = r; while (a < p.rows && p.sol[a][c] != null) cells.push([a++, c]);
      out.push({ cells, h: false });
    }
  }
  return out.map((s) => ({ ...s, word: s.cells.map(([a, b]) => p.sol[a][b]).join('') }));
}
function kelime(k) {
  const p = k.p;
  const slots = slotsOf(p).sort((a, b) => b.cells.length - a.cells.length);
  intro(k, `Kelimeler: ${p.words.join(', ')}. Bunlardan biri hariç hepsi diyagrama yerleşecek. Önce harf sayılarına bakalım.`);
  for (const s of slots) {
    const yon = s.h ? 'soldan sağa' : 'yukarıdan aşağıya';
    k.step(`${s.cells.length} harflik bu yere ${s.word} yazılır (${yon}). Kesişen harfler diğer kelimelerle uyuşuyor.`, {
      set: s.cells.map(([a, b]) => [a, b, p.sol[a][b]]),
      scan: [{ r: s.cells[0][0], c: s.cells[0][1], h: s.h ? 1 : s.cells.length, w: s.h ? s.cells.length : 1, color: C2 }],
    });
  }
  const odd = p.q.answer, same = slots.find((s) => s.cells.length === [...odd].length);
  const extraWhy = same ? ` ${odd} da ${[...odd].length} harfli ama ${same.word} yerine yazınca kesişen harfler uymuyor.` : ` ${odd} kelimesinin harf sayısına uyan boş yer kalmadı.`;
  k.step(`Bütün yerler doldu.${extraWhy} Yerleşmeyen kelime ${odd}! Doğru şık ${'ABCD'[p.q.options.indexOf(odd)]}) ${odd}.`, { qa: true });
}

// ---------- amiral battı ----------
function shipsOf(sol, n) {
  const seen = new Set(), ships = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (sol[r][c] !== 1 || seen.has(r + ',' + c)) continue;
    const comp = [], st = [[r, c]]; seen.add(r + ',' + c);
    while (st.length) {
      const [a, b] = st.pop(); comp.push([a, b]);
      for (const [dr, dc] of N4) { const x = a + dr, y = b + dc; if (x >= 0 && y >= 0 && x < n && y < n && sol[x][y] === 1 && !seen.has(x + ',' + y)) { seen.add(x + ',' + y); st.push([x, y]); } }
    }
    ships.push(comp);
  }
  return ships.sort((a, b) => b.length - a.length);
}
function amiral(k) {
  const p = k.p, n = p.n;
  intro(k, `Bu gemileri denize yerleştireceğiz: ${p.ships.map((L) => L + ' kareli').join(', ')}. Gemiler düz durur.`);
  const r0 = p.rowC.findIndex((x) => x > 0);
  intro(k, `Kenardaki sayılar, o satırda ya da sütunda kaç gemi parçası olduğunu söyler. Bu satırda ${p.rowC[r0]} parça var.`, { scan: [rowBand(r0, n)] });
  const zeroR = p.rowC.map((x, i) => (x === 0 ? i : -1)).filter((i) => i >= 0);
  const zeroC = p.colC.map((x, i) => (x === 0 ? i : -1)).filter((i) => i >= 0);
  const water = (cells) => cells.filter(([a, b]) => k.user[a][b] === 0).map(([a, b]) => [a, b, 2]);
  if (zeroR.length || zeroC.length) {
    const cells = [];
    for (const r of zeroR) for (let c = 0; c < n; c++) cells.push([r, c]);
    for (const c of zeroC) for (let r = 0; r < n; r++) cells.push([r, c]);
    k.step('0 yazan satır ve sütunlarda hiç gemi yok. Hepsine su işareti koyalım.', { set: water(cells), scan: [...zeroR.map((r) => rowBand(r, n, C2)), ...zeroC.map((c) => colBand(c, n, C2))] });
  }
  const ships = shipsOf(p.sol, n);
  ships.forEach((s, i) => {
    const around = [];
    for (const [a, b] of s) for (const [dr, dc] of N8) { const x = a + dr, y = b + dc; if (x >= 0 && y >= 0 && x < n && y < n && p.sol[x][y] === 0) around.push([x, y]); }
    const say = i === 0 ? `${s.length} karelik gemi buraya sığıyor, satır ve sütun sayılarına uyuyor. Gemiler birbirine köşeden bile değemez, bu yüzden çevresi su olur.` : `${s.length} karelik gemiyi yerleştirip çevresini su ile dolduralım.`;
    k.step(say, { set: [...s.map(([a, b]) => [a, b, 1]), ...water(around)], focus: s, pointer: s[0] });
  });
  const rest = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (k.user[r][c] === 0) rest.push([r, c]);
  if (rest.length) k.step('Kalan hücreler su. Bütün sayılar tutuyor! 🎉', { set: rest.map(([a, b]) => [a, b, 2]) });
  const qc = p.q.cells, hit = qc.filter(([r, c]) => p.sol[r][c] === 1).length;
  k.step(`Şimdi yarışma sorusu: soru işaretli ${qc.length} hücreden ${hit} tanesinde gemi parçası var. Doğru şık ${'ABCD'[p.q.options.indexOf(p.q.answer)]}) ${p.q.answer}.`, { qa: true, focus: qc.map(([r, c]) => [r, c, p.sol[r][c] === 1 ? '#2a9d8f' : '#9aa3b5']) });
}

// ---------- hazine avı ----------
const ring = (r, c, n) => N8.map(([dr, dc]) => [r + dr, c + dc]).filter(([a, b]) => a >= 0 && b >= 0 && a < n && b < n);
function hazine(k) {
  const p = k.p, n = p.n;
  const clues = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (p.sol[r][c] == null) clues.push([r, c, Number(p.show[r][c])]);
  const ex = clues.find(([r, c, v]) => v >= 2 && r > 0 && c > 0 && r < n - 1 && c < n - 1) || clues[0];
  intro(k, `Sayılı hücreler hazine haritasıdır. Bu ${ex[2]}, çevresindeki 8 hücrede tam ${ex[2]} elmas olduğunu söyler.`, { scan: [{ r: Math.max(0, ex[0] - 1), c: Math.max(0, ex[1] - 1), h: 3, w: 3, color: C3 }], focus: [[ex[0], ex[1]]] });
  const empt = (cells) => cells.filter(([a, b]) => p.sol[a][b] === 0 && k.user[a][b] === 0).map(([a, b]) => [a, b, 2]);
  const zeros = clues.filter((x) => x[2] === 0);
  if (zeros.length) k.step('0 olan sayıların çevresinde hiç elmas yok. Oralara × koyalım.', { set: empt(zeros.flatMap(([r, c]) => ring(r, c, n))), focus: zeros.map(([r, c]) => [r, c]) });
  const dias = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (p.sol[r][c] === 1) dias.push([r, c]);
  const full = clues.find(([r, c, v]) => v > 0 && ring(r, c, n).filter(([a, b]) => p.sol[a][b] !== null).length === v);
  const chunk = Math.ceil(dias.length / 3);
  for (let i = 0; i < dias.length; i += chunk) {
    const part = dias.slice(i, i + chunk);
    const say = i === 0 && full ? `Bu ${full[2]}’nin çevresinde elmas konabilecek tam ${full[2]} yer var, demek ki hepsi elmas! Böyle yerlerden başlarız.` : i === 0 ? 'Sayıların çevresini sayarak elmasları yerleştirelim.' : 'Her sayının çevresindeki elmasları sayarak devam edelim.';
    k.step(say, { set: part.map(([a, b]) => [a, b, 1]), focus: i === 0 && full ? [[full[0], full[1]]] : part });
  }
  const rest = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (p.sol[r][c] === 0 && k.user[r][c] === 0) rest.push([r, c, 2]);
  k.step(`Kalan yerler boş. Bütün sayılar tutuyor! 🎉`, { set: rest });
  qaStep(k, `Elmasları tek tek saydık: toplam ${dias.length} elmas.`);
}

// ---------- tapa ----------
function tapa(k) {
  const p = k.p, n = p.n;
  const clues = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (p.sol[r][c] == null) clues.push([r, c, p.show[r][c]]);
  const ex = clues.find((x) => x[2].includes(' ')) || clues.slice().sort((a, b) => Number(b[2]) - Number(a[2]))[0];
  const exSay = ex[2].includes(' ') ? `“${ex[2]}” ipucu: çevresindeki 8 hücrede ${listTr(ex[2].split(' '))} karelik ayrı gruplar karalanır; gruplar arasında en az bir boşluk olur.` : `“${ex[2]}” ipucu: çevresindeki 8 hücrede yan yana ${ex[2]} hücre karalanır.`;
  intro(k, exSay, { scan: [{ r: Math.max(0, ex[0] - 1), c: Math.max(0, ex[1] - 1), h: Math.min(n, ex[0] + 2) - Math.max(0, ex[0] - 1), w: Math.min(n, ex[1] + 2) - Math.max(0, ex[1] - 1), color: C3 }], focus: [[ex[0], ex[1]]] });
  intro(k, 'İki kural daha: karalı hücreler 2×2’lik kare oluşturamaz ve hepsi kenardan birbirine bağlı tek bir duvar olmalı. Sayılı hücreler karalanmaz.');
  // bağlı sırada karala
  const blacks = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (p.sol[r][c] === 1) blacks.push([r, c]);
  const seen = new Set([blacks[0].join(',')]), order = [blacks[0]];
  for (let i = 0; i < order.length; i++) {
    const [a, b] = order[i];
    for (const [dr, dc] of N4) { const x = a + dr, y = b + dc; if (x >= 0 && y >= 0 && x < n && y < n && p.sol[x][y] === 1 && !seen.has(x + ',' + y)) { seen.add(x + ',' + y); order.push([x, y]); } }
  }
  const chunk = Math.ceil(order.length / 3);
  const says = ['İpuçlarına uyacak şekilde ilk duvar parçalarını karalayalım.', 'Duvarı bağlı tutarak uzatıyoruz; 2×2 kare oluşmamasına dikkat!', 'Son parçalarla bütün ipuçları sağlandı.'];
  for (let i = 0, s = 0; i < order.length; i += chunk, s++) {
    const part = order.slice(i, i + chunk);
    k.step(says[Math.min(s, 2)], { set: part.map(([a, b]) => [a, b, 1]), focus: part });
  }
  const rest = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (p.sol[r][c] === 0) rest.push([r, c, 2]);
  k.step(`Kalan hücreler beyaz kalır. Bütün ipuçları tutuyor! 🎉`, { set: rest });
  qaStep(k, `Karalanan hücreleri tek tek saydık: ${blacks.length} hücre.`);
}

// ---------- çit ----------
function cellEdges(r, c) { return [edgeKey(r, c, r, c + 1), edgeKey(r + 1, c, r + 1, c + 1), edgeKey(r, c, r + 1, c), edgeKey(r, c + 1, r + 1, c + 1)]; }
function loopOrder(edges) {
  const adj = {};
  for (const e of edges) { const [a, b, c, d] = parseEdge(e); (adj[a + ',' + b] ||= []).push([c + ',' + d, e]); (adj[c + ',' + d] ||= []).push([a + ',' + b, e]); }
  const out = [], used = new Set();
  let cur = Object.keys(adj)[0];
  for (;;) {
    const nx = (adj[cur] || []).find(([, e]) => !used.has(e));
    if (!nx) break;
    used.add(nx[1]); out.push(nx[1]); cur = nx[0];
  }
  return out;
}
function cit(k) {
  const p = k.p, n = p.n;
  const clues = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (p.shown[r][c] !== '') clues.push([r, c, Number(p.shown[r][c])]);
  intro(k, 'Noktaları yatay ve dikey çizgilerle birleştirerek kapalı, kendini kesmeyen tek bir çit yapacağız. Çit dallanmaz.');
  const ex = clues.find((x) => x[2] === 3) || clues.find((x) => x[2] === 2) || clues[0];
  intro(k, `Hücredeki sayı, o hücrenin 4 kenarından kaçında çit olduğunu söyler. Bu hücrenin etrafında ${ex[2]} çizgi olacak.`, { focus: [[ex[0], ex[1]]] });
  const zeros = clues.filter((x) => x[2] === 0);
  if (zeros.length) k.step('0 yazan hücrelerin hiçbir kenarında çit yok. Oralara × koyalım ki yanlışlıkla çizmeyelim.', { cross: zeros.flatMap(([r, c]) => cellEdges(r, c)), focus: zeros.map(([r, c]) => [r, c]) });
  const order = loopOrder(p.solEdges);
  const parts = 3, chunk = Math.ceil(order.length / parts);
  const says = ['Çizmeye başlayalım. Bir noktaya gelen çizgi oradan mutlaka devam etmeli: her noktada ya 0 ya 2 çizgi olur.', 'Sayıları kontrol ederek devam ediyoruz; köşelerde çit dönmek zorunda.', 'Son çizgilerle çit kapandı! Tek bir halka oldu. 🎉'];
  for (let i = 0, s = 0; i < order.length; i += chunk, s++) k.step(says[Math.min(s, 2)], { edges: order.slice(i, i + chunk) });
  const inside = new Set(p.inside.map((i) => Math.floor(i / n) + ',' + (i % n)));
  const inClues = clues.filter(([r, c]) => inside.has(r + ',' + c));
  k.step(`Şimdi yarışma sorusu: çitin içinde kalan sayılar ${inClues.map((x) => x[2]).join(' + ') || '0'} = ${p.q.answer}. Doğru şık ${'ABCD'[p.q.options.indexOf(p.q.answer)]}) ${p.q.answer}.`, {
    qa: true,
    fills: [...inside].map((x) => [...x.split(',').map(Number), '#e6f4ea']),
    focus: inClues.map(([r, c]) => [r, c, '#2a9d8f']),
  });
}

// ---------- ABC bağlamaca ----------
function baglamaca(k) {
  const p = k.p, n = p.n;
  intro(k, 'Aynı harfleri yollarla birleştireceğiz. Yollar yatay ya da dikey gider, birbirini kesmez ve bütün hücreleri kullanır.', { noQ: true });
  const adj = {};
  for (const e of p.solEdges) { const [a, b, c, d] = parseEdge(e); (adj[a + ',' + b] ||= []).push([c + ',' + d, e]); (adj[c + ',' + d] ||= []).push([a + ',' + b, e]); }
  const letters = [...new Set(p.ends.map((x) => x[2]))].sort();
  const paths = letters.map((ch) => {
    const [r, c] = p.ends.find((x) => x[2] === ch);
    let cur = r + ',' + c; const used = new Set(), edges = [], cells = [[r, c]];
    for (;;) { const nx = (adj[cur] || []).find(([, e]) => !used.has(e)); if (!nx) break; used.add(nx[1]); edges.push(nx[1]); cur = nx[0]; cells.push(cur.split(',').map(Number)); }
    return { ch, edges, cells };
  }).sort((a, b) => a.edges.length - b.edges.length);
  paths.forEach((pt, i) => {
    const say = i === 0 ? `En kısa yoldan başlayalım: ${pt.ch} harflerini ${pt.cells.length} hücrelik bir yolla bağlıyoruz.` : i === paths.length - 1 ? `Son olarak ${pt.ch} yolu kalan bütün boş hücrelerden geçiyor. Bütün hücreler doldu! 🎉` : `Şimdi ${pt.ch} harflerini bağlayalım; yol diğer yolları kesmemeli.`;
    k.step(say, { edges: pt.edges, pointer: pt.cells[0] });
  });
  const owner = {};
  for (const pt of paths) for (const [r, c] of pt.cells) owner[r + ',' + c] = pt.ch;
  const seq = p.q.cells.map(([r, c]) => owner[r + ',' + c]);
  qaStep(k, `ok yönündeki hücrelerden sırayla ${seq.join(', ')} yolları geçiyor; art arda aynı yolu bir kez yazarız: ${p.q.answer}.`);
}

export const GRID_LESSONS = { sudoku, ardisik, komsular, kendoku, abc, apartman, kakuro, sayi, kelime, amiral, hazine, tapa, cit, baglamaca };
export { kit };
