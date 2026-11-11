// SVG tahta çizici + dokunma/sürükleme girişi
import { edgeKey } from './util.js?v=5';

const S = 40; // hücre boyu (viewBox birimi)

export function renderBoard(cfg) {
  const { rows, cols } = cfg;
  const pad = { t: 0, r: 0, b: 0, l: 0, ...(cfg.pad || {}) };
  const W = (cols + pad.l + pad.r) * S + 8, H = (rows + pad.t + pad.b) * S + 8;
  const ox = pad.l * S + 4, oy = pad.t * S + 4;
  const X = (c) => ox + c * S, Y = (r) => oy + r * S;
  const out = [];
  out.push(`<svg class="board" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" data-ox="${ox}" data-oy="${oy}" data-s="${S}">`);

  const cell = (r, c) => (cfg.cells && cfg.cells[r] && cfg.cells[r][c]) || {};
  const isVoid = (r, c) => r < 0 || c < 0 || r >= rows || c >= cols || cell(r, c).void;

  // Hücre zeminleri
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const k = cell(r, c);
    if (k.void) continue;
    let fill = '#fff';
    if (k.black) fill = '#2b2d42';
    else if (k.fill) fill = k.fill;
    if (cfg.sel && cfg.sel[0] === r && cfg.sel[1] === c) fill = '#ffe28a';
    if (k.err) fill = '#ffc9c9';
    out.push(`<rect x="${X(c)}" y="${Y(r)}" width="${S}" height="${S}" fill="${fill}"/>`);
  }
  // İnce çizgiler
  if (!cfg.noGrid) {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (isVoid(r, c)) continue;
      out.push(`<rect x="${X(c)}" y="${Y(r)}" width="${S}" height="${S}" fill="none" stroke="#9aa3b5" stroke-width="1"/>`);
    }
  }
  // Kalın bölge sınırları + dış sınır
  if (!cfg.noGrid) {
    const reg = cfg.regions;
    const rid = (r, c) => (isVoid(r, c) ? '__void' : reg ? reg[r][c] : 0);
    const segs = [];
    for (let r = 0; r <= rows; r++) for (let c = 0; c < cols; c++) {
      const a = rid(r - 1, c), b = rid(r, c);
      if (a !== b && (a !== '__void' || b !== '__void')) segs.push(`M${X(c)} ${Y(r)}h${S}`);
    }
    for (let c = 0; c <= cols; c++) for (let r = 0; r < rows; r++) {
      const a = rid(r, c - 1), b = rid(r, c);
      if (a !== b && (a !== '__void' || b !== '__void')) segs.push(`M${X(c)} ${Y(r)}v${S}`);
    }
    out.push(`<path d="${segs.join('')}" stroke="#2b2d42" stroke-width="3" stroke-linecap="square" fill="none"/>`);
  }

  // Hücre içerikleri
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const k = cell(r, c);
    if (k.void) continue;
    const cx = X(c) + S / 2, cy = Y(r) + S / 2;
    if (k.kakuro) {
      out.push(`<path d="M${X(c)} ${Y(r)}l${S} ${S}" stroke="#fff" stroke-width="1.5"/>`);
      if (k.kakuro.r != null) out.push(`<text x="${X(c) + S - 4}" y="${Y(r) + 15}" class="kk" text-anchor="end">${k.kakuro.r}</text>`);
      if (k.kakuro.d != null) out.push(`<text x="${X(c) + 4}" y="${Y(r) + S - 5}" class="kk">${k.kakuro.d}</text>`);
    }
    const popped = cfg.pop && cfg.pop.has(r + ',' + c);
    if (popped) out.push('<g class="pop">');
    if (k.sym) out.push(symbol(k.sym, cx, cy));
    if (k.label) out.push(`<text x="${X(c) + 3}" y="${Y(r) + 12}" class="lbl">${esc(k.label)}</text>`);
    if (k.mark) out.push(`<text x="${X(c) + S - 3}" y="${Y(r) + 12}" class="mark" text-anchor="end">${esc(k.mark)}</text>`);
    if (k.text != null && k.text !== '') {
      const cls = k.cls || 'given';
      const L = String(k.text).length;
      const fs = L > 2 || (L > 1 && cls !== 'clue') ? ' style="font-size:15px"' : '';
      out.push(`<text x="${cx}" y="${cy + 1}" class="t ${cls}" text-anchor="middle" dominant-baseline="central"${fs}>${esc(k.text)}</text>`);
    }
    if (popped) out.push('</g>');
    if (k.note) out.push(`<text x="${cx}" y="${Y(r) + S - 4}" class="note" text-anchor="middle">${esc(k.note)}</text>`);
  }

  // Ardışık noktalar
  for (const [r1, c1, r2, c2] of cfg.dots || []) {
    const x = (X(c1) + X(c2)) / 2 + S / 2, y = (Y(r1) + Y(r2)) / 2 + S / 2;
    out.push(`<circle cx="${x}" cy="${y}" r="5" fill="#2b2d42"/>`);
  }

  // Dış ipuçları
  for (const o of cfg.outside || []) {
    let x, y;
    if (o.side === 'top') { x = X(o.i) + S / 2; y = Y(0) - S / 2; }
    if (o.side === 'bottom') { x = X(o.i) + S / 2; y = Y(rows) + S / 2; }
    if (o.side === 'left') { x = X(0) - S / 2; y = Y(o.i) + S / 2; }
    if (o.side === 'right') { x = X(cols) + (o.wide ? S * o.wide / 2 : S / 2); y = Y(o.i) + S / 2; }
    out.push(`<text x="${x}" y="${y + 1}" class="t out" text-anchor="middle" dominant-baseline="central">${esc(o.text)}</text>`);
  }

  // Ok
  const ar = cfg.arrow;
  if (ar && ar.kind === 'diag') {
    const n = rows;
    const x0 = ar.anti ? X(n) + 16 : X(0) - 16, y0 = Y(0) - 16;
    const x1 = ar.anti ? X(n) - 4 : X(0) + 4, y1 = Y(0) + 4;
    out.push(arrowSvg(x0, y0, x1, y1));
  } else if (ar && ar.kind === 'line') {
    let x0, y0, x1, y1;
    if (ar.side === 'left') { x0 = X(0) - S + 6; x1 = X(0) - 4; y0 = y1 = Y(ar.i) + S / 2; }
    if (ar.side === 'top') { y0 = Y(0) - S + 6; y1 = Y(0) - 4; x0 = x1 = X(ar.i) + S / 2; }
    out.push(arrowSvg(x0, y0, x1, y1));
  }

  // Kafes (çit noktaları / bağlantı yolları)
  const L = cfg.lattice;
  if (L) {
    const off = L.type === 'center' ? S / 2 : 0;
    const P = (r, c) => [X(c) + off, Y(r) + off];
    const fresh = L.fresh ? [...L.fresh] : [];
    const draw = (set, color, w) => {
      for (const k of set) {
        const [r1, c1, r2, c2] = parseKey(k);
        const [x1, y1] = P(r1, c1), [x2, y2] = P(r2, c2);
        const i = fresh.indexOf(k);
        const anim = i >= 0 ? ` class="draw" pathLength="1" style="animation-delay:${(i * 0.12).toFixed(2)}s"` : '';
        out.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"${anim}/>`);
      }
    };
    for (const k of L.crosses || []) {
      const [r1, c1, r2, c2] = parseKey(k);
      const [x1, y1] = P(r1, c1), [x2, y2] = P(r2, c2);
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      out.push(`<path class="pop" d="M${mx - 4} ${my - 4}l8 8M${mx + 4} ${my - 4}l-8 8" stroke="#9aa3b5" stroke-width="2.2"/>`);
    }
    if (L.paths) {
      for (const { set, color } of L.paths) draw(set, color, 12);
    } else draw(L.edges || [], L.color || '#e4572e', L.type === 'center' ? 10 : 5);
    if (L.type === 'corner') {
      for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
        const [x, y] = P(r, c);
        out.push(`<circle cx="${x}" cy="${y}" r="3" fill="#2b2d42"/>`);
      }
    }
    // bağlamaca harfleri yolların üstünde dursun
    if (L.type === 'center') {
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const k = cell(r, c);
        if (k.endpoint) {
          out.push(`<circle cx="${X(c) + S / 2}" cy="${Y(r) + S / 2}" r="14" fill="#fff" stroke="#2b2d42" stroke-width="2"/>`);
          out.push(`<text x="${X(c) + S / 2}" y="${Y(r) + S / 2 + 1}" class="t given" text-anchor="middle" dominant-baseline="central">${esc(k.endpoint)}</text>`);
        }
      }
    }
  }
  // Ders katmanları: tarama şeritleri, odak halkaları, el işareti
  for (const b of cfg.scan || []) {
    out.push(`<rect class="scan" x="${X(b.c) + 2}" y="${Y(b.r) + 2}" width="${b.w * S - 4}" height="${b.h * S - 4}" rx="8" fill="${b.color || '#5b4bdb'}" fill-opacity=".14" stroke="${b.color || '#5b4bdb'}" stroke-width="2.5"/>`);
  }
  for (const [r, c, color] of cfg.focus || []) {
    out.push(`<rect class="pulse" x="${X(c) + 3}" y="${Y(r) + 3}" width="${S - 6}" height="${S - 6}" rx="7" fill="none" stroke="${color || '#ff9f1c'}" stroke-width="4"/>`);
  }
  if (cfg.pointer) {
    const [r, c] = cfg.pointer;
    const px = X(c) + S * 0.62, py = Y(r) + S * 0.72;
    out.push(`<g class="hand" style="--hx:${px}px;--hy:${py}px"><circle class="ripple" cx="${X(c) + S / 2}" cy="${Y(r) + S / 2}" r="6" fill="none" stroke="#ff9f1c" stroke-width="3"/><text x="${px}" y="${py}" font-size="24" dominant-baseline="hanging">👆</text></g>`);
  }
  out.push('</svg>');
  return out.join('');
}

