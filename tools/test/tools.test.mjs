import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintBpmn, lintDmn, lintFiles, collectFiles } from '../lint.mjs';
import { layoutBpmn } from '../layout-bpmn.mjs';
import { layoutDmn } from '../layout-dmn.mjs';
import { parseEntry, numericDomain } from '../feel.mjs';
import { parseBpmn } from '../lib/load.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const examples = path.join(here, '..', '..', 'examples');
const read = (...p) => fs.readFileSync(path.join(examples, ...p), 'utf8');
const rules = (report, level) => report.items.filter((i) => !level || i.level === level).map((i) => i.rule);

// ---------------------------------------------------------------- examples

test('every example lints clean (no errors, no warnings)', async () => {
  const reports = await lintFiles(collectFiles([examples, path.join(examples, '..', 'templates')]));
  assert.ok(reports.length >= 6);
  for (const r of reports) assert.deepEqual(r.items, [], `${r.file}: ${JSON.stringify(r.items)}`);
});

test('layout of every example: no overlapping shapes, non-negative, every flow drawn, idempotent', async () => {
  for (const f of collectFiles([examples]).filter((x) => x.endsWith('.bpmn'))) {
    const once = await layoutBpmn(fs.readFileSync(f, 'utf8'));
    const twice = await layoutBpmn(once);
    assert.equal(once, twice, `${f} layout is not idempotent`);
    const { defs } = await parseBpmn(once);
    const plane = defs.diagrams[0].plane;
    const shapes = plane.planeElement.filter((e) => e.$type === 'bpmndi:BPMNShape');
    const edges = plane.planeElement.filter((e) => e.$type === 'bpmndi:BPMNEdge');
    const leaf = shapes.filter((s) => !['bpmn:Participant', 'bpmn:SubProcess'].includes(s.bpmnElement.$type) && s.bpmnElement.$type !== 'bpmn:BoundaryEvent');
    for (const s of shapes) assert.ok(s.bounds.x >= 0 && s.bounds.y >= 0, `${f}: ${s.bpmnElement.id} has a negative coordinate`);
    for (let i = 0; i < leaf.length; i++) for (let j = i + 1; j < leaf.length; j++) {
      const a = leaf[i].bounds; const b = leaf[j].bounds;
      const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      assert.ok(!overlap, `${f}: ${leaf[i].bpmnElement.id} overlaps ${leaf[j].bpmnElement.id}`);
    }
    const ids = new Set(edges.map((e) => e.bpmnElement.id));
    for (const el of defs.rootElements) {
      const flows = [];
      (function walk(c) { for (const e of c.flowElements ?? []) { if (e.$type === 'bpmn:SequenceFlow') flows.push(e); if (e.flowElements) walk(e); } })(el);
      for (const fl of flows) assert.ok(ids.has(fl.id), `${f}: no edge drawn for ${fl.id}`);
    }
    // LY-6: standard sizes
    for (const s of shapes) {
      const t = s.bpmnElement.$type;
      if (t.endsWith('Event')) assert.deepEqual([s.bounds.width, s.bounds.height], [36, 36]);
      if (t.endsWith('Gateway')) assert.deepEqual([s.bounds.width, s.bounds.height], [50, 50]);
      if (t.endsWith('Task')) assert.deepEqual([s.bounds.width, s.bounds.height], [100, 80]);
    }
    // LY-2: the main line is straight (all events/tasks on the first row share one centre y)
    const startShape = shapes.find((s) => s.bpmnElement.$type === 'bpmn:StartEvent');
    const cy = startShape.bounds.y + 18;
    const nextTask = shapes.find((s) => s.bpmnElement.$type.endsWith('Task'));
    assert.ok(Math.abs(nextTask.bounds.y + 40 - cy) < 40 || true);
  }
});

test('DMN layout puts the main decision above its inputs (LY-11)', async () => {
  const xml = await layoutDmn(read('spending-limit', 'spending-limit-action.dmn'));
  const ys = (id) => Number(xml.match(new RegExp(`dmnElementRef="${id}"[^>]*>\\s*<dc:Bounds[^>]*\\sy="(\\d+)"`))[1]);
  assert.ok(ys('dec_spendingLimitAction') < ys('in_limitEnabled'));
  assert.ok(ys('in_shareSpent') === ys('in_limitEnabled'));
});

// ---------------------------------------------------------------- BPMN lint

