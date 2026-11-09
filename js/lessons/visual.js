// Görsel türlerin animasyonlu dersleri (Gölge, Farklı Şekil, Tıpatıp, Üstten Görünüş)
import { kit } from './kit.js';
import { polySvg, figGrid, normalize, keyOf, transform } from '../games/visual.js';
import { cardSvg, keyCard } from '../games/tipatip.js';
import { cubesSvg, topSvg } from '../games/ustten.js';

const ok = (s) => s + ' good';
const qaSay = (p) => `Doğru şık ${'ABCD'[p.q.options.indexOf(p.q.answer)]}) ${p.q.answer}.`;

// iki hücre kümesini en iyi üst üste getir; fazla (red) ve eksik (ghost) hücreleri ver
function overlay(base, other) {
  const B = normalize(base.map(([r, c]) => [r, c])), O = normalize(other.map(([r, c]) => [r, c]));
  const has = (arr, r, c) => arr.some((x) => x[0] === r && x[1] === c);
  let best = null;
  for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
    const S = O.map(([r, c]) => [r + dr, c + dc]);
    const score = S.filter(([r, c]) => has(B, r, c)).length;
    if (!best || score > best.score) best = { score, S };
  }
  const S = best.S;
  const all = [...B, ...S];
  const mr = Math.min(...all.map((x) => x[0])), mc = Math.min(...all.map((x) => x[1]));
  const sh = (arr) => arr.map(([r, c]) => [r - mr, c - mc]);
  const S2 = sh(S), B2 = sh(B);
  return { cells: S2, red: S2.filter(([r, c]) => !has(B2, r, c)), ghost: B2.filter(([r, c]) => !has(S2, r, c)) };
}

function golge(game, p) {
  const k = kit(game, p);
  const pos = Number(p.q.answer) - 1;
  const box = Math.max(6, ...p.shadows.flatMap((s) => s.map((x) => Math.max(x[0], x[1]) + 2)));
  const main = (cls = '') => `<div class="figmain ${cls}">${polySvg(p.fig, { box: 6, cell: 24 })}</div>`;
  const grid = (marks = {}) => figGrid(p.shadows.map((s, i) => {
    const m = marks[i];
    if (m && m.diff) { const o = overlay(p.fig, s); return { label: `${i + 1} ✗`, cls: 'bad', svg: polySvg(o.cells, { box: box + 1, cell: 16, shadow: true, red: o.red, ghost: o.ghost, norm: false }) }; }
    return { label: m && m.good ? `${i + 1} ✓` : String(i + 1), cls: m && m.good ? 'good' : '', svg: polySvg(s, { box, cell: 18, shadow: true }) };
  }));
  k.step('Üstte renkli bir resim, altta dört gölge var. Gölgelerden yalnızca biri bu resme ait.', { html: main() + grid() });
  k.step('Resmi kafamızda gölgeye çevirelim: renkler ve desenler kaybolur, sadece dış şekli kalır.', { html: main('darken') + grid() });
  const marks = {};
  const mirrorKey = keyOf(transform(p.fig.map(([r, c]) => [r, c]), 4));
  for (let i = 0; i < 4; i++) {
    if (i === pos) continue;
    const s = p.shadows[i];
    marks[i] = { diff: true };
    const o = overlay(p.fig, s);
    let why;
    if (keyOf(s) === mirrorKey) why = `Gölge ${i + 1}, resmin ayna görüntüsü: sağı ile solu yer değiştirmiş. Gölge resimle aynı yöne bakmalı.`;
    else if (o.red.length && o.ghost.length) why = `Gölge ${i + 1}'de bir kare yer değiştirmiş: kırmızı kare fazla, kesikli çizgili yer eksik.`;
    else if (o.red.length) why = `Gölge ${i + 1}'de fazladan ${o.red.length > 1 ? o.red.length + ' kare' : 'bir kare'} var (kırmızı).`;
    else why = `Gölge ${i + 1}'de ${o.ghost.length > 1 ? o.ghost.length + ' kare' : 'bir kare'} eksik (kesikli çizgi).`;
    k.step(why, { html: main('dark') + grid({ ...marks }) });
  }
  marks[pos] = { good: true };
  k.step(`Gölge ${pos + 1} resimle kare kare aynı! ${qaSay(p)}`, { html: main('dark') + grid(marks), qa: true });
  return k.steps;
}

