// Deterministic layout for BPMN that follows docs/layout.md.
//
// Why this exists: bpmn-auto-layout 1.3.0 (checked 2026-11-14) ignores pools and
// message flows, draws no edges and stacks an expanded sub-process's contents on
// top of each other. Our profile is narrow enough to lay out exactly:
//   LY-1  left to right
//   LY-2  the happy path is one straight line (the FIRST outgoing flow of a split,
//         in file order, continues the line; the other branches go below)
//   LY-3  exceptions below the line, loop-backs along the bottom
//   LY-4  our pool on top, black-box pools below, message flows vertical
//   LY-6  standard sizes, 50 px between columns
//
// Supported: one white-box pool (or a bare process), any number of black-box pools,
// events, tasks, gateways, expanded and collapsed sub-processes, boundary events,
// data store and data object references. Not supported yet (reported, not ignored):
// lanes, text annotations, several white-box pools.

import { parseBpmn, is } from './lib/load.mjs';

export const SIZE = {
  event: [36, 36],
  gateway: [50, 50],
  task: [100, 80],
  dataStore: [50, 50],
  dataObject: [36, 50],
};
const GAP_X = 50;
const GAP_Y = 60;
const SUB_PAD = 24;
const SUB_TOP = 36;
const DATA_BAND = 100;
const POOL_BAND = 30;
const POOL_PAD = 30;
const MARGIN = 20;
const BLACK_POOL_H = 60;
const FONT_PX = 6.2;

// Ids of nodes that have a message flow; a boundary event with one exits its own sequence flow sideways.
let MSG_NODES = new Set();

const isNode = (e) => is(e, 'bpmn:FlowNode') && !is(e, 'bpmn:BoundaryEvent');
const isGateway = (e) => is(e, 'bpmn:Gateway');
const isExpandedSub = (e) =>
  is(e, 'bpmn:SubProcess') && (e.flowElements ?? []).some((c) => is(c, 'bpmn:FlowNode'));

function baseSize(e) {
  if (is(e, 'bpmn:Event')) return SIZE.event;
  if (isGateway(e)) return SIZE.gateway;
  return SIZE.task;
}

export class LayoutError extends Error {}