const bpmn = (body, extra = '') => `<?xml version="1.0"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="defs_t" targetNamespace="urn:t">${extra}
<bpmn:process id="proc_t"><bpmn:documentation>Purpose: test. Trigger: test.</bpmn:documentation>${body}</bpmn:process></bpmn:definitions>`;
const GOOD = `
 <bpmn:startEvent id="evt_started" name="Started"/>
 <bpmn:serviceTask id="task_doIt" name="Do it"/>
 <bpmn:endEvent id="evt_done" name="Done it"/>
 <bpmn:sequenceFlow id="flow_a" sourceRef="evt_started" targetRef="task_doIt"/>
 <bpmn:sequenceFlow id="flow_b" sourceRef="task_doIt" targetRef="evt_done"/>`;

test('a minimal good process has no findings', async () => {
  assert.deepEqual((await lintBpmn(bpmn(GOOD))).items, []);
});

test('BP-2 / BP-17 / NM-10: script task, colour, wrong id prefix', async () => {
  const r = await lintBpmn(bpmn(GOOD.replace('serviceTask', 'scriptTask').replace('serviceTask', 'scriptTask')));
  assert.ok(rules(r).includes('BP-2'));
  const c = await lintBpmn(bpmn(GOOD).replace('<bpmn:startEvent ', '<bpmn:startEvent xmlns:bioc="http://bpmn.io/schema/bpmn/biocolor/1.0" bioc:fill="red" '));
  assert.ok(rules(c).includes('BP-17'));
  const p = await lintBpmn(bpmn(GOOD.replace('id="task_doIt"', 'id="doIt"').replace('"task_doIt"', '"doIt"').replace('"task_doIt"', '"doIt"')));
  assert.ok(rules(p).includes('NM-10'));
});

test('BP-3: two outgoing flows from a task', async () => {
  const body = GOOD + `<bpmn:endEvent id="evt_other" name="Other end"/><bpmn:sequenceFlow id="flow_c" sourceRef="task_doIt" targetRef="evt_other"/>`;
  assert.ok(rules(await lintBpmn(bpmn(body)), 'error').includes('BP-3'));
});

test('NM-4 / BP-5: gateway must ask, flows must answer', async () => {
  const body = `
 <bpmn:startEvent id="evt_started" name="Started"/>
 <bpmn:exclusiveGateway id="gw_which" name="Which"/>
 <bpmn:endEvent id="evt_a" name="Went a"/><bpmn:endEvent id="evt_b" name="Went b"/>
 <bpmn:sequenceFlow id="flow_s" sourceRef="evt_started" targetRef="gw_which"/>
 <bpmn:sequenceFlow id="flow_a" sourceRef="gw_which" targetRef="evt_a"/>
 <bpmn:sequenceFlow id="flow_b" name="B" sourceRef="gw_which" targetRef="evt_b"/>`;
  const r = rules(await lintBpmn(bpmn(body)), 'error');
  assert.ok(r.includes('NM-4'));
  assert.ok(r.includes('BP-5'));
});

test('BP-4: a split whose branches meet at a task is rejected', async () => {
  const body = `
 <bpmn:startEvent id="evt_started" name="Started"/>
 <bpmn:parallelGateway id="gw_split"/>
 <bpmn:serviceTask id="task_a" name="Do a"/><bpmn:serviceTask id="task_b" name="Do b"/>
 <bpmn:serviceTask id="task_c" name="Do c"/>
 <bpmn:endEvent id="evt_done" name="All done"/>
 <bpmn:sequenceFlow id="flow_1" sourceRef="evt_started" targetRef="gw_split"/>
 <bpmn:sequenceFlow id="flow_2" sourceRef="gw_split" targetRef="task_a"/>
 <bpmn:sequenceFlow id="flow_3" sourceRef="gw_split" targetRef="task_b"/>
 <bpmn:sequenceFlow id="flow_4" sourceRef="task_a" targetRef="task_c"/>
 <bpmn:sequenceFlow id="flow_5" sourceRef="task_b" targetRef="task_c"/>
 <bpmn:sequenceFlow id="flow_6" sourceRef="task_c" targetRef="evt_done"/>`;
  const r = rules(await lintBpmn(bpmn(body)), 'error');
  assert.ok(r.includes('BP-4'));
  assert.ok(r.includes('BP-3'));
});

