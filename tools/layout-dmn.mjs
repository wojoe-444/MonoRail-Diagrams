// Deterministic layout for a DMN decision requirements diagram (docs/layout.md, LY-11):
// the main decision on top, what it needs below, inputs on the bottom row, arrows pointing up.

import { parseDmn, is } from './lib/load.mjs';

const SIZE = {
  decision: [180, 80],
  inputData: [125, 45],
  businessKnowledgeModel: [135, 46],
  knowledgeSource: [100, 63],
};
const GAP_X = 40;
const GAP_Y = 110;
const MARGIN = 30;

const kindOf = (el) => {
  if (is(el, 'dmn:Decision')) return 'decision';
  if (is(el, 'dmn:InputData')) return 'inputData';
  if (is(el, 'dmn:BusinessKnowledgeModel')) return 'businessKnowledgeModel';
  if (is(el, 'dmn:KnowledgeSource')) return 'knowledgeSource';
  return null;
};
const refId = (r) => (r?.href ?? '').replace(/^#/, '');

/** Requirements of every element as { req, from, to }: 'from' is needed by 'to'. */
export function requirements(defs) {
  const out = [];
  for (const el of defs.drgElement ?? []) {
    for (const r of el.informationRequirement ?? []) out.push({ req: r, from: refId(r.requiredInput ?? r.requiredDecision), to: el.id });
    for (const r of el.knowledgeRequirement ?? []) out.push({ req: r, from: refId(r.requiredKnowledge), to: el.id });
    for (const r of el.authorityRequirement ?? []) {
      out.push({ req: r, from: refId(r.requiredAuthority ?? r.requiredInput ?? r.requiredDecision), to: el.id });
    }
  }
  return out;
}

export async function layoutDmn(xml) {
  const { defs, moddle } = await parseDmn(xml);
  const els = (defs.drgElement ?? []).filter((e) => kindOf(e));
  if (!els.length) throw new Error('no decisions or inputs to lay out');
  const byId = new Map(els.map((e) => [e.id, e]));
  const reqs = requirements(defs).filter((r) => byId.has(r.from) && byId.has(r.to));
  for (const r of reqs) if (!r.req.id) r.req.id = `req_${r.from}_to_${r.to}`;

  // Level 0 = decisions nobody needs; deeper = needed by something above.
  const level = new Map();
  const consumers = new Map(els.map((e) => [e.id, []]));
  for (const r of reqs) consumers.get(r.from).push(r.to);
  const lv = (id, stack = []) => {
    if (level.has(id)) return level.get(id);
    if (stack.includes(id)) return 0;
    const cs = consumers.get(id);
    const l = cs.length ? Math.max(...cs.map((c) => lv(c, [...stack, id]) + 1)) : 0;
    level.set(id, l);
    return l;
  };
  els.forEach((e) => lv(e.id));
  const maxDecision = Math.max(0, ...els.filter((e) => kindOf(e) === 'decision').map((e) => level.get(e.id)));
  for (const e of els) if (kindOf(e) === 'inputData') level.set(e.id, maxDecision + 1);
  const rows = new Map();
  for (const e of els) rows.set(level.get(e.id), [...(rows.get(level.get(e.id)) ?? []), e]);
  const rowKeys = [...rows.keys()].sort((a, b) => a - b);
  const rowW = (list) => list.reduce((s, e) => s + SIZE[kindOf(e)][0], 0) + GAP_X * (list.length - 1);
  const W = Math.max(...rowKeys.map((k) => rowW(rows.get(k))));
  const box = new Map();
  let y = MARGIN;
  for (const k of rowKeys) {
    const list = rows.get(k);
    const rh = Math.max(...list.map((e) => SIZE[kindOf(e)][1]));
    let x = MARGIN + (W - rowW(list)) / 2;
    for (const e of list) {
      const [w, h] = SIZE[kindOf(e)];
      box.set(e.id, { x, y: y + (rh - h) / 2, w, h });
      x += w + GAP_X;
    }
    y += rh + GAP_Y;
  }

  const bounds = (b) => moddle.create('dc:Bounds', { x: Math.round(b.x), y: Math.round(b.y), width: b.w, height: b.h });
  const parts = els.map((e) => moddle.create('dmndi:DMNShape', { id: `${e.id}_di`, dmnElementRef: e, bounds: bounds(box.get(e.id)) }));
  for (const r of reqs) {
    const a = box.get(r.from);
    const b = box.get(r.to);
    const wp = [
      moddle.create('dc:Point', { x: Math.round(a.x + a.w / 2), y: Math.round(a.y) }),
      moddle.create('dc:Point', { x: Math.round(b.x + b.w / 2), y: Math.round(b.y + b.h) }),
    ];
    parts.push(moddle.create('dmndi:DMNEdge', { id: `${r.req.id}_di`, dmnElementRef: r.req, waypoint: wp }));
  }
  const diagram = moddle.create('dmndi:DMNDiagram', { id: `diagram_${defs.id}`, diagramElements: parts });
  defs.dmnDI = moddle.create('dmndi:DMNDI', { diagrams: [diagram] });
  const { xml: out } = await moddle.toXML(defs, { format: true });
  return out;
}
