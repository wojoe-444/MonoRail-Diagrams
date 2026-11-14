// Linter for MonoRail BPMN and DMN files. Every message cites the rule it comes from
// (docs/bpmn-profile.md BP-*, docs/dmn-profile.md DM-*, docs/naming.md NM-*,
// docs/bpmn-vs-dmn.md BL-*). Errors fail the check; warnings are for a person to read.

import fs from 'node:fs';
import path from 'node:path';
import { parseBpmn, parseDmn, is } from './lib/load.mjs';
import { parseEntry, parseValues, numericDomain, Unsupported } from './feel.mjs';
import { requirements } from './layout-dmn.mjs';

const MAX_SHAPES = 15; // BP-11
const MAX_LABEL = 40; // NM-9

class Report {
  constructor(file) { this.file = file; this.items = []; }
  add(level, rule, message, id) { this.items.push({ level, rule, message, id }); }
  error(rule, message, id) { this.add('error', rule, message, id); }
  warn(rule, message, id) { this.add('warning', rule, message, id); }
  get errors() { return this.items.filter((i) => i.level === 'error'); }
}

const colourAttr = /^(bioc|color):|^(fill|stroke|background-color|border-color)$/i;
function checkNoColour(root, report, rule) {
  const seen = new Set();
  (function walk(el) {
    if (!el || typeof el !== 'object' || seen.has(el)) return;
    seen.add(el);
    for (const k of Object.keys(el.$attrs ?? {})) {
      if (colourAttr.test(k)) report.error(rule, `colour attribute "${k}" is not allowed`, el.id);
    }
    for (const p of el.$descriptor?.properties ?? []) {
      if (p.isReference) continue;
      const v = el.get(p.name);
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object' && v.$type) walk(v);
    }
  })(root);
}

// ---------------------------------------------------------------- BPMN

const PREFIX = [
  ['bpmn:Process', 'proc_'], ['bpmn:Participant', 'pool_'], ['bpmn:Lane', 'lane_'],
  ['bpmn:BoundaryEvent', 'bnd_'], ['bpmn:Event', 'evt_'], ['bpmn:Gateway', 'gw_'],
  ['bpmn:SubProcess', 'sub_'], ['bpmn:CallActivity', 'sub_'], ['bpmn:Task', 'task_'],
  ['bpmn:SequenceFlow', 'flow_'], ['bpmn:MessageFlow', 'msg_'],
  ['bpmn:DataStoreReference', 'data_'], ['bpmn:DataObjectReference', 'data_'],
  ['bpmn:DataStore', 'store_'], ['bpmn:DataObject', 'obj_'],
  ['bpmn:DataInputAssociation', 'assoc_'], ['bpmn:DataOutputAssociation', 'assoc_'],
];
const prefixFor = (el) => PREFIX.find(([t]) => is(el, t))?.[1];

const ALLOWED_ACTIVITY = ['bpmn:Task', 'bpmn:UserTask', 'bpmn:ServiceTask', 'bpmn:BusinessRuleTask', 'bpmn:SendTask', 'bpmn:ReceiveTask', 'bpmn:ManualTask', 'bpmn:SubProcess', 'bpmn:CallActivity'];
const eventDefOf = (e) => (e.eventDefinitions ?? []).map((d) => d.$type.replace('bpmn:', '').replace('EventDefinition', '').toLowerCase());

function eventAllowed(e) {
  const defs = eventDefOf(e);
  if (defs.length > 1) return 'multiple event definitions';
  const d = defs[0] ?? 'none';
  if (is(e, 'bpmn:BoundaryEvent')) return ['timer', 'error', 'message'].includes(d) ? null : `${d} boundary event`;
  if (is(e, 'bpmn:StartEvent')) return ['none', 'message', 'timer'].includes(d) ? null : `${d} start event`;
  if (is(e, 'bpmn:EndEvent')) return ['none', 'message', 'error', 'terminate'].includes(d) ? null : `${d} end event`;
  if (is(e, 'bpmn:IntermediateCatchEvent')) return ['message', 'timer'].includes(d) ? null : `${d} intermediate catch event`;
  if (is(e, 'bpmn:IntermediateThrowEvent')) return d === 'message' ? null : `${d} intermediate throw event`;
  return null;
}