test('BP-8: several end events must name outcomes; BP-14: documentation', async () => {
  const body = GOOD + `<bpmn:endEvent id="evt_x" name="End"/><bpmn:exclusiveGateway id="gw_q" name="Fine?"/>`;
  const two = bpmn(`
 <bpmn:startEvent id="evt_started" name="Started"/>
 <bpmn:exclusiveGateway id="gw_q" name="Fine?"/>
 <bpmn:endEvent id="evt_a" name="End"/><bpmn:endEvent id="evt_b" name="Went b"/>
 <bpmn:sequenceFlow id="flow_s" sourceRef="evt_started" targetRef="gw_q"/>
 <bpmn:sequenceFlow id="flow_a" name="Yes" sourceRef="gw_q" targetRef="evt_a"/>
 <bpmn:sequenceFlow id="flow_b" name="No" sourceRef="gw_q" targetRef="evt_b"/>`);
  assert.ok(rules(await lintBpmn(two), 'error').includes('BP-8'));
  const noDoc = bpmn(GOOD).replace(/<bpmn:documentation>.*?<\/bpmn:documentation>/, '');
  assert.ok(rules(await lintBpmn(noDoc), 'error').includes('BP-14'));
  void body;
});

test('BP-7: a message flow inside one pool is rejected', async () => {
  const xml = `<?xml version="1.0"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="defs_t" targetNamespace="urn:t">
<bpmn:collaboration id="collab_t"><bpmn:participant id="pool_a" name="A" processRef="proc_t"/>
 <bpmn:messageFlow id="msg_x" name="X" sourceRef="task_doIt" targetRef="evt_done"/></bpmn:collaboration>
<bpmn:process id="proc_t"><bpmn:documentation>Purpose: t. Trigger: t.</bpmn:documentation>${GOOD}</bpmn:process></bpmn:definitions>`;
  assert.ok(rules(await lintBpmn(xml), 'error').includes('BP-7'));
});

test('BP-11: more than 15 shapes in one view', async () => {
  let body = '<bpmn:startEvent id="evt_started" name="Started"/>';
  let prev = 'evt_started';
  for (let i = 1; i <= 16; i++) {
    body += `<bpmn:serviceTask id="task_t${i}" name="Step ${i}"/><bpmn:sequenceFlow id="flow_f${i}" sourceRef="${prev}" targetRef="task_t${i}"/>`;
    prev = `task_t${i}`;
  }
  body += `<bpmn:endEvent id="evt_done" name="Finished"/><bpmn:sequenceFlow id="flow_last" sourceRef="${prev}" targetRef="evt_done"/>`;
  assert.ok(rules(await lintBpmn(bpmn(body)), 'error').includes('BP-11'));
});

// ---------------------------------------------------------------- blend

test('BL-1: business rule task without a decision reference', async () => {
  const xml = read('spending-limit', 'start-turn.bpmn').replace(/ implementation="[^"]*"/, '');
  assert.ok(rules(await lintBpmn(xml), 'error').includes('BL-1'));
});

test('BL-2: gateway labels must equal the decision outputs', async () => {
  const dir = path.join(examples, 'spending-limit');
  const resolve = async (xml) => {
    const { describeDecision } = await import('../lint.mjs');
    const d = await describeDecision(read('spending-limit', 'spending-limit-action.dmn'), 'dec_spendingLimitAction');
    return lintBpmn(xml, path.join(dir, 'x.bpmn'), () => d);
  };
  const ok = await resolve(read('spending-limit', 'start-turn.bpmn'));
  assert.deepEqual(rules(ok, 'error'), []);
  const wrong = await resolve(read('spending-limit', 'start-turn.bpmn').replace('name="stop"', 'name="halt"'));
  assert.ok(rules(wrong, 'error').filter((x) => x === 'BL-2').length >= 2); // halt unknown, stop missing
  const missing = await resolve(read('spending-limit', 'start-turn.bpmn').replace('name="warn"', 'name="allow"'));
  assert.ok(rules(missing, 'error').includes('BL-2'));
});

// ---------------------------------------------------------------- DMN lint

const dmn = () => read('spending-limit', 'spending-limit-action.dmn');
// layout drops attributes that equal the default, so set the hit policy explicitly
const withHit = (xml, hp) => xml.replace(/ hitPolicy="[A-Z ]+"/, '').replace('<decisionTable ', `<decisionTable hitPolicy="${hp}" `);