/** Lay out one container (process or expanded sub-process). Coordinates are local. */
function layoutContainer(container) {
  const flowEls = container.flowElements ?? [];
  const nodes = flowEls.filter(isNode);
  const boundaries = flowEls.filter((e) => is(e, 'bpmn:BoundaryEvent'));
  const flows = flowEls.filter((e) => is(e, 'bpmn:SequenceFlow'));
  const dataRefs = flowEls.filter(
    (e) => is(e, 'bpmn:DataStoreReference') || is(e, 'bpmn:DataObjectReference'),
  );
  if ((container.artifacts ?? []).length) {
    throw new LayoutError(`${container.id}: text annotations and groups are not supported by the layouter yet`);
  }
  if ((container.laneSets ?? []).length) {
    throw new LayoutError(`${container.id}: lanes are not supported by the layouter yet`);
  }
  if (!nodes.length) throw new LayoutError(`${container.id}: no flow nodes to lay out`);

  const rec = new Map();
  nodes.forEach((el, i) => {
    const r = { id: el.id, el, doc: i, kind: 'node' };
    if (isExpandedSub(el)) {
      r.inner = layoutContainer(el);
      r.w = r.inner.w + 2 * SUB_PAD;
      r.h = r.inner.h + SUB_TOP + SUB_PAD;
      r.above = SUB_TOP + r.inner.mainCy;
      r.below = r.h - r.above;
    } else {
      [r.w, r.h] = baseSize(el);
      r.above = r.h / 2;
      r.below = r.h / 2;
    }
    rec.set(el.id, r);
  });
  const bnd = new Map();
  for (const b of boundaries) {
    const host = b.attachedToRef?.id;
    if (!rec.has(host)) throw new LayoutError(`${b.id}: boundary event is not attached to a node in ${container.id}`);
    bnd.set(b.id, { id: b.id, el: b, host });
  }

  // Edges between nodes. A flow leaving a boundary event counts as leaving its host.
  const edges = flows.map((f, i) => {
    const sid = f.sourceRef.id;
    const viaBoundary = bnd.has(sid);
    return { f, doc: i, u: viaBoundary ? bnd.get(sid).host : sid, v: f.targetRef.id, viaBoundary, from: sid };
  });
  for (const e of edges) {
    if (!rec.has(e.u) || !rec.has(e.v)) {
      throw new LayoutError(`${e.f.id}: sequence flows must stay inside one container (${container.id})`);
    }
  }
  const outs = new Map([...rec.keys()].map((k) => [k, []]));
  const ins = new Map([...rec.keys()].map((k) => [k, []]));
  for (const e of edges) { outs.get(e.u).push(e); ins.get(e.v).push(e); }

  // Back edges by depth-first search from the starts (document order).
  const state = new Map();
  const starts = nodes.filter((n) => !ins.get(n.id).length);
  const roots = [...starts, ...nodes.filter((n) => ins.get(n.id).length)];
  const visit = (id) => {
    state.set(id, 1);
    for (const e of outs.get(id)) {
      const s = state.get(e.v);
      if (s === 1) e.back = true;
      else if (!s) visit(e.v);
    }
    state.set(id, 2);
  };
  for (const n of roots) if (!state.get(n.id)) visit(n.id);

  // Ranks: longest path over forward edges.
  const rank = new Map();
  const rankOf = (id) => {
    if (rank.has(id)) return rank.get(id);
    rank.set(id, 0);
    let r = 0;
    for (const e of ins.get(id)) if (!e.back) r = Math.max(r, rankOf(e.u) + 1);
    rank.set(id, r);
    return r;
  };
  for (const id of rec.keys()) rankOf(id);

  // Rows: the first outgoing forward flow keeps the row; other branches go below.
  const order = [...rec.values()].sort((a, b) => rank.get(a.id) - rank.get(b.id) || a.doc - b.doc);
  const row = new Map();
  let maxRow = 0;
  let firstStart = true;
  for (const n of order) {
    if (!ins.get(n.id).filter((e) => !e.back).length && !row.has(n.id)) {
      row.set(n.id, firstStart ? 0 : ++maxRow);
      firstStart = false;
    }
  }
  // Exception paths from boundary events take the rows nearest the main line, so the
  // branch rows below them are not crossed by the boundary events' downward lines.
  for (const e of edges) if (e.viaBoundary && !e.back && !row.has(e.v)) row.set(e.v, ++maxRow);
  for (const n of order) {
    const forward = outs.get(n.id).filter((e) => !e.back && !e.viaBoundary);
    forward.forEach((e, i) => {
      const cand = i === 0 ? row.get(n.id) : undefined;
      if (!row.has(e.v)) row.set(e.v, cand ?? ++maxRow);
      else if (cand !== undefined) row.set(e.v, Math.min(row.get(e.v), cand));
    });
    for (const e of outs.get(n.id).filter((x) => x.viaBoundary && !x.back)) {
      if (!row.has(e.v)) row.set(e.v, ++maxRow);
    }
  }
  const used = [...new Set(row.values())].sort((a, b) => a - b);
  const rowIdx = new Map(used.map((r, i) => [r, i]));
  for (const [k, v] of row) row.set(k, rowIdx.get(v));

  // Geometry.
  const R = Math.max(...rank.values()) + 1;
  const Rows = used.length;
  const colW = Array(R).fill(0);
  const rowAbove = Array(Rows).fill(0);
  const rowBelow = Array(Rows).fill(0);
  for (const n of rec.values()) {
    colW[rank.get(n.id)] = Math.max(colW[rank.get(n.id)], n.w);
    rowAbove[row.get(n.id)] = Math.max(rowAbove[row.get(n.id)], n.above);
    rowBelow[row.get(n.id)] = Math.max(rowBelow[row.get(n.id)], n.below);
  }
  const colX = [];
  let acc = 0;
  for (let c = 0; c < R; c++) { colX.push(acc); acc += colW[c] + GAP_X; }
  const rowCy = [];
  for (let r = 0; r < Rows; r++) {
    rowCy.push(r === 0 ? rowAbove[0] : rowCy[r - 1] + rowBelow[r - 1] + GAP_Y + rowAbove[r]);
  }
  const backs = edges.filter((e) => e.back);
  let width = acc - GAP_X;
  let height = rowCy[Rows - 1] + rowBelow[Rows - 1] + (backs.length ? 24 + 16 * backs.length : 0);

  const shapes = [];
  const box = new Map(); // id -> {x,y,w,h,cy}
  for (const n of order) {
    const x = colX[rank.get(n.id)] + (colW[rank.get(n.id)] - n.w) / 2;
    const cy = rowCy[row.get(n.id)];
    const y = cy - n.above;
    n.box = { x, y, w: n.w, h: n.h, cy, cx: x + n.w / 2 };
    box.set(n.id, n.box);
    shapes.push({ el: n.el, ...n.box, expanded: !!n.inner });
    if (n.inner) {
      const dx = x + SUB_PAD;
      const dy = y + SUB_TOP;
      for (const s of n.inner.shapes) shapes.push({ ...s, x: s.x + dx, y: s.y + dy, cy: s.cy + dy, cx: s.cx + dx });
      for (const [id, b] of n.inner.box) box.set(id, { ...b, x: b.x + dx, y: b.y + dy, cy: b.cy + dy, cx: b.cx + dx });
    }
  }
  // Boundary events sit on the bottom edge of their host.
  const perHost = new Map();
  for (const b of bnd.values()) perHost.set(b.host, [...(perHost.get(b.host) ?? []), b]);
  for (const [host, list] of perHost) {
    const hb = rec.get(host).box;
    list.forEach((b, i) => {
      const bx = hb.cx + (i - (list.length - 1) / 2) * 60;
      b.box = { x: bx - 18, y: hb.y + hb.h - 18, w: 36, h: 36, cy: hb.y + hb.h, cx: bx };
      box.set(b.id, b.box);
      shapes.push({ el: b.el, ...b.box });
    });
  }

  // Edges.
  const loopBase = rowCy[Rows - 1] + rowBelow[Rows - 1] + 24;
  let backN = 0;
  const outEdges = [];
  for (const e of edges) {
    const sb = box.get(e.from);
    const tb = box.get(e.v);
    const sg = isGateway(e.f.sourceRef);
    const tg = isGateway(e.f.targetRef);
    const sy = e.viaBoundary ? sb.cy : sb.cy; // port line of the source
    let pts;
    if (e.back) {
      const ly = loopBase + 16 * backN++;
      pts = [[sb.cx, sb.y + sb.h], [sb.cx, ly], [tb.cx, ly], [tb.cx, tb.y + tb.h]];
    } else if (e.viaBoundary && MSG_NODES.has(e.from)) {
      pts = [[sb.cx + 18, sb.cy], [sb.cx + 30, sb.cy], [sb.cx + 30, tb.cy], [tb.x, tb.cy]];
    } else if (e.viaBoundary) {
      pts = [[sb.cx, sb.y + sb.h], [sb.cx, tb.cy], [tb.x, tb.cy]];
    } else if (Math.abs(sy - tb.cy) < 1) {
      pts = [[sb.x + sb.w, sy], [tb.x, tb.cy]];
    } else if (sg && tb.cy > sy) {
      pts = [[sb.cx, sb.y + sb.h], [sb.cx, tb.cy], [tb.x, tb.cy]];
    } else if (tg && sy > tb.cy) {
      pts = [[sb.x + sb.w, sy], [tb.cx, sy], [tb.cx, tb.y + tb.h]];
    } else {
      const mid = Math.max(sb.x + sb.w + 10, tb.x - GAP_X / 2);
      pts = [[sb.x + sb.w, sy], [mid, sy], [mid, tb.cy], [tb.x, tb.cy]];
    }
    outEdges.push({ el: e.f, pts, kind: 'sequence' });
  }
  for (const n of rec.values()) {
    if (n.inner) for (const ie of n.inner.edges) {
      const dx = n.box.x + SUB_PAD;
      const dy = n.box.y + SUB_TOP;
      outEdges.push({ ...ie, pts: ie.pts.map(([x, y]) => [x + dx, y + dy]) });
    }
  }

  // Data references go in a band above the content.
  let mainCy = rowCy[0];
  if (dataRefs.length) {
    const links = collectDataLinks(container);
    const placed = dataRefs.map((d) => {
      const connected = links.filter((l) => l.ref === d.id).map((l) => box.get(l.node)).filter(Boolean);
      const cx = connected.length ? connected.reduce((s, b) => s + b.cx, 0) / connected.length : width / 2;
      const [w, h] = is(d, 'bpmn:DataStoreReference') ? SIZE.dataStore : SIZE.dataObject;
      return { d, cx, w, h };
    }).sort((a, b) => a.cx - b.cx);
    for (let i = 1; i < placed.length; i++) placed[i].cx = Math.max(placed[i].cx, placed[i - 1].cx + 90);
    const top = -DATA_BAND + 10;
    placed.forEach((p, i) => {
      const b = { x: p.cx - p.w / 2, y: top, w: p.w, h: p.h, cx: p.cx, cy: top + p.h / 2 };
      box.set(p.d.id, b);
      shapes.push({ el: p.d, ...b });
    });
    let k = 0;
    for (const l of links) {
      const rb = box.get(l.ref);
      const nb = box.get(l.node);
      if (!rb || !nb) continue;
      const midY = -14 - 10 * (k++ % 3);
      const pts = rb.cx === nb.cx
        ? [[rb.cx, rb.y + rb.h], [nb.cx, nb.y]]
        : [[rb.cx, rb.y + rb.h], [rb.cx, midY], [nb.cx, midY], [nb.cx, nb.y]];
      outEdges.push({ el: l.assoc, pts: l.input ? pts : pts.slice().reverse(), kind: 'data' });
    }
    // shift everything down so all coordinates are non-negative
    for (const s of shapes) { s.y += DATA_BAND; s.cy += DATA_BAND; }
    for (const e of outEdges) e.pts = e.pts.map(([x, y]) => [x, y + DATA_BAND]);
    for (const [id, b] of box) box.set(id, { ...b, y: b.y + DATA_BAND, cy: b.cy + DATA_BAND });
    height += DATA_BAND;
    mainCy += DATA_BAND;
    const maxX = Math.max(...shapes.map((s) => s.x + s.w));
    width = Math.max(width, maxX);
    const minX = Math.min(...shapes.map((s) => s.x));
    if (minX < 0) {
      for (const s of shapes) { s.x -= minX; s.cx -= minX; }
      for (const e of outEdges) e.pts = e.pts.map(([x, y]) => [x - minX, y]);
      for (const [id, b] of box) box.set(id, { ...b, x: b.x - minX, cx: b.cx - minX });
      width += -minX;
    }
  }
  return { w: width, h: height, mainCy, shapes, edges: outEdges, box };
}

