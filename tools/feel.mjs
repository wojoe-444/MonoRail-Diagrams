// A small evaluator for the FEEL subset that docs/dmn-profile.md (DM-8) allows in
// decision table input entries. It exists so the linter can prove a table is complete
// (every combination of inputs matches a rule) and, for hit policy U, that no two rules
// overlap. Anything outside the subset is reported as unsupported, never guessed.

export class Unsupported extends Error {}

/** Split on commas that are not inside quotes, brackets or parentheses. */
function splitTop(text) {
  const parts = [];
  let depth = 0;
  let inStr = false;
  let cur = '';
  for (const ch of text) {
    if (ch === '"') inStr = !inStr;
    if (!inStr) {
      if (ch === '(' || ch === '[') depth++;
      if (ch === ')' || ch === ']') depth--;
      if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    }
    cur += ch;
  }
  parts.push(cur);
  return parts.map((p) => p.trim());
}

const NUM = /^-?\d+(\.\d+)?$/;

function parseAtom(a) {
  if (NUM.test(a)) { const n = Number(a); return { test: (v) => v === n, nums: [n] }; }
  if (/^"[^"]*"$/.test(a)) { const s = a.slice(1, -1); return { test: (v) => v === s, strs: [s] }; }
  if (a === 'true' || a === 'false') { const b = a === 'true'; return { test: (v) => v === b }; }
  let m = a.match(/^(<=|>=|<|>)\s*(-?\d+(?:\.\d+)?)$/);
  if (m) {
    const n = Number(m[2]);
    const f = { '<': (v) => v < n, '<=': (v) => v <= n, '>': (v) => v > n, '>=': (v) => v >= n }[m[1]];
    return { test: (v) => typeof v === 'number' && f(v), nums: [n] };
  }
  m = a.match(/^([\[(])\s*(-?\d+(?:\.\d+)?)\s*\.\.\s*(-?\d+(?:\.\d+)?)\s*([\])])$/);
  if (m) {
    const lo = Number(m[2]);
    const hi = Number(m[3]);
    const loInc = m[1] === '[';
    const hiInc = m[4] === ']';
    return {
      test: (v) => typeof v === 'number' && (loInc ? v >= lo : v > lo) && (hiInc ? v <= hi : v < hi),
      nums: [lo, hi],
    };
  }
  throw new Unsupported(a);
}

/** Parse one input entry into { any, test(value), nums[], strs[] }. */
export function parseEntry(text) {
  const t = (text ?? '').trim();
  if (t === '' || t === '-') return { any: true, test: () => true, nums: [], strs: [] };
  let negate = false;
  let body = t;
  const m = t.match(/^not\((.*)\)$/s);
  if (m) { negate = true; body = m[1]; }
  const atoms = splitTop(body).map(parseAtom);
  const test = (v) => atoms.some((a) => a.test(v)) !== negate;
  return {
    any: false,
    test,
    nums: atoms.flatMap((a) => a.nums ?? []),
    strs: atoms.flatMap((a) => a.strs ?? []),
  };
}

/** Parse an allowed-values list ("a","b" or true,false or 1,2) into an array of values. */
export function parseValues(text) {
  return splitTop(text ?? '').filter(Boolean).map((a) => {
    if (NUM.test(a)) return Number(a);
    if (/^"[^"]*"$/.test(a)) return a.slice(1, -1);
    if (a === 'true') return true;
    if (a === 'false') return false;
    throw new Unsupported(a);
  });
}

/** Representative values of a numeric column: each breakpoint and a point between/around them. */
export function numericDomain(nums) {
  const c = [...new Set(nums)].sort((a, b) => a - b);
  if (!c.length) return [0];
  const pts = [c[0] - 1];
  c.forEach((x, i) => {
    pts.push(x);
    pts.push(i + 1 < c.length ? (x + c[i + 1]) / 2 : x + 1);
  });
  return pts;
}
