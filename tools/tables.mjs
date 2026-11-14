// Draw a DMN decision table as a standalone SVG (docs/layout.md, LY-12: inputs left,
// outputs right, optional annotation column, rules numbered from 1).

import { parseDmn, is } from './lib/load.mjs';

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

export function tableSvg(decision, table, source) {
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
  const H = titleH + bandH + ROW * (rows.length + 1) + 44;
  const W = Math.max(tableW + 2 * PAD, 420);
  const xs = [];
  let acc = PAD;
  for (const w of widths) { xs.push(acc); acc += w; }
  const y0 = titleH;
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Arial, sans-serif" font-size="13">`);
  out.push(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);
  out.push(`<text x="${PAD}" y="30" font-size="18" font-weight="bold" fill="#111111">${esc(decision.name)}</text>`);
  // band: hit policy | Inputs | Outputs
  const band = (x, w, label, fill) =>
    `<rect x="${x}" y="${y0}" width="${w}" height="${bandH}" fill="${fill}" stroke="#111111" stroke-width="1.2"/><text x="${x + w / 2}" y="${y0 + 20}" text-anchor="middle" font-weight="bold" fill="#111111">${esc(label)}</text>`;
  out.push(band(xs[0], widths[0], HIT[hit] ?? hit, '#e9e9e9'));
  if (nIn) out.push(band(xs[1], widths.slice(1, 1 + nIn).reduce((a, b) => a + b, 0), 'Inputs', '#f3f3f3'));
  const outX = xs[1 + nIn];
  out.push(band(outX, widths.slice(1 + nIn, 1 + nIn + nOut).reduce((a, b) => a + b, 0), 'Outputs', '#f3f3f3'));
  if (hasNotes) out.push(band(xs[header.length - 1], widths[header.length - 1], '', '#ffffff'));
  // header and body
  const cell = (c, r, text, opts = {}) => {
    const y = y0 + bandH + r * ROW;
    return `<rect x="${xs[c]}" y="${y}" width="${widths[c]}" height="${ROW}" fill="${opts.fill ?? '#ffffff'}" stroke="#111111" stroke-width="1"/><text x="${xs[c] + (opts.center ? widths[c] / 2 : 10)}" y="${y + 20}" ${opts.center ? 'text-anchor="middle"' : ''} ${opts.bold ? 'font-weight="bold"' : ''} ${opts.mono ? 'font-family="Consolas, monospace"' : ''} fill="#111111">${esc(text)}</text>`;
  };
  header.forEach((h, c) => out.push(cell(c, 0, h, { fill: '#f3f3f3', bold: true, center: c === 0 })));
  rows.forEach((r, i) => r.forEach((t, c) => out.push(cell(c, i + 1, t, { center: c === 0, mono: c > 0 && !(hasNotes && c === header.length - 1) }))));
  out.push(`<text x="${PAD}" y="${H - 14}" font-size="11" fill="#555555">${esc(source)}</text>`);
  out.push('</svg>', '');
  return out.join('\n');
}

export async function tablesFromXml(xml, source) {
  const { defs } = await parseDmn(xml);
  return tablesOf(defs).map(({ decision, table }) => ({ id: decision.id, svg: tableSvg(decision, table, source) }));
}