/** Data associations declared on tasks anywhere under a container. */
function collectDataLinks(container) {
  const links = [];
  (function walk(c) {
    for (const el of c.flowElements ?? []) {
      for (const a of el.dataInputAssociations ?? []) {
        for (const s of a.sourceRef ?? []) links.push({ ref: s.id, node: el.id, input: true, assoc: a });
      }
      for (const a of el.dataOutputAssociations ?? []) {
        if (a.targetRef) links.push({ ref: a.targetRef.id, node: el.id, input: false, assoc: a });
      }
      if (el.flowElements) walk(el);
    }
  })(container);
  return links;
}

const labelSize = (text) => {
  const chars = text.length;
  const w = Math.min(Math.max(chars * FONT_PX + 8, 30), 100);
  const lines = Math.max(1, Math.ceil((chars * FONT_PX + 8) / w));
  return [w, 14 * lines + 2];
};

// ---- label placement: try candidate spots, take the first that hits nothing -------------

const rectsOverlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const inflate = (r, d) => ({ x: r.x - d, y: r.y - d, w: r.w + 2 * d, h: r.h + 2 * d });
// Edges here are axis-aligned, so a segment hits a rectangle when their boxes overlap.
const segHits = ([x1, y1], [x2, y2], r) =>
  Math.max(x1, x2) >= r.x && Math.min(x1, x2) <= r.x + r.w && Math.max(y1, y2) >= r.y && Math.min(y1, y2) <= r.y + r.h;