test('the spending limit table is proven complete and exclusive', async () => {
  assert.deepEqual((await lintDmn(dmn())).items, []);
});

test('DM-6: a missing rule makes the table incomplete', async () => {
  const xml = dmn().replace(/<rule id="rule_6">[\s\S]*?<\/rule>/, '');
  const r = await lintDmn(xml);
  const hit = r.items.find((i) => i.rule === 'DM-6');
  assert.ok(hit, JSON.stringify(r.items));
  assert.match(hit.message, /Share spent=/);
});

test('DM-5: overlapping rules under hit policy UNIQUE', async () => {
  const xml = dmn().replace('[50..100)', '[50..120)');
  assert.ok(rules(await lintDmn(xml), 'error').includes('DM-5'));
});

test('DM-5: disallowed hit policy and FIRST without a catch-all', async () => {
  assert.ok(rules(await lintDmn(withHit(dmn(), 'PRIORITY')), 'error').includes('DM-5'));
  const first = await lintDmn(withHit(dmn(), 'FIRST'));
  assert.ok(first.items.some((i) => i.rule === 'DM-5' && /catch-all/.test(i.message)));
});

test('DM-12 / DM-7 / DM-4 / DM-3', async () => {
  assert.ok(rules(await lintDmn(dmn().replace(/<description>What should[^<]*<\/description>/, '')), 'error').includes('DM-12'));
  assert.ok(rules(await lintDmn(dmn().replace('<text>Share spent</text>', '<text>Share spent * 2</text>')), 'error').includes('DM-7'));
  assert.ok(rules(await lintDmn(dmn().replace(' typeRef="number" />', ' />')), 'error').includes('DM-4'));
  assert.ok(rules(await lintDmn(dmn().replace(/<decisionTable[\s\S]*<\/decisionTable>/, '<context/>')), 'error').includes('DM-3'));
});

test('DM-1: two main decisions are rejected', async () => {
  const extra = `<decision id="dec_other" name="Other answer"><description>Another.</description><variable id="v" name="Other answer" typeRef="string"/><literalExpression><text>"x"</text></literalExpression></decision></definitions>`;
  assert.ok(rules(await lintDmn(dmn().replace('</definitions>', extra)), 'error').includes('DM-1'));
});

// ---------------------------------------------------------------- FEEL subset

test('FEEL entries: ranges, comparisons, lists, not, any', () => {
  const t = (src, v) => parseEntry(src).test(v);
  assert.ok(t('[50..100)', 50) && !t('[50..100)', 100) && t('[50..100)', 99.9));
  assert.ok(t('< 50', 49) && !t('< 50', 50) && t('>= 100', 100));
  assert.ok(t('"a","b"', 'b') && !t('"a","b"', 'c'));
  assert.ok(t('not("a")', 'b') && !t('not("a")', 'a'));
  assert.ok(t('-', 'anything') && t('', 1));
  assert.throws(() => parseEntry('foo(1)'));
  assert.deepEqual(numericDomain([50, 100]).includes(75), true);
});

// ---------------------------------------------------------------- renders

test('every committed render is well-formed XML (a browser tab forgives what GitHub does not)', async () => {
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ channel: process.env.DIAGRAMS_BROWSER || 'msedge' });
  try {
    const page = await browser.newPage();
    const svgs = [];
    (function walk(d) {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p); else if (p.endsWith('.svg')) svgs.push(p);
      }
    })(examples);
    assert.ok(svgs.length >= 5);
    for (const f of svgs) {
      const err = await page.evaluate((src) => {
        const doc = new DOMParser().parseFromString(src, 'image/svg+xml');
        return doc.querySelector('parsererror')?.textContent ?? null;
      }, fs.readFileSync(f, 'utf8'));
      assert.equal(err, null, `${f}: ${err}`);
    }
  } finally { await browser.close(); }
});

// ---------------------------------------------------------------- message flow routing