function parseKey(k) {
  const [r, c] = k.slice(1).split(',').map(Number);
  return k[0] === 'h' ? [r, c, r, c + 1] : [r, c, r + 1, c];
}

function arrowSvg(x0, y0, x1, y1) {
  const ang = Math.atan2(y1 - y0, x1 - x0), h = 9;
  const a1 = ang + Math.PI * 0.82, a2 = ang - Math.PI * 0.82;
  return `<g stroke="#e4572e" stroke-width="3" fill="#e4572e"><line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}"/>` +
    `<path d="M${x1} ${y1}L${x1 + h * Math.cos(a1)} ${y1 + h * Math.sin(a1)}L${x1 + h * Math.cos(a2)} ${y1 + h * Math.sin(a2)}Z"/></g>`;
}

function symbol(sym, cx, cy) {
  switch (sym) {
    case 'ship': return `<rect x="${cx - 14}" y="${cy - 14}" width="28" height="28" rx="9" fill="#3a6ea5"/>`;
    case 'water': return `<path d="M${cx - 12} ${cy}q6 -6 12 0t12 0M${cx - 12} ${cy + 7}q6 -6 12 0t12 0" stroke="#5fa8d3" stroke-width="2.5" fill="none"/>`;
    case 'diamond': return `<path d="M${cx} ${cy - 13}L${cx + 11} ${cy}L${cx} ${cy + 13}L${cx - 11} ${cy}Z" fill="#00a6a6" stroke="#05668d" stroke-width="2"/>`;
    case 'cross': return `<path d="M${cx - 6} ${cy - 6}l12 12M${cx + 6} ${cy - 6}l-12 12" stroke="#9aa3b5" stroke-width="2.5"/>`;
    case 'fill': return `<rect x="${cx - 20}" y="${cy - 20}" width="40" height="40" fill="#2b2d42"/>`;
    case 'dot': return `<circle cx="${cx}" cy="${cy}" r="4" fill="#9aa3b5"/>`;
    default: return '';
  }
}

