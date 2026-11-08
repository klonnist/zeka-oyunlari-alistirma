// Tohumlu (seed) rastgele sayı üreteci: aynı kod -> aynı bulmaca
export function makeRng(seed) {
  let a = hashSeed(seed) >>> 0;
  const next = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)), // [lo, hi]
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    shuffle(arr) {
      const b = arr.slice();
      for (let i = b.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [b[i], b[j]] = [b[j], b[i]];
      }
      return b;
    },
    fork: (tag) => makeRng(String(seed) + ':' + tag),
  };
  return rng;
}

function hashSeed(s) {
  s = String(s);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h;
}

const ALPH = 'ABCDEFGHJKLMNPRSTUVYZ23456789';
export function newSeed() {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPH[Math.floor(Math.random() * ALPH.length)];
  return s;
}