function bpmnProfile(el, report) {
  const id = el.id;
  if (is(el, 'bpmn:ScriptTask')) report.error('BP-2', 'script tasks are not allowed; use a service task', id);
  else if (is(el, 'bpmn:Activity') && !ALLOWED_ACTIVITY.some((t) => is(el, t)) ) report.error('BP-2', `${el.$type} is not allowed`, id);
  if (is(el, 'bpmn:Transaction') || is(el, 'bpmn:AdHocSubProcess')) report.error('BP-2', `${el.$type} is not allowed`, id);
  if (is(el, 'bpmn:SubProcess') && el.triggeredByEvent) report.error('BP-2', 'event sub-processes are not allowed', id);
  if (is(el, 'bpmn:ComplexGateway')) report.error('BP-2', 'complex gateways are not allowed', id);
  if (is(el, 'bpmn:InclusiveGateway')) report.warn('BP-4', 'inclusive gateway: use only when more than one branch can really run and a parallel gateway would be wrong', id);
  if (is(el, 'bpmn:Event')) {
    const bad = eventAllowed(el);
    if (bad) report.error('BP-2', `${bad} is not allowed`, id);
  }
  if (el.loopCharacteristics && !is(el.loopCharacteristics, 'bpmn:StandardLoopCharacteristics') && !is(el.loopCharacteristics, 'bpmn:MultiInstanceLoopCharacteristics')) {
    report.error('BP-2', 'only loop and multi-instance markers are allowed', id);
  }
}

function namesAndIds(el, report) {
  const id = el.id;
  const want = prefixFor(el);
  if (want && id && !id.startsWith(want)) report.error('NM-10', `id "${id}" should start with "${want}"`, id);
  if (id && !/^[a-z][A-Za-z0-9]*_[A-Za-z0-9_]+$/.test(id)) report.warn('NM-10', `id "${id}" should be readable camelCase after its prefix`, id);
  const isTask = is(el, 'bpmn:Task') || is(el, 'bpmn:SubProcess') || is(el, 'bpmn:CallActivity');
  const isEvent = is(el, 'bpmn:Event');
  if ((isTask || isEvent) && !el.name) report.error('NM-2', `${el.$type.replace('bpmn:', '')} needs a name`, id);
  if (el.name) {
    if (el.name.length > MAX_LABEL) report.error('NM-9', `name is ${el.name.length} characters (maximum ${MAX_LABEL})`, id);
    if (isTask && /\band\b/i.test(el.name)) report.warn('NM-2', 'one action per task: the name contains "and"', id);
    if (!is(el, 'bpmn:SequenceFlow') && /^[a-z]/.test(el.name)) report.warn('NM-1', 'names use sentence case (start with a capital)', id);
  }
}