function farkli(game, p) {
  const k = kit(game, p);
  const odd = Number(p.q.answer) - 1;
  const ref = odd === 0 ? 1 : 0;
  const refKey = keyOf(normalize(p.shapes[ref]));
  const items = (over = {}) => figGrid(p.shapes.map((s, i) => {
    const o = over[i];
    if (!o) return { label: String(i + 1), svg: polySvg(s, { box: 5, cell: 22 }) };
    return { label: o.label, cls: o.cls, svg: o.svg };
  }));
  k.step('Dört şekilden biri diğerlerinden farklı. Ama dikkat: şekiller döndürülmüş ya da ayna gibi ters çevrilmiş olabilir.', { html: items() });
  k.step(`Bir şekli döndürmek onu değiştirmez. Şekil ${ref + 1}'i örnek alalım ve diğerlerini onun gibi çevirmeye çalışalım.`, { html: items({ [ref]: { label: `${ref + 1} örnek`, cls: 'ref spin', svg: polySvg(p.shapes[ref], { box: 5, cell: 22 }) } }) });
  const over = { [ref]: { label: `${ref + 1} örnek`, cls: 'ref', svg: polySvg(p.shapes[ref], { box: 5, cell: 22 }) } };
  for (let i = 0; i < 4; i++) {
    if (i === ref || i === odd) continue;
    const t = [0, 1, 2, 3, 4, 5, 6, 7].find((x) => keyOf(transform(p.shapes[i], x)) === refKey) ?? 0;
    const how = t >= 4 ? 'ayna gibi ters çevirip döndürünce' : t === 0 ? 'hiç çevirmeden' : 'döndürünce';
    over[i] = { label: `${i + 1} ✓`, cls: 'good turn', svg: polySvg(transform(p.shapes[i], t), { box: 5, cell: 22 }) };
    k.step(`Şekil ${i + 1}'i ${how} Şekil ${ref + 1}'in tıpatıp aynısı oluyor.`, { html: items({ ...over }) });
    over[i] = { ...over[i], cls: 'good' };
  }
  // farklı şekil: en çok benzeyen dönüşüm
  let best = null;
  for (let t = 0; t < 8; t++) {
    const T = transform(p.shapes[odd], t);
    const R = normalize(p.shapes[ref]);
    const same = T.filter(([r, c, , m]) => R.some((x) => x[0] === r && x[1] === c && (x[3] || '') === (m || ''))).length;
    if (!best || same > best.same) best = { T, same, t };
  }
  const R = normalize(p.shapes[ref]);
  const red = best.T.filter(([r, c, , m]) => !R.some((x) => x[0] === r && x[1] === c && (x[3] || '') === (m || '')));
  const markDiff = red.some(([r, c]) => R.some((x) => x[0] === r && x[1] === c));
  over[odd] = { label: `${odd + 1} ✗`, cls: 'bad', svg: polySvg(best.T, { box: 5, cell: 22, red }) };
  k.step(`Şekil ${odd + 1}'i nasıl çevirirsek çevirelim Şekil ${ref + 1} olmuyor: ${markDiff ? 'işaret farklı bir karede' : 'bir karesi farklı yerde'} (kırmızı). ${qaSay(p)}`, { html: items(over), qa: true });
  return k.steps;
}

