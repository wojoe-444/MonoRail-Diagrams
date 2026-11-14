// Score agent output against the eval cases.
//
//   node evals/score.mjs <run folder>          one subfolder per case id, holding what the agent wrote
//
// A case passes when ALL of these hold (each is mechanical; nothing here judges taste):
//   files    the notation the case expects has a file (.bpmn, .dmn, or both)
//   built    the files carry layout (the build command ran), and each has its .svg render
//   brief    brief.md exists with the required fields filled in
//   lint     the linter reports no errors and at most 3 warnings
//   expect   the case's own requirements (event kinds, enough outcomes, a blend that works)
//
// Taste (is the diagram a good description of the process?) is left to a person looking at the
// renders; the scorer only proves the standard was followed.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintFiles } from '../tools/lint.mjs';
import { parseBpmn, parseDmn, is } from '../tools/lib/load.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const BRIEF_FIELDS = ['Question this answers', 'Notation', 'Outcomes', 'Decisions', 'Open questions'];
const MAX_WARNINGS = 3;

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
}

export async function scoreCase(def, dir) {
  const checks = [];
  const add = (name, ok, note = '') => checks.push({ name, ok, note });
  const files = walk(dir);
  const bpmn = files.filter((f) => f.endsWith('.bpmn'));
  const dmn = files.filter((f) => f.endsWith('.dmn'));
  const want = def.expect.notation;

  // files
  const needBpmn = want === 'bpmn' || want === 'both';
  const needDmn = want === 'dmn' || want === 'both';
  add('files', (!needBpmn || bpmn.length > 0) && (!needDmn || dmn.length > 0),
    `expected ${want}; found ${bpmn.length} .bpmn, ${dmn.length} .dmn`);

  // built
  const sources = [...bpmn, ...dmn];
  const unbuilt = sources.filter((f) => !/<(bpmndi:BPMNDiagram|dmndi:DMNDI)/.test(fs.readFileSync(f, 'utf8')));
  const noRender = sources.filter((f) => !fs.existsSync(f.replace(/\.(bpmn|dmn)$/, '.svg')));
  add('built', sources.length > 0 && !unbuilt.length && !noRender.length,
    unbuilt.length ? `no layout in ${unbuilt.map((f) => path.basename(f)).join(', ')}` : noRender.length ? `no render for ${noRender.map((f) => path.basename(f)).join(', ')}` : '');

  // brief
  const briefFile = files.find((f) => path.basename(f) === 'brief.md');
  let briefOk = false;
  let briefNote = 'no brief.md';
  if (briefFile) {
    const text = fs.readFileSync(briefFile, 'utf8');
    const missing = BRIEF_FIELDS.filter((k) => !new RegExp(`\\*\\*${k}:?\\*\\*:?\\s*\\S`).test(text) && !new RegExp(`\\*\\*${k}:\\*\\*\\s*\\n\\s*-`).test(text));
    briefOk = !missing.length;
    briefNote = missing.length ? `missing: ${missing.join(', ')}` : '';
  }
  add('brief', briefOk, briefNote);

  // lint
  let errors = 0;
  let warnings = 0;
  const reports = await lintFiles(sources);
  const first = [];
  for (const r of reports) for (const i of r.items) {
    if (i.level === 'error') { errors++; if (first.length < 3) first.push(`${i.rule} ${i.message}`); } else warnings++;
  }
  add('lint', sources.length > 0 && errors === 0 && warnings <= MAX_WARNINGS, `${errors} error(s), ${warnings} warning(s)${first.length ? ': ' + first.join(' | ') : ''}`);

  // case-specific
  const problems = [];
  const eventKinds = new Set();
  let ends = 0;
  let ruleTasks = 0;
  for (const f of bpmn) {
    try {
      const { defs } = await parseBpmn(fs.readFileSync(f, 'utf8'));
      (function walkEls(c) {
        for (const e of c.flowElements ?? []) {
          if (is(e, 'bpmn:EndEvent')) ends++;
          if (is(e, 'bpmn:BusinessRuleTask')) ruleTasks++;
          for (const d of e.eventDefinitions ?? []) eventKinds.add(d.$type.replace('bpmn:', '').replace('EventDefinition', '').toLowerCase());
          if (e.flowElements) walkEls(e);
        }
      })(defs.rootElements.find((r) => is(r, 'bpmn:Process')) ?? { flowElements: [] });
    } catch (e) { problems.push(`cannot read ${path.basename(f)}`); }
  }
  let rules = 0;
  for (const f of dmn) {
    try {
      const { defs } = await parseDmn(fs.readFileSync(f, 'utf8'));
      for (const d of defs.drgElement ?? []) if (d.decisionLogic?.rule) rules += d.decisionLogic.rule.length;
    } catch (e) { problems.push(`cannot read ${path.basename(f)}`); }
  }
  const x = def.expect;
  for (const k of x.eventDefinitions ?? []) if (!eventKinds.has(k)) problems.push(`no ${k} event`);
  if (x.minEnds && ends < x.minEnds) problems.push(`${ends} end event(s), expected at least ${x.minEnds}`);
  if (x.minRules && rules < x.minRules) problems.push(`${rules} rule(s), expected at least ${x.minRules}`);
  if (x.blend && !(ruleTasks > 0 && dmn.length > 0)) problems.push('expected a business rule task calling a decision');
  if (x.noBlend && ruleTasks > 0 && !dmn.length) problems.push('business rule task without a decision file');
  add('expect', problems.length === 0, problems.join('; '));

  return { id: def.id, pass: checks.every((c) => c.ok), checks };
}

export function loadCases() {
  const dir = path.join(here, 'cases');
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
}

export function markdown(results) {
  const names = ['files', 'built', 'brief', 'lint', 'expect'];
  const lines = [`| Case | ${names.join(' | ')} | Result |`, `| --- | ${names.map(() => '---').join(' | ')} | --- |`];
  for (const r of results) {
    lines.push(`| ${r.id} | ${names.map((n) => (r.checks.find((c) => c.name === n)?.ok ? 'yes' : '**no**')).join(' | ')} | ${r.pass ? 'pass' : '**fail**'} |`);
  }
  const notes = results.flatMap((r) => r.checks.filter((c) => !c.ok).map((c) => `- ${r.id}, ${c.name}: ${c.note}`));
  return lines.join('\n') + (notes.length ? '\n\nWhat failed:\n\n' + notes.join('\n') : '') + '\n';
}

if (process.argv[1] && fileURLToPathSafe(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const run = process.argv[2];
  if (!run) { console.error('usage: node evals/score.mjs <run folder>'); process.exit(2); }
  const results = [];
  for (const def of loadCases()) results.push(await scoreCase(def, path.join(run, def.id)));
  const md = markdown(results);
  console.log(md);
  fs.writeFileSync(path.join(run, 'results.md'), md);
  fs.writeFileSync(path.join(run, 'results.json'), JSON.stringify(results, null, 2) + '\n');
  process.exit(results.every((r) => r.pass) ? 0 : 1);
}

function fileURLToPathSafe(p) { return path.resolve(p); }