function makeObstacles(shapes, edges) {
  const boxes = [];
  const segs = [];
  for (const s of shapes) {
    const { el, b } = s;
    if (el.$type === 'bpmn:Participant') continue;
    if (s.extra?.isExpanded) {
      const { x, y, w, h } = b;
      segs.push([[x, y], [x + w, y]], [[x + w, y], [x + w, y + h]], [[x, y + h], [x + w, y + h]], [[x, y], [x, y + h]]);
    } else boxes.push({ id: el.id, ...b });
  }
  for (const e of edges) for (let i = 0; i + 1 < e.pts.length; i++) segs.push([e.pts[i], e.pts[i + 1]]);
  return { boxes, segs };
}

const isFree = (rect, obs, placed, ownId) => {
  const r = inflate(rect, 1);
  if (obs.boxes.some((b) => b.id !== ownId && rectsOverlap(r, b))) return false;
  if (obs.segs.some(([p, q]) => segHits(p, q, r))) return false;
  return !placed.some((p) => rectsOverlap(r, p));
};

function placeNodeLabel(s, obs, placed) {
  const { el, b } = s;
  const [lw, lh] = labelSize(el.name);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const below = { x: cx - lw / 2, y: b.y + b.h + 3, w: lw, h: lh };
  const above = { x: cx - lw / 2, y: b.y - lh - 3, w: lw, h: lh };
  const right = { x: b.x + b.w + 4, y: cy - lh / 2, w: lw, h: lh };
  const left = { x: b.x - lw - 4, y: cy - lh / 2, w: lw, h: lh };
  const belowLeft = { x: cx - lw - 2, y: b.y + b.h + 3, w: lw, h: lh };
  const belowRight = { x: cx + 2, y: b.y + b.h + 3, w: lw, h: lh };
  const aboveRight = { x: cx + 4, y: b.y - lh - 3, w: lw, h: lh };
  const aboveLeft = { x: cx - lw - 4, y: b.y - lh - 3, w: lw, h: lh };
  let order;
  if (is(el, 'bpmn:BoundaryEvent')) order = [belowLeft, belowRight, left, right];
  else if (is(el, 'bpmn:Gateway')) order = [aboveLeft, above, aboveRight, below, belowLeft, belowRight];
  else order = [below, above, right, left, belowRight, belowLeft];
  // a narrower, taller label as a second try
  const nw = Math.max(46, Math.min(lw, 54));
  const nh = Math.max(lh, 14 * Math.ceil((el.name.length * FONT_PX + 8) / nw) + 2);
  const narrow = (r) => ({ ...r, x: r.x + (lw - nw) / 2, w: nw, h: nh, y: r.y < b.y ? b.y - nh - 3 : r.y });
  const pick = order.find((r) => isFree(r, obs, placed, el.id)) ?? order.map(narrow).find((r) => isFree(r, obs, placed, el.id)) ?? order[0];
  placed.push(pick);
  return pick;
}

