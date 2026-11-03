// Seeded randomness: the same seed always gives the same pattern, so a
// variation can be saved, shared as a link and opened again exactly.

export function rng(seed) {
  let a = (seed >>> 0) || 1;
  const next = () => {                      // mulberry32
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + (hi - lo) * next();
  next.int = (n) => Math.floor(next() * n);
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  return next;
}

// Independent stream per purpose, so changing e.g. the text does not reshuffle
// the row offsets and vice versa.
export const stream = (seed, salt) => rng(hash(String(seed) + ':' + salt));

export function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export const newSeed = () => 1 + Math.floor(Math.random() * 999999);
