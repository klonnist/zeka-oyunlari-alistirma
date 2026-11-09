// Oyun türleri için ortak kalıplar
import { grid, clone2 } from '../core/util.js?v=4';

const HL = '#fff1d0'; // soru hücresi vurgusu

function hlSet(p) {
  return new Set((p.q.cells || []).map(([r, c]) => r + ',' + c));
}

// Hücreye değer yazılan oyunlar (sudoku, kendoku, ABC, kakuro, kelime...)
// p: { rows, cols, given[r][c] (string|null), sol[r][c] (string|null: null = oynanmayan hücre), q }
// spec.extra(p) -> { regions, dots, outside, arrow, pad, cell(r,c) }
export function valueGame(spec) {
  return {
    kind: 'value',
    ...spec,
    input: (p) => ({ kind: 'value', palette: spec.palette(p) }),
    initUser: (p) => grid(p.rows, p.cols, ''),
    editable: (p, r, c) => p.sol[r][c] != null && (p.given[r][c] == null || p.given[r][c] === ''),
    view(p, user, st = {}) {
      const ex = spec.extra ? spec.extra(p) : {};
      const hl = hlSet(p);
      const cells = [];
      for (let r = 0; r < p.rows; r++) {
        const row = [];
        for (let c = 0; c < p.cols; c++) {
          const d = { ...(ex.cell ? ex.cell(r, c) : {}) };
          const g = p.given[r][c];
          if (g != null && g !== '') { d.text = g; d.cls = 'given'; }
          else if (p.sol[r][c] != null) {
            const v = st.showSol ? p.sol[r][c] : user[r][c];
            if (v) { d.text = v; d.cls = st.showSol ? 'sol' : 'user'; }
          }
          if (hl.has(r + ',' + c) && !d.black) { d.fill = d.fill || HL; if (p.q.qmark) d.mark = '?'; }
          if (st.errors && st.errors.has(r + ',' + c)) d.err = true;
          row.push(d);
        }
        cells.push(row);
      }
      return { rows: p.rows, cols: p.cols, cells, sel: st.sel, regions: ex.regions, dots: ex.dots, outside: ex.outside, arrow: p.q.arrow, pad: ex.pad };
    },
    check(p, user) {
      const wrong = [], empty = [];
      for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.cols; c++) {
        if (!this.editable(p, r, c)) continue;
        if (!user[r][c]) empty.push(r + ',' + c);
        else if (user[r][c] !== p.sol[r][c]) wrong.push(r + ',' + c);
      }
      return { done: !wrong.length && !empty.length, wrong, empty: empty.length };
    },
    hint(p, user) {
      const cand = [];
      for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.cols; c++)
        if (this.editable(p, r, c) && user[r][c] !== p.sol[r][c]) cand.push([r, c]);
      if (!cand.length) return null;
      const [r, c] = cand[Math.floor(Math.random() * cand.length)];
      const u = clone2(user); u[r][c] = p.sol[r][c];
      return u;
    },
  };
}

// Hücre durumu değiştirilen oyunlar (amiral battı, hazine avı, tapa)
// p.sol[r][c]: 1 = hedef (gemi/elmas/karalı), 0 = boş, null = ipucu hücresi (dokunulmaz)
// p.show[r][c]: ipucu metni ya da açık verilen hücre
// spec.syms: { on:'ship', off:'water' }
export function stateGame(spec) {
  return {
    kind: 'state',
    ...spec,
    input: () => ({ kind: 'state' }),
    initUser(p) {
      const u = grid(p.rows, p.cols, 0);
      for (const [r, c, v] of p.revealed || []) u[r][c] = v === 1 ? 1 : 2;
      return u;
    },
    editable: (p, r, c) => p.sol[r][c] != null && !(p.revealed || []).some(([a, b]) => a === r && b === c),
    view(p, user, st = {}) {
      const ex = spec.extra ? spec.extra(p) : {};
      const hl = hlSet(p);
      const rev = new Set((p.revealed || []).map(([r, c]) => r + ',' + c));
      const cells = [];
      for (let r = 0; r < p.rows; r++) {
        const row = [];
        for (let c = 0; c < p.cols; c++) {
          const d = { ...(ex.cell ? ex.cell(r, c) : {}) };
          if (p.sol[r][c] == null) { d.text = p.show[r][c]; d.cls = 'clue'; }
          else {
            let v = st.showSol ? (p.sol[r][c] === 1 ? 1 : 2) : user[r][c];
            if (v === 1) d.sym = spec.syms.on;
            else if (v === 2) d.sym = spec.syms.off;
            if (rev.has(r + ',' + c)) d.fill = '#e8eef7';
          }
          if (hl.has(r + ',' + c)) { d.fill = d.sym === 'fill' ? d.fill : HL; if (p.q.qmark) d.mark = '?'; }
          if (st.errors && st.errors.has(r + ',' + c)) d.err = true;
          row.push(d);
        }
        cells.push(row);
      }
      return { rows: p.rows, cols: p.cols, cells, outside: ex.outside, pad: ex.pad, arrow: p.q.arrow };
    },
    cycle(v) { return (v + 1) % 3; },
    check(p, user) {
      const wrong = [];
      let empty = 0;
      for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.cols; c++) {
        if (p.sol[r][c] == null) continue;
        const on = user[r][c] === 1;
        if (on !== (p.sol[r][c] === 1)) {
          if (user[r][c] === 0 && p.sol[r][c] === 1) empty++;
          else if (on) wrong.push(r + ',' + c);
          else if (user[r][c] === 2) wrong.push(r + ',' + c);
        }
      }
      // boş bırakılan "hedef olmayan" hücreler sorun değil
      return { done: !wrong.length && !empty, wrong, empty };
    },
    hint(p, user) {
      const cand = [];
      for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.cols; c++) {
        if (p.sol[r][c] == null) continue;
        const want = p.sol[r][c] === 1 ? 1 : 2;
        if (user[r][c] !== want && !(want === 2 && user[r][c] === 0 && false)) cand.push([r, c, want]);
      }
      // önce hedef hücreleri göster
      const on = cand.filter((x) => x[2] === 1);
      const pool = on.length ? on : cand;
      if (!pool.length) return null;
      const [r, c, w] = pool[Math.floor(Math.random() * pool.length)];
      const u = clone2(user); u[r][c] = w;
      return u;
    },
  };
}

// Çizgi çizilen oyunlar (çit, ABC bağlamaca). p.solEdges: string[]
export function edgeGame(spec) {
  return {
    kind: 'edge',
    ...spec,
    input: () => ({ kind: 'edge', lattice: spec.lattice }),
    initUser: () => new Set(),
    check(p, user) {
      const sol = new Set(p.solEdges);
      let wrong = 0, missing = 0;
      for (const e of user) if (!sol.has(e)) wrong++;
      for (const e of sol) if (!user.has(e)) missing++;
      return { done: !wrong && !missing, wrong: [], wrongCount: wrong, empty: missing };
    },
    hint(p, user) {
      const sol = new Set(p.solEdges);
      const u = new Set(user);
      const bad = [...u].filter((e) => !sol.has(e));
      if (bad.length) { u.delete(bad[0]); return u; }
      const miss = p.solEdges.filter((e) => !u.has(e));
      if (!miss.length) return null;
      u.add(miss[Math.floor(Math.random() * miss.length)]);
      return u;
    },
  };
}

// Sadece şıklı (görsel) sorular
export function choiceGame(spec) {
  return { kind: 'choice', ...spec, input: () => null, initUser: () => null };
}
