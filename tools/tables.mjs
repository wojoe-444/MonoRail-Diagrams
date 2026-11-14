// Draw a DMN decision table as a standalone SVG (docs/layout.md, LY-12: inputs left,
// outputs right, optional annotation column, rules numbered from 1). Colours, font and corner
// radius come from the theme (themes.mjs); the table's structure never does.

import { parseDmn, is } from './lib/load.mjs';
import { getTheme } from './themes.mjs';

const HIT = { UNIQUE: 'U', FIRST: 'F', ANY: 'A', COLLECT: 'C', PRIORITY: 'P', 'RULE ORDER': 'R', 'OUTPUT ORDER': 'O' };
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const CH = 7.4; // average character width at 13px
const ROW = 30;

/** Decision tables in a parsed DMN file: [{ decision, table }] */
export function tablesOf(defs) {
  return (defs.drgElement ?? [])
    .filter((e) => is(e, 'dmn:Decision') && e.decisionLogic && is(e.decisionLogic, 'dmn:DecisionTable'))
    .map((d) => ({ decision: d, table: d.decisionLogic }));
}

export function tableSvg(decision, table, source, themeId = 'plain') {
  const th = typeof themeId === 'string' ? getTheme(themeId) : themeId;
  const surface = th.kinds.pool.fill;
  const grid = th.shape.outline;
  const hit = table.hitPolicy ?? 'UNIQUE';
  const inputs = (table.input ?? []).map((i) => i.label || i.inputExpression?.text || '');
  const outputs = (table.output ?? []).map((o) => o.label || o.name || decision.name);
  const hasNotes = (table.rule ?? []).some((r) => r.description);
  const header = ['#', ...inputs, ...outputs, ...(hasNotes ? ['Annotation'] : [])];
  const rows = (table.rule ?? []).map((r, n) => [
    String(n + 1),
    ...(r.inputEntry ?? []).map((e) => e.text ?? ''),
    ...(r.outputEntry ?? []).map((e) => e.text ?? ''),
    ...(hasNotes ? [r.description ?? ''] : []),
  ]);
  const widths = header.map((h, c) => Math.max(h.length, ...rows.map((r) => (r[c] ?? '').length), 3) * CH + 28);
  const nIn = inputs.length;
  const nOut = outputs.length;
  const PAD = 24;
  const tableW = widths.reduce((a, b) => a + b, 0);
  const titleH = 44;
  const bandH = ROW;
  const tableH = bandH + ROW * (rows.length + 1);
  const H = titleH + tableH + 44;
  const W = Math.max(tableW + 2 * PAD, 420);
  const xs = [];
  let acc = PAD;
  for (const w of widths) { xs.push(acc); acc += w; }
  const y0 = titleH;
  const r = th.table.radius;
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${th.page.font}" font-size="13">`);
  out.push(`<rect width="${W}" height="${H}" fill="${th.page.bg}"/>`);
  out.push(`<text x="${PAD}" y="30" font-size="18" font-weight="bold" fill="${th.page.ink}">${esc(decision.name)}</text>`);
  if (r) out.push(`<defs><clipPath id="tbl"><rect x="${PAD}" y="${y0}" width="${tableW}" height="${tableH}" rx="${r}" ry="${r}"/></clipPath></defs>`);
  const shadow = th.shape.shadow ? ` style="filter: drop-shadow(${th.shape.shadow})"` : '';
  out.push(`<g${shadow}>`);
  out.push(`<g${r ? ' clip-path="url(#tbl)"' : ''}>`);
  // band: hit policy | Inputs | Outputs
  const band = (x, w, label, fill) =>
    `<rect x="${x}" y="${y0}" width="${w}" height="${bandH}" fill="${fill}" stroke="${grid}" stroke-width="1.2"/><text x="${x + w / 2}" y="${y0 + 20}" text-anchor="middle" font-weight="bold" fill="${th.ink}">${esc(label)}</text>`;
  out.push(band(xs[0], widths[0], HIT[hit] ?? hit, th.table.band));
  if (nIn) out.push(band(xs[1], widths.slice(1, 1 + nIn).reduce((a, b) => a + b, 0), 'Inputs', th.table.header));
  const outX = xs[1 + nIn];
  out.push(band(outX, widths.slice(1 + nIn, 1 + nIn + nOut).reduce((a, b) => a + b, 0), 'Outputs', th.table.header));
  if (hasNotes) out.push(band(xs[header.length - 1], widths[header.length - 1], '', surface));
  // header and body
  const cell = (c, rr, text, opts = {}) => {
    const y = y0 + bandH + rr * ROW;
    return `<rect x="${xs[c]}" y="${y}" width="${widths[c]}" height="${ROW}" fill="${opts.fill ?? surface}" stroke="${grid}" stroke-width="1"/><text x="${xs[c] + (opts.center ? widths[c] / 2 : 10)}" y="${y + 20}" ${opts.center ? 'text-anchor="middle"' : ''} ${opts.bold ? 'font-weight="bold"' : ''} ${opts.mono ? 'font-family="Consolas, monospace"' : ''} fill="${th.ink}">${esc(text)}</text>`;
  };
  header.forEach((h, c) => out.push(cell(c, 0, h, { fill: th.table.header, bold: true, center: c === 0 })));
  rows.forEach((row, i) => row.forEach((t, c) => out.push(cell(c, i + 1, t, { center: c === 0, mono: c > 0 && !(hasNotes && c === header.length - 1) }))));
  out.push('</g>');
  if (r) out.push(`<rect x="${PAD}" y="${y0}" width="${tableW}" height="${tableH}" rx="${r}" ry="${r}" fill="none" stroke="${grid}" stroke-width="1.2"/>`);
  out.push('</g>');
  out.push(`<text x="${PAD}" y="${H - 14}" font-size="11" fill="${th.page.muted}">${esc(source)}</text>`);
  out.push('</svg>', '');
  return out.join('\n');
}

export async function tablesFromXml(xml, source, theme = 'plain') {
  const { defs } = await parseDmn(xml);
  return tablesOf(defs).map(({ decision, table }) => ({ id: decision.id, svg: tableSvg(decision, table, source, theme) }));
}