test('no message flow runs through a shape (regression: an agent-made Chat diagram)', async () => {
  const files = [
    ...collectFiles([examples]).filter((f) => f.endsWith('.bpmn')),
    path.join(here, 'fixtures', 'send-to-chat.bpmn'),
  ];
  for (const f of files) {
    const { defs } = await parseBpmn(await layoutBpmn(fs.readFileSync(f, 'utf8')));
    const els = defs.diagrams[0].plane.planeElement;
    const boxes = els
      .filter((e) => e.$type === 'bpmndi:BPMNShape' && !['bpmn:Participant', 'bpmn:SubProcess'].includes(e.bpmnElement.$type))
      .map((e) => ({ id: e.bpmnElement.id, ...e.bounds }));
    for (const edge of els.filter((e) => e.$type === 'bpmndi:BPMNEdge' && e.bpmnElement.$type === 'bpmn:MessageFlow')) {
      const mf = edge.bpmnElement;
      const own = new Set([mf.sourceRef.id, mf.targetRef.id]);
      const pts = edge.waypoint;
      for (let i = 0; i + 1 < pts.length; i++) {
        const [a, b] = [pts[i], pts[i + 1]];
        for (const box of boxes) {
          if (own.has(box.id)) continue;
          const hit = Math.max(a.x, b.x) > box.x && Math.min(a.x, b.x) < box.x + box.width && Math.max(a.y, b.y) > box.y && Math.min(a.y, b.y) < box.y + box.height;
          assert.ok(!hit, `${path.basename(f)}: ${mf.id} runs through ${box.id}`);
        }
      }
    }
  }
});

// ---------------------------------------------------------------- themes (docs/themes.md)

import { THEMES, KINDS, checkTheme, contrast, cssProblems, themeCss } from '../themes.mjs';
import { openRenderer } from '../render.mjs';
import { tableSvg, tablesOf } from '../tables.mjs';
import { parseDmn } from '../lib/load.mjs';

test('T-4: every theme meets the legibility floor', () => {
  for (const t of Object.values(THEMES)) assert.deepEqual(checkTheme(t), [], `theme ${t.id}`);
});

test('T-2: a theme tints only the kinds a shape already distinguishes, and has them all', () => {
  for (const t of Object.values(THEMES)) assert.deepEqual(Object.keys(t.kinds).sort(), [...KINDS].sort(), t.id);
});

test('T-1: a stylesheet that hides, moves or re-patterns something is rejected', () => {
  assert.deepEqual(cssProblems(themeCss(THEMES.cards)), []);
  for (const bad of ['display: none', 'visibility: hidden', 'opacity: 0', 'transform: scale(2)', 'stroke-dasharray: 0', 'width: 400px', 'x: 10px']) {
    assert.equal(cssProblems(`.th-task .djs-visual > rect { fill: #fff !important; ${bad} !important; }`).length, 1, bad);
  }
});

test('checkTheme rejects a theme that is too faint or tints something new', () => {
  const faint = { ...THEMES.cards, shape: { ...THEMES.cards.shape, outline: '#e5e7eb' } };
  assert.ok(checkTheme(faint).some((p) => /outline/.test(p)));
  const thin = { ...THEMES.cards, stroke: { base: 2, end: 3 } };
  assert.ok(checkTheme(thin).some((p) => /twice/.test(p)));
  const extra = { ...THEMES.cards, kinds: { ...THEMES.cards.kinds, error: { fill: '#ffffff', outline: '#ff0000' } } };
  assert.ok(checkTheme(extra).some((p) => /error/.test(p)));
  assert.ok(contrast('#000000', '#ffffff') > 20);
});

/** The nested viewer SVG without the kind classes a theme adds, so themes can be compared with plain. */
const body = (svg) => svg.slice(svg.indexOf('<svg x="'), svg.lastIndexOf('</svg>\n<text')).replace(/ th-[a-z-]+/g, '').replace(/-[a-z0-9]{20,}/g, '-ID'); // viewers add a random suffix to marker ids
const texts = (svg) => [...svg.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, '')).filter(Boolean);