function lintProcess(proc, report, isTop, ctx) {
  const els = proc.flowElements ?? [];
  const nodes = els.filter((e) => is(e, 'bpmn:FlowNode'));
  const flows = els.filter((e) => is(e, 'bpmn:SequenceFlow'));
  const ins = new Map(nodes.map((n) => [n.id, []]));
  const outs = new Map(nodes.map((n) => [n.id, []]));
  for (const f of flows) {
    if (!f.sourceRef || !f.targetRef) { report.error('BP-2', 'sequence flow without a source or target', f.id); continue; }
    outs.get(f.sourceRef.id)?.push(f);
    ins.get(f.targetRef.id)?.push(f);
    if (!is(f.sourceRef, 'bpmn:FlowNode') || !nodes.includes(f.sourceRef) || !nodes.includes(f.targetRef)) {
      report.error('BP-2', 'a sequence flow must join two nodes in the same process or sub-process', f.id);
    }
  }

  const starts = nodes.filter((n) => is(n, 'bpmn:StartEvent'));
  const ends = nodes.filter((n) => is(n, 'bpmn:EndEvent'));
  const where = isTop ? 'process' : `sub-process`;
  if (starts.length !== 1) report.error(isTop ? 'BP-1' : 'BP-16', `${where} ${proc.id} needs exactly one start event (found ${starts.length})`, proc.id);
  if (ends.length < 1) report.error(isTop ? 'BP-1' : 'BP-16', `${where} ${proc.id} needs at least one end event`, proc.id);

  // BP-8: outcomes
  if (ends.length > 1) {
    for (const e of ends) {
      if (!e.name || /^(end|done|finish(ed)?)$/i.test(e.name)) report.error('BP-8', 'with several end events each must name its outcome', e.id);
    }
  }

  for (const n of nodes) {
    bpmnProfile(n, report);
    namesAndIds(n, report);
    const i = ins.get(n.id).length;
    const o = outs.get(n.id).length;
    if (is(n, 'bpmn:Gateway')) {
      if (i > 1 && o > 1) report.warn('BP-4', 'gateway both joins and splits; use two gateways', n.id);
      if (is(n, 'bpmn:ExclusiveGateway') && o > 1) {
        if (!n.name || !n.name.endsWith('?')) report.error('NM-4', 'an exclusive gateway that splits is named as a question ending in "?"', n.id);
        for (const f of outs.get(n.id)) if (!f.name) report.error('BP-5', 'every flow leaving an exclusive gateway carries an answer', f.id);
      }
      if (is(n, 'bpmn:ParallelGateway') && n.name) report.warn('NM-4', 'parallel gateways carry no name', n.id);
      if (i === 1 && o === 1) report.warn('BP-4', 'gateway with one way in and one way out does nothing', n.id);
    } else if (is(n, 'bpmn:BoundaryEvent')) {
      if (i) report.error('BP-3', 'a boundary event has no incoming sequence flow', n.id);
      if (!o) report.warn('BP-10', 'boundary event without an outgoing flow', n.id);
      if (o > 1) report.error('BP-3', 'a boundary event has at most one outgoing sequence flow', n.id);
    } else if (is(n, 'bpmn:StartEvent')) {
      if (i) report.error('BP-3', 'a start event has no incoming sequence flow', n.id);
      if (o !== 1) report.error('BP-3', 'a start event has exactly one outgoing sequence flow', n.id);
    } else if (is(n, 'bpmn:EndEvent')) {
      if (o) report.error('BP-3', 'an end event has no outgoing sequence flow', n.id);
      if (i !== 1) report.error('BP-3', 'an end event has exactly one incoming sequence flow (join with a gateway first)', n.id);
    } else {
      if (i > 1) report.error('BP-3', `${n.id} has ${i} incoming flows; join them with a gateway`, n.id);
      if (o > 1) report.error('BP-3', `${n.id} has ${o} outgoing flows; split with a gateway`, n.id);
      if (i === 0) report.error('BP-3', 'a node with no incoming flow is unreachable', n.id);
      if (o === 0) report.error('BP-3', 'a node with no outgoing flow is a dead end', n.id);
    }
    // BP-6
    if (is(n, 'bpmn:Activity')) for (const f of outs.get(n.id)) {
      if (f.conditionExpression) report.error('BP-6', 'no condition on a flow leaving an activity; add a gateway', f.id);
    }
    // BP-9
    if (is(n, 'bpmn:BoundaryEvent') && eventDefOf(n)[0] === 'timer' && !/\d/.test(n.name ?? '')) {
      report.warn('BP-9', 'a timer boundary event states its duration in its name ("30 min")', n.id);
    }
    // BP-1/BP-16 recursion
    if (is(n, 'bpmn:SubProcess') && (n.flowElements ?? []).some((c) => is(c, 'bpmn:FlowNode'))) lintProcess(n, report, false, ctx);
    if (is(n, 'bpmn:BusinessRuleTask')) ctx.ruleTasks.push({ task: n, outs: outs.get(n.id), nodes, outsByNode: outs });
  }
  for (const f of flows) namesAndIds(f, report);
  for (const e of els) {
    if (is(e, 'bpmn:DataStoreReference') || is(e, 'bpmn:DataObjectReference')) namesAndIds(e, report);
    if (is(e, 'bpmn:Association') || is(e, 'bpmn:TextAnnotation')) { /* allowed artifacts */ }
  }

  // BP-4 (heuristic): a split whose branches meet again must meet at a gateway of the same type.
  for (const g of nodes.filter((n) => is(n, 'bpmn:Gateway') && outs.get(n.id).length > 1)) {
    const reach = outs.get(g.id).map((f) => {
      const seen = new Set();
      const stack = [f.targetRef.id];
      while (stack.length) {
        const id = stack.pop();
        if (seen.has(id) || id === g.id) continue;
        seen.add(id);
        for (const o of outs.get(id) ?? []) stack.push(o.targetRef.id);
      }
      return seen;
    });
    const common = [...reach[0]].filter((id) => reach.slice(1).some((s) => s.has(id)));
    // the first common node along the way (closest to the split)
    const first = common.find((id) => !common.some((other) => other !== id && (ins.get(id) ?? []).some((f) => f.sourceRef.id === other)));
    if (first) {
      const j = nodes.find((n) => n.id === first);
      if (!is(j, 'bpmn:Gateway') || j.$type !== g.$type) {
        report.error('BP-4', `branches of ${g.id} meet again at ${first}, which is not a ${g.$type.replace('bpmn:', '')} join`, g.id);
      }
    }
  }

  // BP-11: shapes in this view
  const dataRefs = els.filter((e) => is(e, 'bpmn:DataStoreReference') || is(e, 'bpmn:DataObjectReference')).length;
  const pools = isTop ? ctx.poolCount : 0;
  const shapes = nodes.length + dataRefs + pools;
  if (shapes > MAX_SHAPES) report.error('BP-11', `${proc.id} has ${shapes} shapes in one view (maximum ${MAX_SHAPES}); collapse part into a sub-process or call activity`, proc.id);
  return { starts, ends };
}

