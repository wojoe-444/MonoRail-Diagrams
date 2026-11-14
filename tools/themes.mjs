// Themes: how a rendered diagram looks. docs/themes.md has the rules (T-1 to T-6).
//
// A theme is applied when a diagram is RENDERED. The .bpmn and .dmn files never carry one
// (BP-17, DM-14), and a theme cannot change what is drawn: it sets colour, font, corner radius,
// shadow and ring weight, and nothing else. Shapes, markers, line patterns, text and layout are
// the notation's. checkTheme() holds every theme to a legibility floor and `npm test` runs it.

export const KINDS = ['start', 'end', 'inter', 'gateway', 'sub', 'data', 'pool', 'blackbox'];

const FONT_STYLED = "Inter, 'Segoe UI', system-ui, -apple-system, Roboto, Arial, sans-serif";

export const THEMES = {
  plain: {
    id: 'plain',
    label: 'Plain',
    description: 'Black on white, the notation as drawn in a technical document. Prints well.',
    page: { bg: '#ffffff', ink: '#111111', muted: '#555555', font: 'Arial, sans-serif' },
    ink: '#22242a',
    muted: '#555555',
    line: '#22242a',
    font: 'Arial, sans-serif',
    stroke: { base: 2, end: 4 },
    shape: { fill: '#ffffff', outline: '#22242a', radius: 10, shadow: null },
    kinds: Object.fromEntries(KINDS.map((k) => [k, { fill: '#ffffff', outline: '#22242a' }])),
    table: { header: '#f3f3f3', band: '#e9e9e9', radius: 0 },
  },

  cards: {
    id: 'cards',
    label: 'Cards',
    description: 'Soft white cards, rounded corners and a light shadow, grey connectors, semibold names. Modelled on a status-board look.',
    page: { bg: '#f6f7f9', ink: '#111827', muted: '#4b5563', font: FONT_STYLED },
    ink: '#1f2937',
    muted: '#4b5563',
    line: '#5f6b7a',
    font: FONT_STYLED,
    stroke: { base: 1.5, end: 3.5 },
    shape: { fill: '#ffffff', outline: '#858e9c', radius: 12, shadow: '0 1px 2px rgba(16, 24, 40, 0.28)' },
    kinds: {
      start: { fill: '#e4f5ec', outline: '#2f7d55' },
      end: { fill: '#e8e8f8', outline: '#4a4a9e' },
      inter: { fill: '#fdf1d8', outline: '#8f6410' },
      gateway: { fill: '#eef1f5', outline: '#5f6b7a' },
      sub: { fill: '#f1f4f2', outline: '#6b7a70', radius: 14 },
      data: { fill: '#ffffff', outline: '#858e9c' },
      pool: { fill: '#ffffff', outline: '#858e9c' },
      blackbox: { fill: '#eef1f5', outline: '#858e9c' },
    },
    table: { header: '#eef1f5', band: '#e3e8ee', radius: 12 },
  },

  dusk: {
    id: 'dusk',
    label: 'Dusk',
    description: 'The Cards look on a dark page, for dark documentation and slides.',
    page: { bg: '#10151c', ink: '#e8edf4', muted: '#a9b4c3', font: FONT_STYLED },
    ink: '#e8edf4',
    muted: '#a9b4c3',
    line: '#9aa7ba',
    font: FONT_STYLED,
    stroke: { base: 1.5, end: 3.5 },
    shape: { fill: '#1d2430', outline: '#8693a8', radius: 12, shadow: '0 1px 3px rgba(0, 0, 0, 0.6)' },
    kinds: {
      start: { fill: '#17382a', outline: '#6fd39b' },
      end: { fill: '#26264a', outline: '#a9a9f2' },
      inter: { fill: '#3b2f12', outline: '#e9b95e' },
      gateway: { fill: '#252d3a', outline: '#9aa7ba' },
      sub: { fill: '#18211d', outline: '#7f9a8a', radius: 14 },
      data: { fill: '#1d2430', outline: '#8693a8' },
      pool: { fill: '#161c25', outline: '#8693a8' },
      blackbox: { fill: '#202836', outline: '#8693a8' },
    },
    table: { header: '#252d3a', band: '#1f2632', radius: 12 },
  },
};