export function esc(s) {
  return String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

// Tahta üzerinde dokunma/sürükleme. handlers: { cell(r,c), edge(key) }
// lattice: null | 'corner' | 'center'
export function attachInput(svg, rows, cols, lattice, handlers) {
  const ox = +svg.dataset.ox, oy = +svg.dataset.oy, s = +svg.dataset.s;
  const toLocal = (ev) => {
    const rect = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const x = ((ev.clientX - rect.left) / rect.width) * vb.width;
    const y = ((ev.clientY - rect.top) / rect.height) * vb.height;
    return [(x - ox) / s, (y - oy) / s]; // hücre birimi
  };
  if (!lattice) {
    svg.addEventListener('pointerdown', (ev) => {
      const [x, y] = toLocal(ev);
      const r = Math.floor(y), c = Math.floor(x);
      if (r >= 0 && c >= 0 && r < rows && c < cols) handlers.cell(r, c);
    });
    return;
  }
  const off = lattice === 'center' ? 0.5 : 0;
  const pr = lattice === 'center' ? rows - 1 : rows, pc = lattice === 'center' ? cols - 1 : cols;
  const nearPoint = (x, y, tol) => {
    const r = Math.round(y - off), c = Math.round(x - off);
    if (r < 0 || c < 0 || r > pr || c > pc) return null;
    const d = Math.hypot(y - off - r, x - off - c);
    return d <= tol ? [r, c] : null;
  };
  let last = null, moved = false, mode = null, down = null;
  svg.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    svg.setPointerCapture(ev.pointerId);
    const [x, y] = toLocal(ev);
    down = [x, y];
    last = nearPoint(x, y, 0.42);
    moved = false; mode = null;
  });
  svg.addEventListener('pointermove', (ev) => {
    if (!down) return;
    const [x, y] = toLocal(ev);
    const p = nearPoint(x, y, 0.36);
    if (!p) return;
    if (!last) { last = p; return; }
    if (p[0] === last[0] && p[1] === last[1]) return;
    if (Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) === 1) {
      const k = edgeKey(last[0], last[1], p[0], p[1]);
      mode = handlers.edge(k, mode);
      moved = true;
    }
    last = p;
  });
  const end = (ev) => {
    if (!down) return;
    if (!moved) {
      // Dokunma: en yakın kenar orta noktası
      const [x, y] = down;
      const fx = x - off, fy = y - off;
      const cands = [];
      const r0 = Math.floor(fy), c0 = Math.floor(fx);
      // yatay kenar: (r, c)-(r, c+1), orta (r, c+0.5)
      for (const r of [Math.round(fy)]) for (const c of [c0]) cands.push([r, c, r, c + 1, Math.hypot(fy - r, fx - c - 0.5)]);
      for (const c of [Math.round(fx)]) for (const r of [r0]) cands.push([r, c, r + 1, c, Math.hypot(fy - r - 0.5, fx - c)]);
      cands.sort((p, q) => p[4] - q[4]);
      const b = cands.find((e) => e[0] >= 0 && e[1] >= 0 && e[2] <= pr && e[3] <= pc);
      if (b && b[4] < 0.42) handlers.edge(edgeKey(b[0], b[1], b[2], b[3]), null);
    }
    down = null; last = null;
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
}
