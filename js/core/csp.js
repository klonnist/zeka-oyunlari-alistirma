// Genel geri izlemeli (backtracking) kısıt çözücü.
// vars: 0..n-1, değerler >= 0 tam sayı, atanmamış = -1.
// constraints: [{ vars:[...], check(a) -> bool }]  (kısmi atamada da çağrılır; ihlal yoksa true)
// final(a): tüm atama bitince global kontrol (bağlılık, tek döngü vb.)
export function solve({ n, domains, constraints, final, limit = 2, rng = null, maxNodes = 300000 }) {
  const a = new Int16Array(n).fill(-1);
  const byVar = Array.from({ length: n }, () => []);
  for (const c of constraints) for (const v of c.vars) byVar[v].push(c);
  let count = 0, nodes = 0, aborted = false, first = null;
  const sols = [];

  const ok = (v) => {
    const cs = byVar[v];
    for (let i = 0; i < cs.length; i++) if (!cs[i].check(a)) return false;
    return true;
  };
  const legal = (v) => {
    const out = [];
    for (const val of domains[v]) {
      a[v] = val;
      if (ok(v)) out.push(val);
    }
    a[v] = -1;
    return out;
  };

  // Başlangıç: tek değerli değişkenleri yerleştirmeden önce tutarlılık kontrolü gerekmez; MRV halleder.
  function rec(left) {
    if (aborted || count >= limit) return;
    if (++nodes > maxNodes) { aborted = true; return; }
    if (left === 0) {
      if (final && !final(a)) return;
      count++;
      if (!first) first = Array.from(a);
      sols.push(Array.from(a));
      return;
    }
    let best = -1, bestVals = null;
    for (let v = 0; v < n; v++) {
      if (a[v] !== -1) continue;
      const vals = legal(v);
      if (vals.length === 0) return;
      if (!bestVals || vals.length < bestVals.length) {
        best = v; bestVals = vals;
        if (vals.length === 1) break;
      }
    }
    const order = rng ? rng.shuffle(bestVals) : bestVals;
    for (const val of order) {
      a[best] = val;
      rec(left - 1);
      if (aborted || count >= limit) break;
    }
    a[best] = -1;
  }
  rec(n);
  return { count, solution: first, solutions: sols, aborted, nodes };
}

export const isUnique = (problem) => {
  const r = solve({ ...problem, limit: 2 });
  return !r.aborted && r.count === 1;
};

// Sık kullanılan kısıtlar
export const C = {
  allDiff(vars) {
    return {
      vars,
      check(a) {
        let seen = 0;
        for (const v of vars) {
          const x = a[v];
          if (x < 0) continue;
          const bit = 1 << x;
          if (seen & bit) return false;
          seen |= bit;
        }
        return true;
      },
    };
  },
  // vars içindeki 1 sayısı = k (ikili değişkenler)
  countOnes(vars, k) {
    return {
      vars,
      check(a) {
        let ones = 0, unk = 0;
        for (const v of vars) {
          if (a[v] === 1) ones++;
          else if (a[v] < 0) unk++;
        }
        return ones <= k && ones + unk >= k;
      },
    };
  },
  notEqual(x, y) {
    return { vars: [x, y], check: (a) => a[x] < 0 || a[y] < 0 || a[x] !== a[y] };
  },
};

// İpucu azaltma: items sırayla çıkarılmaya çalışılır, tek çözüm kalıyorsa çıkarılır.
// stillUnique(kept:Set) -> bool. keepAtLeast: en az kaç ipucu kalsın.
export function reduceClues(items, stillUnique, rng, keepAtLeast = 0) {
  const kept = new Set(items);
  for (const it of rng.shuffle(items)) {
    if (kept.size <= keepAtLeast) break;
    kept.delete(it);
    if (!stillUnique(kept)) kept.add(it);
  }
  return kept;
}