export const DEFAULT_THEME = 'plain';

export function getTheme(id) {
  const t = THEMES[id ?? DEFAULT_THEME];
  if (!t) throw new Error(`unknown theme "${id}" (themes: ${Object.keys(THEMES).join(', ')})`);
  return t;
}

// ---- legibility floor (T-4) --------------------------------------------------------------

const hex = (c) => {
  const m = /^#([0-9a-f]{6})$/i.exec(c);
  if (!m) throw new Error(`theme colours are #rrggbb, got "${c}"`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const lum = (c) => {
  const [r, g, b] = hex(c).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export function contrast(a, b) {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Problems with a theme, as strings; empty when it meets the floor. */
export function checkTheme(t) {
  const out = [];
  const need = (name, a, b, min) => {
    const c = contrast(a, b);
    if (c < min) out.push(`${name}: contrast ${c.toFixed(2)}:1 is below ${min}:1 (${a} on ${b})`);
  };
  // T-2: colour only by the kinds the shapes already distinguish
  for (const k of Object.keys(t.kinds)) if (!KINDS.includes(k)) out.push(`kind "${k}" is not one a shape already distinguishes (${KINDS.join(', ')})`);
  for (const k of KINDS) if (!t.kinds[k]) out.push(`kind "${k}" is missing`);
  if (out.length) return out;

  const surface = t.kinds.pool.fill; // what flow lines and labels sit on
  need('text on page', t.page.ink, t.page.bg, 4.5);
  need('secondary text on page', t.page.muted, t.page.bg, 4.5);
  need('label on shape', t.ink, t.shape.fill, 4.5);
  need('label on pool', t.ink, surface, 4.5);
  need('flow label on pool', t.muted, surface, 4.5);
  for (const [k, v] of Object.entries(t.kinds)) {
    need(`label on ${k}`, t.ink, v.fill, 4.5);
    need(`${k} outline against its pool`, v.outline, surface, 3);
  }
  need('card outline against its pool', t.shape.outline, surface, 3);
  need('connector against pool', t.line, surface, 3);
  need('connector against page', t.line, t.page.bg, 3);
  // ring weights: an end event must stay clearly heavier than a start event
  if (t.stroke.end < 2 * t.stroke.base) out.push(`end ring ${t.stroke.end}px must be at least twice the start ring ${t.stroke.base}px`);
  if (t.stroke.base < 1.2) out.push(`ring ${t.stroke.base}px is too thin to read`);
  out.push(...cssProblems(themeCss(t)));
  return out;
}

// ---- what a stylesheet may touch (T-1) ------------------------------------------------------

// Colour, type, corner radius, shadow and ring weight. Nothing here can hide, move, resize or
// re-pattern a shape, a marker or a line: no display, visibility, opacity, transform, size,
// position, stroke-dasharray, stroke-linecap or marker properties.
export const ALLOWED_CSS = new Set([
  'fill', 'fill-opacity', 'stroke', 'stroke-width', 'rx', 'ry',
  'font-family', 'font-weight', 'font-size', 'filter',
]);

/** Properties in a stylesheet that a theme is not allowed to set. */
export function cssProblems(css) {
  const bad = new Set();
  for (const block of css.matchAll(/\{([^}]*)\}/g)) {
    for (const decl of block[1].split(';')) {
      const prop = decl.split(':')[0].trim();
      if (prop && !ALLOWED_CSS.has(prop)) bad.add(prop);
    }
  }
  return [...bad].map((p) => `stylesheet sets "${p}", which a theme may not (colour, type, radius, shadow and ring weight only)`);
}

// ---- stylesheet ---------------------------------------------------------------------------

const DEFAULT_INK = 'rgb(34, 36, 42)'; // the viewer's own colour, replaced everywhere a theme is on

/** CSS for one theme, applied to the SVG the viewers export. Empty for plain. */
export function themeCss(t) {
  if (t.id === 'plain') return '';
  const k = t.kinds;
  const w = t.stroke.base;
  const rect = (kind, extra = '') =>
    `fill: ${kind.fill} !important; fill-opacity: 1 !important; stroke: ${kind.outline} !important; stroke-width: ${w}px !important; ${extra}`;
  const card = (kind, r) => `${rect(kind, `rx: ${r}px; ry: ${r}px;`)}`;
  return `
.djs-element text, .djs-label text { font-family: ${t.font} !important; fill: ${t.ink} !important; }
.djs-shape.th-task text, .djs-shape.th-sub .djs-visual > text, .djs-shape.th-pool text, .djs-shape.th-decision text { font-weight: 600 !important; }
.th-label-flow text { fill: ${t.muted} !important; font-size: 11px !important; font-weight: 400 !important; }
.djs-shape .djs-visual [style*="stroke: ${DEFAULT_INK}"] { stroke: ${t.ink} !important; }
.djs-shape .djs-visual [style*="fill: ${DEFAULT_INK}"] { fill: ${t.ink} !important; }
.djs-shape .djs-visual [style*="fill: white"] { fill: ${t.shape.fill} !important; }
.djs-shape.th-task .djs-visual > rect:first-child, .djs-shape.th-decision .djs-visual > rect:first-child { ${card(t.shape, t.shape.radius)} }
.djs-shape.th-sub .djs-visual > rect:first-child { ${card({ fill: k.sub.fill, outline: k.sub.outline }, k.sub.radius ?? t.shape.radius)} }
.djs-shape.th-pool .djs-visual > rect:first-child { ${rect({ fill: k.pool.fill, outline: k.pool.outline })} }
.djs-shape.th-pool .djs-visual > path { stroke: ${k.pool.outline} !important; stroke-width: ${w}px !important; }
.djs-shape.th-blackbox .djs-visual > rect:first-child { ${rect({ fill: k.blackbox.fill, outline: k.blackbox.outline })} }
.djs-shape.th-gateway .djs-visual > polygon { ${rect(k.gateway)} }
.djs-shape.th-gateway .djs-visual > path { stroke: ${t.ink} !important; }
.djs-shape.th-data .djs-visual > path:first-child, .djs-shape.th-data .djs-visual > path { stroke: ${k.data.outline} !important; stroke-width: ${w}px !important; }
.djs-shape.th-event .djs-visual > circle { stroke-width: ${w}px !important; }
.djs-shape.th-start .djs-visual > circle { fill: ${k.start.fill} !important; fill-opacity: 1 !important; stroke: ${k.start.outline} !important; }
.djs-shape.th-end .djs-visual > circle { fill: ${k.end.fill} !important; fill-opacity: 1 !important; stroke: ${k.end.outline} !important; stroke-width: ${t.stroke.end}px !important; }
.djs-shape.th-inter .djs-visual > circle { fill: ${k.inter.fill} !important; fill-opacity: 1 !important; stroke: ${k.inter.outline} !important; }
.djs-shape.th-task, .djs-shape.th-sub, .djs-shape.th-decision { ${t.shape.shadow ? `filter: drop-shadow(${t.shape.shadow});` : ''} }
.djs-connection .djs-visual > path { stroke: ${t.line} !important; stroke-width: ${w}px !important; }
/* Arrowheads: recolour what is there, keep what it is. Filled stays filled, open stays open, hollow stays hollow. */
marker [style*="stroke: ${DEFAULT_INK}"] { stroke: ${t.line} !important; }
marker [style*="fill: ${DEFAULT_INK}"] { fill: ${t.line} !important; }
marker [style*="fill: white"] { fill: ${t.shape.fill} !important; }
.djs-shape.th-input .djs-visual > rect:first-child { ${card(k.data, 22)} }
`;
}