function placeSequenceLabel(el, pts, placed) {
  const [w, h] = labelSize(el.name);
  let r;
  if (pts.length > 2 && Math.abs(pts[0][0] - pts[1][0]) < 1) {
    // leaves downwards and bends: label the last (horizontal) leg so sibling labels do not collide
    const a = pts[pts.length - 2];
    r = { x: a[0] + 6, y: a[1] - h - 2, w, h };
  } else {
    const [p0, p1] = pts;
    r = Math.abs(p0[0] - p1[0]) < 1
      ? { x: p0[0] + 6, y: p0[1] + (p1[1] > p0[1] ? 4 : -h - 4), w, h }
      : { x: Math.min(p0[0], p1[0]) + 4, y: p0[1] - h - 2, w, h };
  }
  placed.push(r);
  return r;
}

/**
 * A message line runs straight down from its node to the pool. If that would run through another
 * shape (say an end event in a row below), go down a little, jog sideways to the nearest clear
 * column, and carry on down.
 */
function routeMessage(a, z, nodeId, boxes) {
  const hits = (x, y0, y1) => boxes.some((o) => o.id !== nodeId && x > o.x - 6 && x < o.x + o.w + 6 && Math.max(y0, y1) > o.y && Math.min(y0, y1) < o.y + o.h);
  if (!hits(a[0], a[1], z[1])) return [a, z];
  const y1 = a[1] + 24;
  const jogBlocked = (xa, xb) => boxes.some((o) => o.id !== nodeId && y1 > o.y - 4 && y1 < o.y + o.h + 4 && Math.max(xa, xb) > o.x && Math.min(xa, xb) < o.x + o.w);
  for (let d = 24; d <= 240; d += 24) {
    for (const xc of [a[0] + d, a[0] - d]) {
      if (!hits(xc, y1, z[1]) && !jogBlocked(a[0], xc)) return [a, [a[0], y1], [xc, y1], [xc, z[1]]];
    }
  }
  return [a, z];
}