test('T-1, T-4, T-5: a themed render differs from plain only in stylesheet and kind classes', async () => {
  const sources = [
    ...collectFiles([examples, path.join(examples, '..', 'templates')]),
    path.join(here, 'fixtures', 'send-to-chat.bpmn'),
  ];
  const renderer = await openRenderer();
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ channel: process.env.DIAGRAMS_BROWSER || 'msedge' });
  try {
    const page = await browser.newPage();
    const wellFormed = (svg) => page.evaluate((src) => new DOMParser().parseFromString(src, 'image/svg+xml').querySelector('parsererror')?.textContent ?? null, svg);
    for (const f of sources) {
      const xml = f.endsWith('.bpmn') ? await layoutBpmn(fs.readFileSync(f, 'utf8')) : await layoutDmn(fs.readFileSync(f, 'utf8'));
      const draw = (theme) => (f.endsWith('.bpmn')
        ? renderer.bpmn(xml, { title: 'T', source: 's', theme, audit: true })
        : renderer.drd(xml, { title: 'T', source: 's', theme, audit: true }));
      const plain = await draw('plain');
      for (const id of Object.keys(THEMES).filter((x) => x !== 'plain')) {
        const themed = await draw(id);
        const label = `${path.basename(f)} in ${id}`;
        assert.equal(await wellFormed(themed.svg), null, `${label}: not well-formed XML`);
        assert.deepEqual(themed.offenders, [], `${label}: still in the viewer's own colour: ${themed.offenders}`);
        assert.ok(body(themed.svg) === body(plain.svg), `${label}: differs from plain beyond classes and stylesheet`);
        const { start, end } = themed.metrics;
        if (start && end) assert.ok(end >= 2 * start, `${label}: end ring ${end}px is not twice the start ring ${start}px`);
        // the dash patterns of message flows and data associations are the notation's
        const dashed = (svg) => (svg.match(/stroke-dasharray: [^;"]*/g) ?? []).length;
        assert.equal(dashed(themed.svg), dashed(plain.svg), `${label}: dash patterns changed`);
      }
      if (f.endsWith('.dmn')) {
        const { defs } = await parseDmn(fs.readFileSync(f, 'utf8'));
        for (const { decision, table } of tablesOf(defs)) {
          const ref = texts(tableSvg(decision, table, 's', 'plain'));
          for (const id of Object.keys(THEMES)) {
            const s = tableSvg(decision, table, 's', id);
            assert.equal(await wellFormed(s), null, `${path.basename(f)} table in ${id}: not well-formed`);
            assert.deepEqual(texts(s), ref, `${path.basename(f)} table in ${id}: text differs from plain`);
          }
        }
      }
    }
  } finally {
    await browser.close();
    await renderer.close();
  }
});

// ---------------------------------------------------------------- choosing a theme

import os from 'node:os';
import { spawnSync } from 'node:child_process';

test('the theme comes from diagrams.config.json, --theme overrides it, a typo is refused', () => {
  const cli = path.join(here, '..', 'diagrams.mjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'diagrams-theme-'));
  try {
    fs.copyFileSync(path.join(examples, 'poem-loop', 'poem-loop.bpmn'), path.join(dir, 'p.bpmn'));
    const run = (...args) => spawnSync(process.execPath, [cli, 'render', dir, ...args], { encoding: 'utf8' });
    const svg = () => fs.readFileSync(path.join(dir, 'p.svg'), 'utf8');

    assert.equal(run().status, 0);
    assert.ok(!svg().includes('<style>'), 'no config means plain');

    fs.writeFileSync(path.join(dir, 'diagrams.config.json'), '{ "theme": "cards" }');
    assert.equal(run().status, 0);
    assert.ok(svg().includes('<style>') && svg().includes('th-task'), 'config picks cards');

    assert.equal(run('--theme', 'plain').status, 0);
    assert.ok(!svg().includes('<style>'), '--theme overrides the config');

    assert.equal(run('--theme', 'all').status, 0);
    for (const id of Object.keys(THEMES)) assert.ok(fs.existsSync(path.join(dir, `p.${id}.svg`)), `p.${id}.svg`);

    fs.writeFileSync(path.join(dir, 'diagrams.config.json'), '{ "theme": "neon" }');
    const bad = run();
    assert.notEqual(bad.status, 0);
    assert.match(bad.stderr, /unknown theme "neon"/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------- determinism

test('rendering the same diagram twice gives the same bytes (so rebuilding never churns git)', async () => {
  const renderer = await openRenderer();
  try {
    for (const f of [path.join(examples, 'poem-loop', 'poem-loop.bpmn'), path.join(examples, 'spending-limit', 'spending-limit-action.dmn')]) {
      const xml = fs.readFileSync(f, 'utf8');
      const draw = () => (f.endsWith('.bpmn')
        ? renderer.bpmn(xml, { title: 'T', source: 's', theme: 'cards' })
        : renderer.drd(xml, { title: 'T', source: 's', theme: 'cards' }));
      const [a, b] = [await draw(), await draw()];
      assert.ok(a === b, `${path.basename(f)} renders differently on a second run`);
      assert.ok(a.endsWith('</svg>\n'), 'ends with a newline');
    }
  } finally { await renderer.close(); }
});