/** Lint a BPMN file. `resolveDmn(ref)` returns { decisionOutputs } for BL checks, or null. */
export async function lintBpmn(xml, file = 'file.bpmn', resolveDmn = () => null) {
  const report = new Report(file);
  let parsed;
  try { parsed = await parseBpmn(xml); } catch (e) { report.error('XML', `cannot read the file: ${e.message}`); return report; }
  const { defs, warnings } = parsed;
  for (const w of warnings) report.warn('XML', w);
  const collab = defs.rootElements.find((e) => is(e, 'bpmn:Collaboration'));
  const processes = defs.rootElements.filter((e) => is(e, 'bpmn:Process'));
  if (processes.length > 1) report.error('BP-1', `one process per file (found ${processes.length})`);
  if (!processes.length) { report.error('BP-1', 'no process found'); return report; }
  checkNoColour(defs, report, 'BP-17');
  for (const p of defs.rootElements.filter((e) => is(e, 'bpmn:Process'))) namesAndIds(p, report);
  if (collab) {
    for (const part of collab.participants ?? []) {
      namesAndIds(part, report);
      if (!part.name) report.error('NM-5', 'a pool needs a name', part.id);
    }
    for (const mf of collab.messageFlows ?? []) {
      namesAndIds(mf, report);
      if (!mf.name) report.error('BP-7', 'a message flow is labelled with what is sent', mf.id);
      const partOf = (end) => {
        if (is(end, 'bpmn:Participant')) return end;
        return (collab.participants ?? []).find((p) => p.processRef && ownsNode(p.processRef, end));
      };
      const a = partOf(mf.sourceRef);
      const b = partOf(mf.targetRef);
      if (a && b && a === b) report.error('BP-7', 'a message flow runs between different pools, not inside one', mf.id);
    }
  }
  const ctx = { ruleTasks: [], poolCount: collab ? (collab.participants ?? []).length : 0 };
  for (const proc of processes) {
    const doc = (proc.documentation ?? []).map((d) => d.text).join(' ');
    if (!/purpose:/i.test(doc) || !/trigger:/i.test(doc)) report.error('BP-14', 'the process documentation states "Purpose: ... Trigger: ..."', proc.id);
    lintProcess(proc, report, true, ctx);
  }

  // Blend: BL-1, BL-2
  for (const { task, outs } of ctx.ruleTasks) {
    const impl = task.implementation ?? '';
    const m = impl.match(/^([a-z0-9][a-z0-9-]*\.dmn)#(dec_[A-Za-z0-9]+)$/);
    if (!m) { report.error('BL-1', `business rule task implementation must be "<file>.dmn#<decisionId>" (found "${impl || 'nothing'}")`, task.id); continue; }
    const target = outs.length === 1 ? outs[0].targetRef : null;
    if (!target || !is(target, 'bpmn:ExclusiveGateway')) {
      report.error('BL-2', 'a business rule task is followed directly by an exclusive gateway', task.id);
      continue;
    }
    const gatewayFlows = (task.$parent.flowElements ?? []).filter((f) => is(f, 'bpmn:SequenceFlow') && f.sourceRef === target);
    const dmn = resolveDmn(m[1], m[2]);
    if (dmn === undefined || dmn === null) { report.error('BL-1', `cannot find ${m[1]}#${m[2]} next to this file`, task.id); continue; }
    if (!dmn.outputs) { report.error('BL-2', `${m[2]} lists no allowed output values, so its gateway labels cannot be checked (DM-4)`, task.id); continue; }
    const labels = gatewayFlows.map((f) => f.name);
    for (const l of labels) if (!dmn.outputs.includes(l)) report.error('BL-2', `flow label "${l}" is not an output of ${m[2]} (${dmn.outputs.join(', ')})`, target.id);
    for (const o of dmn.outputs) if (!labels.includes(o)) report.error('BL-2', `output "${o}" of ${m[2]} has no flow from ${target.id}`, target.id);
  }
  return report;
}

function ownsNode(proc, node) {
  let found = false;
  (function walk(c) {
    for (const e of c.flowElements ?? []) {
      if (e === node) found = true;
      if (e.flowElements) walk(e);
    }
  })(proc);
  return found;
}

// ---------------------------------------------------------------- DMN

const TYPES = ['string', 'number', 'boolean', 'date'];
const DMN_PREFIX = [['dmn:Decision', 'dec_'], ['dmn:InputData', 'in_'], ['dmn:BusinessKnowledgeModel', 'bkm_'], ['dmn:KnowledgeSource', 'src_']];

/** Outputs and structure of a DMN decision, for BL-2: { outputs: string[] | null } */
export async function describeDecision(xml, decisionId) {
  const { defs } = await parseDmn(xml);
  const d = (defs.drgElement ?? []).find((e) => e.id === decisionId && is(e, 'dmn:Decision'));
  if (!d) return null;
  const out = d.decisionLogic?.output?.[0];
  if (!out?.outputValues?.text) return { outputs: null };
  try { return { outputs: parseValues(out.outputValues.text).map(String) }; } catch { return { outputs: null }; }
}

export async function lintDmn(xml, file = 'file.dmn') {
  const report = new Report(file);
  let parsed;
  try { parsed = await parseDmn(xml); } catch (e) { report.error('XML', `cannot read the file: ${e.message}`); return report; }
  const { defs, warnings } = parsed;
  for (const w of warnings) report.warn('XML', w);
  checkNoColour(defs, report, 'DM-14');
  const drg = defs.drgElement ?? [];
  const decisions = drg.filter((e) => is(e, 'dmn:Decision'));
  const byId = new Map(drg.map((e) => [e.id, e]));
  for (const e of drg) {
    const ok = ['dmn:Decision', 'dmn:InputData', 'dmn:BusinessKnowledgeModel', 'dmn:KnowledgeSource'].some((t) => is(e, t));
    if (!ok) report.error('DM-2', `${e.$type} is not allowed`, e.id);
    const want = DMN_PREFIX.find(([t]) => is(e, t))?.[1];
    if (want && !e.id?.startsWith(want)) report.error('NM-10', `id "${e.id}" should start with "${want}"`, e.id);
    if (e.name) {
      if (e.name.length > MAX_LABEL) report.error('NM-9', `name is ${e.name.length} characters (maximum ${MAX_LABEL})`, e.id);
      if (/[?]$/.test(e.name)) report.warn('NM-8', 'names are plain nouns, without a question mark', e.id);
    } else report.error('NM-8', 'every element needs a name', e.id);
    if (is(e, 'dmn:Decision') && /^(check|determine|calculate|decide|get|compute)\b/i.test(e.name ?? '')) {
      report.warn('NM-8', 'a decision is named for its answer (a noun phrase), not an action', e.id);
    }
    if ((is(e, 'dmn:InputData') || is(e, 'dmn:Decision')) ) {
      const t = e.variable?.typeRef;
      if (!t) report.error('DM-4', 'the variable has no type', e.id);
      else if (!TYPES.includes(t)) report.warn('DM-4', `type "${t}" is outside string, number, boolean, date`, e.id);
    }
  }
  for (const r of requirements(defs)) if (r.req.id && !r.req.id.startsWith('req_')) report.error('NM-10', `requirement id "${r.req.id}" should start with "req_"`, r.req.id);

  // DM-1: one main decision
  const required = new Set(requirements(defs).map((r) => r.from));
  const mains = decisions.filter((d) => !required.has(d.id));
  if (mains.length !== 1) report.error('DM-1', `a DMN file has exactly one main decision (a decision no other decision needs); found ${mains.length}`);
  if (!decisions.length) report.error('DM-1', 'no decision found');

  for (const d of decisions) {
    if (!(d.description ?? '').trim()) report.error('DM-12', 'say what the decision answers, in a description', d.id);
    const logic = d.decisionLogic;
    if (!logic) { report.error('DM-3', 'a decision has a decision table or a literal expression', d.id); continue; }
    if (is(logic, 'dmn:LiteralExpression')) continue;
    if (!is(logic, 'dmn:DecisionTable')) { report.error('DM-3', `${logic.$type} is not allowed; use a decision table or a literal expression`, d.id); continue; }
    lintTable(d, logic, report, byId);
  }
  return report;
}

function lintTable(d, t, report, byId) {
  const id = d.id;
  const hit = t.hitPolicy ?? 'UNIQUE';
  const inputs = t.input ?? [];
  const outputs = t.output ?? [];
  const rules = t.rule ?? [];
  if (!['UNIQUE', 'ANY', 'FIRST', 'COLLECT'].includes(hit)) report.error('DM-5', `hit policy ${hit} is not allowed`, id);
  if (outputs.length > 1) report.warn('DM-9', 'prefer one output column', id);
  if (inputs.length > 5) report.error('DM-10', `${inputs.length} inputs (maximum 5); split into two decisions`, id);
  if (rules.length > 12) report.error('DM-10', `${rules.length} rules (maximum 12); split into two decisions`, id);
  const needed = new Set();
  for (const r of d.informationRequirement ?? []) {
    const ref = (r.requiredInput ?? r.requiredDecision)?.href?.replace(/^#/, '');
    const e = byId.get(ref);
    if (e) needed.add(e.variable?.name ?? e.name);
  }
  const domains = [];
  let verifiable = true;
  inputs.forEach((col, i) => {
    const text = (col.inputExpression?.text ?? '').trim();
    const label = col.label ?? text;
    if (!needed.has(text)) report.error('DM-7', `input column "${label}" must be the plain name of an input or decision this decision requires (found "${text}")`, id);
    const type = col.inputExpression?.typeRef;
    if (!type) report.error('DM-4', `input column "${label}" has no type`, id);
    const entries = rules.map((r) => (r.inputEntry ?? [])[i]?.text ?? '');
    let parsedEntries;
    try { parsedEntries = entries.map(parseEntry); } catch (e) {
      report.warn('DM-8', `input column "${label}" uses an entry outside the FEEL subset (${e instanceof Unsupported ? e.message : e}); completeness not checked`, id);
      verifiable = false; domains.push(null); return;
    }
    const allowed = col.inputValues?.text ? tryValues(col.inputValues.text) : null;
    if (type === 'boolean') domains.push({ values: [true, false], parsed: parsedEntries });
    else if (type === 'number') domains.push({ values: numericDomain(parsedEntries.flatMap((p) => p.nums)), parsed: parsedEntries });
    else if (type === 'string') {
      if (!allowed && parsedEntries.some((p) => !p.any)) report.error('DM-4', `string input "${label}" lists its allowed values`, id);
      if (allowed) domains.push({ values: allowed, parsed: parsedEntries });
      else { verifiable = false; domains.push(null); }
    } else { verifiable = false; domains.push(null); }
    if (allowed && type === 'string') {
      for (const p of parsedEntries) for (const s of p.strs) if (!allowed.includes(s)) report.error('DM-4', `"${s}" is not an allowed value of "${label}"`, id);
    }
  });
  for (const [i, col] of outputs.entries()) {
    if (!col.typeRef) report.error('DM-4', `output column ${col.label ?? i + 1} has no type`, id);
    if (col.typeRef === 'string' && !col.outputValues?.text) report.error('DM-4', `string output "${col.label ?? i + 1}" lists its allowed values`, id);
    if (col.outputValues?.text) {
      const allowedOut = tryValues(col.outputValues.text) ?? [];
      for (const r of rules) {
        const v = (r.outputEntry ?? [])[i]?.text ?? '';
        try { const [pv] = parseValues(v); if (!allowedOut.includes(pv)) report.error('DM-4', `rule output ${v} is not in the allowed values`, r.id ?? id); } catch { /* not a literal */ }
      }
    }
  }
  // DM-5 FIRST needs a catch-all last row
  if (hit === 'FIRST') {
    const last = rules[rules.length - 1];
    const catchAll = last && (last.inputEntry ?? []).every((e) => ['', '-'].includes((e.text ?? '').trim()));
    if (!catchAll) report.error('DM-5', 'hit policy FIRST needs a final catch-all rule (every input "-")', id);
  }
  // DM-5/DM-6: evaluate every combination
  if (verifiable && domains.every(Boolean) && inputs.length) {
    const combos = domains.reduce((acc, d2) => acc.flatMap((c) => d2.values.map((v) => [...c, v])), [[]]);
    if (combos.length > 20000) { report.warn('DM-6', 'too many input combinations to check completeness', id); return; }
    for (const combo of combos) {
      const hits = rules.map((_, r) => r).filter((r) => combo.every((v, c) => domains[c].parsed[r].test(v)));
      const shown = combo.map((v, c) => `${inputs[c].label}=${typeof v === 'string' ? `"${v}"` : v}`).join(', ');
      if (!hits.length && hit !== 'COLLECT') { report.error('DM-6', `no rule matches ${shown}`, id); break; }
      if (hit === 'UNIQUE' && hits.length > 1) { report.error('DM-5', `rules ${hits.map((h) => h + 1).join(' and ')} both match ${shown}, but hit policy UNIQUE needs exactly one`, id); break; }
      if (hit === 'ANY' && hits.length > 1) {
        const outs = new Set(hits.map((h) => (rules[h].outputEntry ?? []).map((e) => e.text).join('|')));
        if (outs.size > 1) { report.error('DM-5', `rules ${hits.map((h) => h + 1).join(' and ')} overlap with different outputs for ${shown}`, id); break; }
      }
    }
  }
}

function tryValues(text) { try { return parseValues(text); } catch { return null; } }

// ---------------------------------------------------------------- files and folders

export function collectFiles(targets) {
  const out = [];
  for (const t of targets) {
    const st = fs.statSync(t);
    if (st.isDirectory()) {
      for (const e of fs.readdirSync(t, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
        out.push(...collectFiles([path.join(t, e.name)]));
      }
    } else if (/\.(bpmn|dmn)$/.test(t)) out.push(t);
  }
  return out;
}

/** Lint files; returns an array of Reports. */
export async function lintFiles(files) {
  const reports = [];
  const dmnCache = new Map();
  for (const f of files) {
    const xml = fs.readFileSync(f, 'utf8');
    if (f.endsWith('.dmn')) { reports.push(await lintDmn(xml, f)); continue; }
    // pre-resolve decisions referenced by business rule tasks
    const refs = [...xml.matchAll(/implementation="([a-z0-9-]+\.dmn)#(dec_[A-Za-z0-9]+)"/g)].map((m) => [m[1], m[2]]);
    const resolved = new Map();
    for (const [file, dec] of refs) {
      const p = path.join(path.dirname(f), file);
      if (!fs.existsSync(p)) { resolved.set(`${file}#${dec}`, null); continue; }
      const key = `${p}#${dec}`;
      if (!dmnCache.has(key)) dmnCache.set(key, await describeDecision(fs.readFileSync(p, 'utf8'), dec));
      resolved.set(`${file}#${dec}`, dmnCache.get(key));
    }
    reports.push(await lintBpmn(xml, f, (file, dec) => resolved.get(`${file}#${dec}`)));
  }
  return reports;
}

export function formatReports(reports) {
  const lines = [];
  let errors = 0;
  let warnings = 0;
  for (const r of reports) {
    if (!r.items.length) { lines.push(`ok       ${r.file}`); continue; }
    lines.push(`${r.errors.length ? 'FAIL' : 'warn'}     ${r.file}`);
    for (const i of r.items) {
      lines.push(`  ${i.level === 'error' ? 'error  ' : 'warning'} ${i.rule.padEnd(5)} ${i.message}${i.id ? `  [${i.id}]` : ''}`);
      if (i.level === 'error') errors++; else warnings++;
    }
  }
  lines.push('', `${reports.length} file(s), ${errors} error(s), ${warnings} warning(s)`);
  return { text: lines.join('\n'), errors, warnings };
}