function placeMessageLabel(mf, pts, obs, placed) {
  const [w, h] = labelSize(mf.name);
  // the long vertical leg is the one that carries the label
  let leg = [pts[0], pts[1]];
  for (let i = 0; i + 1 < pts.length; i++) {
    if (pts[i][0] === pts[i + 1][0] && Math.abs(pts[i][1] - pts[i + 1][1]) > Math.abs(leg[0][1] - leg[1][1])) leg = [pts[i], pts[i + 1]];
  }
  const x = leg[0][0];
  const lo = Math.min(leg[0][1], leg[1][1]);
  const hi = Math.max(leg[0][1], leg[1][1]);
  const mid = (lo + hi) / 2;
  const reply = mf.sourceRef.$type === 'bpmn:Participant';
  const xs = reply ? [x + 6, x - w - 6] : [x - w - 6, x + 6];
  const ys = [mid];
  for (let d = 16; d < hi - lo; d += 16) ys.push(mid + d, mid - d);
  for (const y of ys) {
    for (const lx of xs) {
      const r = { x: lx, y: y - h / 2, w, h };
      if (r.y < lo + 4 || r.y + h > hi - 4) continue;
      // a label may sit beside its own line, so skip that line when testing
      const others = { boxes: obs.boxes, segs: obs.segs.filter(([p, q]) => !(p[0] === x && q[0] === x && Math.min(p[1], q[1]) === lo && Math.max(p[1], q[1]) === hi)) };
      if (isFree(r, others, placed)) { placed.push(r); return r; }
    }
  }
  const r = { x: xs[0], y: mid - h / 2, w, h };
  placed.push(r);
  return r;
}