function tipatip(game, p) {
  const k = kit(game, p);
  const [a, b] = p.q.answer.split('-').map((x) => Number(x) - 1);
  const twin = p.cards[a];
  const diffs = p.cards.map((card) => card.map((c, i) => i).filter((i) => keyCard([card[i]]) !== keyCard([twin[i]])));
  const show = (marked, good = false) => figGrid(p.cards.map((c, i) => {
    const isTwin = i === a || i === b;
    if (good && isTwin) return { label: `${i + 1} ✓`, cls: 'good', svg: cardSvg(c, p.n) };
    if (marked.has(i)) return { label: `${i + 1} ✗`, cls: 'bad', svg: cardSvg(c, p.n, diffs[i]) };
    return { label: String(i + 1), svg: cardSvg(c, p.n) };
  }), 'eight');
  k.step('Sekiz resim var. Yalnızca ikisi birbirinin tıpatıp aynısı; diğerlerinde küçücük birer fark saklı.', { html: show(new Set()) });
  k.step('Resimleri kare kare karşılaştırırız: her karenin rengine ve içindeki şekle bakarız. Satır satır gitmek hiçbir kareyi atlamamamızı sağlar.', { html: show(new Set()) });
  const wrong = p.cards.map((_, i) => i).filter((i) => i !== a && i !== b);
  const m = new Set();
  for (let j = 0; j < wrong.length; j += 3) {
    wrong.slice(j, j + 3).forEach((i) => m.add(i));
    k.step(j === 0 ? 'Bu resimlerde kırmızı çerçeveli karelerde fark var: renk değişmiş, şekil değişmiş ya da iki kare yer değiştirmiş.' : 'Kalan resimlerdeki farkları da bulduk.', { html: show(new Set(m)) });
  }
  k.step(`Geriye Resim ${a + 1} ve Resim ${b + 1} kaldı: her kareleri aynı! ${qaSay(p)}`, { html: show(m, true), qa: true });
  return k.steps;
}

function ustten(game, p) {
  const k = kit(game, p);
  const pos = Number(p.q.answer) - 1, top = p.opts[pos];
  const cubes = (extra = '') => `<div class="figmain">${cubesSvg(p.h, p.color)}<div class="hint-front">↓ ön taraf</div>${extra}</div>`;
  const opts = (marks = {}) => figGrid(p.opts.map((t, i) => {
    const m = marks[i];
    if (m === 'good') return { label: `${i + 1} ✓`, cls: 'good', svg: topSvg(t) };
    if (m) return { label: `${i + 1} ✗`, cls: 'bad', svg: topSvg(t, m) };
    return { label: String(i + 1), svg: topSvg(t) };
  }));
  k.step('Küplerden yapılmış bir şekil var. Ona tam yukarıdan, bir kuş gibi bakacağız.', { html: cubes('<div class="eye">👁️ yukarıdan bakıyoruz</div>') + opts() });
  k.step('Yukarıdan bakınca her kulenin yalnızca en üstteki küpü görünür. Arkadaki sıra resmin üstüne, öndeki sıra altına çizilir. İşte üstten görünüş:', {
    html: cubes(`<div class="topview pop-in">${topSvg(top)}</div>`) + opts(),
  });
  const R = top.length, Cn = top[0].length;
  const key = (t) => t.map((r) => r.join(',')).join('|');
  const marks = {};
  for (let i = 0; i < 4; i++) {
    if (i === pos) continue;
    const t = p.opts[i];
    const diff = [];
    for (let r = 0; r < R; r++) for (let c = 0; c < Cn; c++) if (t[r][c] !== top[r][c]) diff.push([r, c]);
    marks[i] = diff;
    let why;
    if (key(t) === key(top.map((r) => r.slice().reverse()))) why = `Seçenek ${i + 1}'de sağ ile sol yer değiştirmiş.`;
    else if (key(t) === key(top.slice().reverse())) why = `Seçenek ${i + 1}'de ön ile arka yer değiştirmiş; arka sıra üstte olmalıydı.`;
    else if (key(t) === key(top.slice().reverse().map((r) => r.slice().reverse()))) why = `Seçenek ${i + 1} baş aşağı çevrilmiş.`;
    else why = `Seçenek ${i + 1}'de kırmızı çerçeveli ${diff.length > 1 ? 'kareler' : 'kare'} yanlış.`;
    k.step(why, { html: cubes(`<div class="topview">${topSvg(top)}</div>`) + opts({ ...marks }) });
  }
  marks[pos] = 'good';
  k.step(`Seçenek ${pos + 1} bizim çizdiğimiz üstten görünüşün aynısı! ${qaSay(p)}`, { html: cubes(`<div class="topview">${topSvg(top)}</div>`) + opts(marks), qa: true });
  return k.steps;
}

export const VISUAL_LESSONS = { golge, farkli, tipatip, ustten };