/** Lay out a BPMN document. Returns new XML with diagram information (any old one is replaced). */
export async function layoutBpmn(xml) {
  const { defs, moddle } = await parseBpmn(xml);
  const collab = defs.rootElements.find((e) => is(e, 'bpmn:Collaboration'));
  const processes = defs.rootElements.filter((e) => is(e, 'bpmn:Process'));
  if (!processes.length) throw new LayoutError('no process found');

  MSG_NODES = new Set();
  for (const mf of collab?.messageFlows ?? []) {
    for (const end of [mf.sourceRef, mf.targetRef]) if (end.$type !== 'bpmn:Participant') MSG_NODES.add(end.id);
  }
  const round = (b) => ({ ...b, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h) });
  const shapes = []; // { el, b, extra, label }
  const edges = []; // { el, pts, kind, label }

  let root;
  if (!collab) {
    if (processes.length > 1) throw new LayoutError('several processes without a collaboration');
    root = processes[0];
    const L = layoutContainer(root);
    for (const s of L.shapes) shapes.push({ el: s.el, b: round({ ...s, x: s.x + MARGIN, y: s.y + MARGIN }), extra: s.expanded ? { isExpanded: true } : {} });
    for (const e of L.edges) edges.push({ el: e.el, pts: e.pts.map(([x, y]) => [x + MARGIN, y + MARGIN]), kind: e.kind });
  } else {
    root = collab;
    const white = collab.participants.filter((p) => p.processRef);
    const black = collab.participants.filter((p) => !p.processRef);
    if (white.length !== 1) throw new LayoutError(`the layouter supports exactly one white-box pool, found ${white.length}`);
    const wp = white[0];
    const L = layoutContainer(wp.processRef);
    // extra room on the right: a name under the last event can be wider than the event
    const poolW = POOL_BAND + 100 + L.w;
    const poolH = L.h + 2 * POOL_PAD;
    const px = MARGIN;
    const py = MARGIN;
    const ox = px + POOL_BAND + 40; // room for the first event's name on the left
    const oy = py + POOL_PAD;
    const abs = new Map();
    const poolBox = { x: px, y: py, w: poolW, h: poolH };
    shapes.push({ el: wp, b: round(poolBox), extra: { isHorizontal: true } });
    abs.set(wp.id, poolBox);
    for (const s of L.shapes) {
      const b = { x: s.x + ox, y: s.y + oy, w: s.w, h: s.h };
      shapes.push({ el: s.el, b: round(b), extra: s.expanded ? { isExpanded: true } : {} });
      abs.set(s.el.id, b);
    }
    for (const e of L.edges) edges.push({ el: e.el, pts: e.pts.map(([x, y]) => [x + ox, y + oy]), kind: e.kind });
    let by = py + poolH + (collab.messageFlows?.length ? 110 : 40);
    for (const bp of black) {
      const b = { x: px, y: by, w: poolW, h: BLACK_POOL_H };
      shapes.push({ el: bp, b: round(b), extra: { isHorizontal: true } });
      abs.set(bp.id, b);
      by += BLACK_POOL_H + 30;
    }
    // Message flows: vertical, one slot per flow on each node, requests left of replies.
    const slots = new Map();
    for (const mf of collab.messageFlows ?? []) {
      const nodeEl = mf.sourceRef.$type === 'bpmn:Participant' ? mf.targetRef : mf.sourceRef;
      slots.set(nodeEl.id, [...(slots.get(nodeEl.id) ?? []), mf]);
    }
    // Shapes a message line must not run through (pools and expanded sub-processes are not obstacles).
    const leafBoxes = shapes
      .filter((s) => s.el.$type !== 'bpmn:Participant' && !s.extra?.isExpanded)
      .map((s) => ({ id: s.el.id, ...s.b }));
    // Loop and multi-instance markers sit at the bottom centre of their shape; keep lines clear of them.
    const markers = L.shapes
      .filter((s) => s.el.loopCharacteristics)
      .map((s) => ({ x0: s.x + ox, x1: s.x + ox + s.w, cx: s.x + ox + s.w / 2 }));
    for (const [nodeId, list] of slots) {
      list.sort((a, b) => (a.sourceRef.id === nodeId ? 0 : 1) - (b.sourceRef.id === nodeId ? 0 : 1));
      const nb = abs.get(nodeId);
      if (!nb) throw new LayoutError(`message flow endpoint ${nodeId} has no shape`);
      const n = list.length;
      const xsFor = (shift) => list.map((_, i) => nb.x + nb.w / 2 + shift + (i - (n - 1) / 2) * 16);
      const clear = (xs) => xs.every((x) =>
        x >= nb.x + 6 && x <= nb.x + nb.w - 6 &&
        markers.every((m) => !(nb.x >= m.x0 && nb.x + nb.w <= m.x1) || Math.abs(x - m.cx) >= 16));
      const shift = [0, 24, -24, 34, -34].find((s) => clear(xsFor(s))) ?? 0;
      const xs = xsFor(shift);
      list.forEach((mf, i) => {
        const x = xs[i];
        const pool = abs.get(mf.sourceRef.id === nodeId ? mf.targetRef.id : mf.sourceRef.id);
        if (!pool) throw new LayoutError(`${mf.id}: pool ${mf.targetRef.id} has no shape`);
        const a = [x, nb.y + nb.h];
        const z = [x, pool.y];
        const down = routeMessage(a, z, nodeId, leafBoxes);
        edges.push({ el: mf, pts: mf.sourceRef.id === nodeId ? down : down.slice().reverse(), kind: 'message' });
      });
    }
  }

  // Labels: nodes first, then sequence flows, then message flows, each avoiding what is placed.
  const obs = makeObstacles(shapes, edges);
  const placed = [];
  for (const s of shapes) {
    const named = s.el.name && (is(s.el, 'bpmn:Event') || is(s.el, 'bpmn:Gateway'));
    if (named) s.label = placeNodeLabel(s, obs, placed);
    else if ((is(s.el, 'bpmn:DataStoreReference') || is(s.el, 'bpmn:DataObjectReference')) && s.el.name) {
      const [lw, lh] = labelSize(s.el.name);
      s.label = { x: s.b.x + s.b.w + 6, y: s.b.y + s.b.h / 2 - lh / 2, w: lw, h: lh };
      placed.push(s.label);
    }
  }
  for (const e of edges.filter((x) => x.kind === 'sequence' && x.el.name)) e.label = placeSequenceLabel(e.el, e.pts, placed);
  for (const e of edges.filter((x) => x.kind === 'message' && x.el.name)) e.label = placeMessageLabel(e.el, e.pts, obs, placed);

  // Emit.
  const bounds = (b) => moddle.create('dc:Bounds', { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.w), height: Math.round(b.h) });
  const planeEls = [];
  for (const s of shapes) {
    const shape = moddle.create('bpmndi:BPMNShape', { id: `${s.el.id}_di`, bpmnElement: s.el, bounds: bounds(s.b), ...s.extra });
    if (s.label) shape.label = moddle.create('bpmndi:BPMNLabel', { bounds: bounds(s.label) });
    planeEls.push(shape);
  }
  for (const e of edges) {
    const edge = moddle.create('bpmndi:BPMNEdge', {
      id: `${e.el.id}_di`,
      bpmnElement: e.el,
      waypoint: e.pts.map(([x, y]) => moddle.create('dc:Point', { x: Math.round(x), y: Math.round(y) })),
    });
    if (e.label) edge.label = moddle.create('bpmndi:BPMNLabel', { bounds: bounds(e.label) });
    planeEls.push(edge);
  }
  const plane = moddle.create('bpmndi:BPMNPlane', { id: `plane_${root.id}`, bpmnElement: root, planeElement: planeEls });
  defs.diagrams = [moddle.create('bpmndi:BPMNDiagram', { id: `diagram_${root.id}`, plane })];
  const { xml: out } = await moddle.toXML(defs, { format: true });
  return out;
}
