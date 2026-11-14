// Build explainer/index.html: a single self-contained page that shows how a described
// process becomes a diagram, using the real example files, drawn in every theme.
//
//   node tools/build-explainer.mjs
//
// Each diagram is rendered from its source (.bpmn / .dmn) in plain, cards and dusk, and embedded
// as an image (no id clashes between diagrams); a switch at the top shows one theme at a time.
// The briefs are read from the examples, so the page cannot drift from them.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openRenderer } from './render.mjs';
import { tablesFromXml } from './tables.mjs';
import { THEMES } from './themes.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const uri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
const themeIds = Object.keys(THEMES);

/** Read "**Key:** value" lines of a brief into an object. */
function brief(file) {
  const out = {};
  for (const line of read(file).split('\n')) {
    const m = line.match(/^\*\*([^*]+?):\*\*\s*(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
// Briefs link to other files with Markdown links; the page shows just the link text.
const inline = (s) => esc(s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')).replace(/`([^`]+)`/g, '<code>$1</code>');
const titleOf = (xml) => (xml.match(/<(?:\w+:)?(?:process|decision|definitions)\b[^>]*\bname="([^"]*)"/) ?? [])[1];
const nice = (f) => f.replace(/\.(bpmn|dmn)$/, '').replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());

const EXAMPLES = [
  {
    id: 'poem-loop',
    title: 'Poem loop',
    kind: 'BPMN',
    folder: 'examples/poem-loop',
    figures: [{ type: 'bpmn', file: 'poem-loop.bpmn', alt: 'BPMN diagram of the poem loop: a Python script pool with a looping Round sub-process of three service tasks, and a Codex CLI black-box pool below it.' }],
    notice: [
      'The Python script is a pool we draw in full. Codex is a <b>black-box pool</b>: we only exchange messages with it, so its insides are not drawn.',
      'Each task sends a request (left dashed line) and gets a reply (right dashed line). That is one task with two <b>message flows</b>, not two tasks.',
      'The circular arrow on <b>Round</b> means repeat. Three rounds is a fixed count, so there is a loop marker and no gateway.',
      'The cylinder is a <b>data store</b>: the writer prompt outlives one round. The reviser overwrites it and the next round\'s writer reads it.',
    ],
  },
  {
    id: 'chat-turn',
    title: 'Chat turn',
    kind: 'BPMN',
    folder: 'examples/chat-turn',
    figures: [{ type: 'bpmn', file: 'chat-turn.bpmn', alt: 'BPMN diagram of a Chat turn: a message starts it, a gateway checks whether the chat is busy, a service task runs the turn with a 30 minute timer and a Stop message boundary event, and four named end events.' }],
    notice: [
      'The envelope in the start circle means the process begins when a <b>message</b> arrives from the user.',
      'The two circles on the edge of <b>Run turn in worker</b> are <b>boundary events</b>. The clock is the 30 minute limit; the envelope is the Stop button. Each interrupts the task and takes its own path.',
      '<b>Chat already running a turn?</b> tests one fact with two answers, so it stays a gateway. It is not worth a decision table.',
      'Four ends, four outcomes, each named for its result. A single generic "End" would hide that.',
    ],
  },
  {
    id: 'spending-limit',
    title: 'Spending limit',
    kind: 'BPMN + DMN',
    folder: 'examples/spending-limit',
    figures: [
      { type: 'bpmn', file: 'start-turn.bpmn', alt: 'BPMN diagram: turn requested, a business rule task Check spending limit, a gateway with allow, warn and stop flows, and the run, warn and refuse paths.' },
      { type: 'drd', file: 'spending-limit-action.dmn', alt: 'DMN decision requirements diagram: the decision Spending limit action needs four inputs.', narrow: true },
      { type: 'table', file: 'spending-limit-action.dmn', alt: 'DMN decision table with six rules and the hit policy U.', wide: true },
    ],
    notice: [
      'The table icon marks a <b>business rule task</b>: it asks a decision. The link is written in the file as <code>spending-limit-action.dmn#dec_spendingLimitAction</code>.',
      'The gateway\'s three flows carry exactly the decision\'s three outputs: <code>allow</code>, <code>warn</code>, <code>stop</code>. The linter compares them with the table.',
      'The process says nothing about percentages. All the rules live in the table, so changing a threshold never touches the flow.',
      'The requirements diagram shows <i>what</i> the decision needs. The table shows <i>how</i> it decides. The linter proves the table matches every combination of inputs exactly once.',
    ],
  },
];

const page = (body) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>From Process to Diagram</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;600&display=swap" rel="stylesheet">
<style>
/* Layout idea: a technical drawing sheet. Rules first, then each example as description beside diagram. */
:root {
  --bg: #f1f4f7; --surface: #ffffff; --ink: #16212b; --muted: #566573; --line: #c9d2da; --band: #e4eaef;
  --bpmn: #1f5f7a; --dmn: #7a4a1f; --both: #4d3a7a; --accent: #1f5f7a; --accent-ink: #ffffff;
  --sans: "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, Consolas, monospace;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0e151b; --surface: #16202a; --ink: #e4ebf1; --muted: #9aa9b7; --line: #2b3945; --band: #1f2b35;
    --bpmn: #7cc2de; --dmn: #e0a872; --both: #b9a4ec; --accent: #7cc2de; --accent-ink: #0e151b; color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #0e151b; --surface: #16202a; --ink: #e4ebf1; --muted: #9aa9b7; --line: #2b3945; --band: #1f2b35;
  --bpmn: #7cc2de; --dmn: #e0a872; --both: #b9a4ec; --accent: #7cc2de; --accent-ink: #0e151b; color-scheme: dark;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 400 16px/1.55 var(--sans); }
main { max-width: 1200px; margin: 0 auto; padding: 32px 16px 64px; display: flex; flex-direction: column; gap: 40px; }
h1 { margin: 0; font: 600 32px/1.15 var(--sans); text-wrap: balance; }
h2 { margin: 0 0 16px; font: 600 22px/1.25 var(--sans); text-wrap: balance; }
h3 { margin: 0; font: 600 18px/1.3 var(--sans); }
.eyebrow { font: 500 12px/1 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
header { display: flex; flex-direction: column; gap: 8px; }
.lede { margin: 0; color: var(--muted); max-width: 70ch; }
code { font-family: var(--mono); font-size: .88em; background: var(--band); padding: 1px 5px; border-radius: 4px; }
.panel { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 24px; }
.choose { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
.choose .card { border: 1px solid var(--line); border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 6px; background: var(--bg); }
.q { font-weight: 600; }
.tag { font: 500 12px/1 var(--mono); letter-spacing: .06em; text-transform: uppercase; }
.tag.bpmn { color: var(--bpmn); } .tag.dmn { color: var(--dmn); } .tag.both { color: var(--both); }
.note { margin: 16px 0 0; color: var(--muted); max-width: 75ch; }

/* Style switch */
.styles { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; padding: 12px 16px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; }
.styles .label { font: 500 12px/1 var(--mono); letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
.styles .seg { display: inline-flex; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.styles button { font: 600 14px/1 var(--sans); padding: 8px 14px; border: 0; background: transparent; color: var(--ink); cursor: pointer; }
.styles button + button { border-left: 1px solid var(--line); }
.styles button[aria-pressed="true"] { background: var(--accent); color: var(--accent-ink); }
.styles button:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.styles .desc { color: var(--muted); font-size: 14px; flex: 1 1 280px; }

.example { display: flex; flex-direction: column; gap: 16px; }
.example-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px 16px; }
.cols { display: grid; grid-template-columns: minmax(0, 1fr); gap: 24px; }
@media (min-width: 1000px) { .cols { grid-template-columns: 300px minmax(0, 1fr); } }
dl.brief { margin: 0; display: grid; gap: 12px; font-size: 14px; align-content: start; }
dl.brief dt { font: 500 11px/1 var(--mono); letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 4px; }
dl.brief dd { margin: 0; }
.figs { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.paper { border: 1px solid var(--line); border-radius: 8px; overflow-x: auto; background: var(--surface); }
.paper img { display: none; width: 100%; min-width: 760px; height: auto; }
.paper img.on { display: block; }
.paper.narrow img { min-width: 0; max-width: 640px; }
.paper.table img { min-width: 1100px; }
ul.notice { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 6px; max-width: 80ch; }
.file { font: 400 12px/1.4 var(--mono); color: var(--muted); }
.key { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px 24px; padding: 0; margin: 0; list-style: none; }
.key li { display: grid; grid-template-columns: 64px 1fr; gap: 12px; align-items: center; font-size: 14px; }
.key svg { width: 64px; height: 40px; display: block; }
.key b { display: block; font-weight: 600; }
.key span { color: var(--muted); }
.key .s { fill: var(--surface); stroke: var(--ink); stroke-width: 1.5; }
.key .t { fill: none; stroke: var(--ink); stroke-width: 1.5; }
.key .m { fill: none; stroke: var(--ink); stroke-width: 1.4; stroke-dasharray: 6 4; }
.key .f { fill: var(--ink); stroke: var(--ink); }
.key .th { stroke-width: 4.5; }
.key .band { fill: var(--band); stroke: var(--ink); stroke-width: 1.5; }
</style>
</head>
<body>
<main>
${body}
</main>
<script>
(function () {
  var descriptions = ${JSON.stringify(Object.fromEntries(themeIds.map((id) => [id, THEMES[id].description])))};
  var buttons = document.querySelectorAll('.styles button');
  var desc = document.querySelector('.styles .desc');
  function pick(id) {
    document.querySelectorAll('.paper img').forEach(function (img) { img.classList.toggle('on', img.dataset.style === id); });
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.style === id)); });
    desc.textContent = descriptions[id];
  }
  buttons.forEach(function (b) { b.addEventListener('click', function () { pick(b.dataset.style); }); });
  pick('plain');
})();
</script>
</body>
</html>
`;

function keySvg() {
  const sq = '<marker id="kSeq" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto"><path class="f" d="M0,1 L10,5 L0,9 z"/></marker><marker id="kMs" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto"><circle class="s" cx="4" cy="4" r="3"/></marker><marker id="kMe" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto"><path class="s" d="M0,1 L10,5 L0,9 z"/></marker>';
  return `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${sq}</defs></svg>`;
}

const item = (svg, name, text) => `<li><svg viewBox="0 0 64 40" aria-hidden="true">${svg}</svg><div><b>${name}</b><span>${text}</span></div></li>`;
const KEY = [
  item('<circle class="s" cx="32" cy="20" r="12"/>', 'Start event', 'Thin circle. An envelope inside means it starts on a message.'),
  item('<circle class="s th" cx="32" cy="20" r="12"/>', 'End event', 'Thick circle. One distinct outcome, named for its result.'),
  item('<rect class="s" x="4" y="6" width="56" height="28" rx="6"/><circle class="s" cx="14" cy="15" r="4"/>', 'Service task', 'Rounded box with a gear. Software does it.'),
  item('<rect class="s" x="4" y="6" width="56" height="28" rx="6"/><rect class="s" x="9" y="10" width="11" height="8"/>', 'Business rule task', 'Table icon. Asks a decision.'),
  item('<path class="s" d="M32,6 L50,20 L32,34 L14,20 z"/>', 'Gateway', 'Diamond. A question, with its answers on the flows.'),
  item('<line class="t" x1="6" y1="20" x2="58" y2="20" marker-end="url(#kSeq)"/>', 'Sequence flow', 'Solid, filled arrowhead. The order of steps.'),
  item('<line class="m" x1="6" y1="20" x2="58" y2="20" marker-start="url(#kMs)" marker-end="url(#kMe)"/>', 'Message flow', 'Dashed, circle at the sender. Between pools.'),
  item('<rect class="s" x="4" y="4" width="56" height="32" rx="7"/><circle class="s" cx="22" cy="36" r="6"/>', 'Boundary event', 'Circle on a task\'s edge. A limit or interruption.'),
  item('<g transform="translate(12 3)"><path class="s" d="M0,6 a20,6 0 0 1 40,0 v22 a20,6 0 0 1 -40,0 z"/></g>', 'Data store', 'Cylinder. A value that outlives one run.'),
  item('<rect class="s" x="4" y="6" width="56" height="28"/><rect class="band" x="4" y="6" width="10" height="28"/>', 'Pool', 'Band on the left. A participant we draw in full.'),
  item('<rect class="band" x="4" y="10" width="56" height="20"/>', 'Black-box pool', 'Plain bar. A participant we only talk to.'),
  item('<rect class="s" x="6" y="8" width="52" height="24"/><line class="t" x1="6" y1="16" x2="58" y2="16"/><line class="t" x1="24" y1="8" x2="24" y2="32"/>', 'Decision table', 'DMN. Rules in rows, hit policy letter top left.'),
].join('\n');

const renderer = await openRenderer();
try {
  const blocks = [];
  blocks.push(`<header>
  <div class="eyebrow">BPMN 2.0 · DMN · MonoRail Diagrams</div>
  <h1>From process to diagram</h1>
  <p class="lede">How MonoRail describes a process or a decision: BPMN for flow, DMN for rules. Each example below is a real file in the repository, drawn by the repository's own tools from a short written brief, in whichever style you prefer.</p>
</header>`);

  blocks.push(`<div class="styles" role="group" aria-label="Diagram style">
  <span class="label">Diagram style</span>
  <span class="seg">${themeIds.map((id) => `<button type="button" data-style="${id}" aria-pressed="${id === 'plain'}">${THEMES[id].label}</button>`).join('')}</span>
  <span class="desc"></span>
</div>`);

  blocks.push(`<section class="panel" aria-labelledby="which">
  <h2 id="which">Which notation?</h2>
  <div class="choose">
    <div class="card"><span class="tag bpmn">BPMN</span><span class="q">Does it happen over time?</span><span>Steps in order, waiting, messages between participants, repeats, time limits.</span></div>
    <div class="card"><span class="tag dmn">DMN</span><span class="q">Is it facts in, answer out?</span><span>Rules with no order and no side effects: given these inputs, what is the outcome?</span></div>
    <div class="card"><span class="tag both">Both</span><span class="q">A process that contains such a rule?</span><span>The process asks the decision, then branches on the answer.</span></div>
  </div>
  <p class="note">They connect in one way only: a <b>business rule task</b> asks a decision, and an exclusive <b>gateway</b> routes on its answer. A gateway that tests one fact with two outcomes stays in the process. One that tests several facts, or has more than two outcomes, becomes a decision.</p>
</section>`);

  for (const ex of EXAMPLES) {
    const b = brief(`${ex.folder}/brief.md`);
    const tag = ex.kind === 'BPMN' ? 'bpmn' : 'both';
    const rows = [['Question', b['Question this answers']], ['Notation', b.Notation], ['Participants', b.Participants], ['Outcomes', b.Outcomes], ['Decisions', b.Decisions]]
      .filter(([, v]) => v)
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${inline(v)}</dd></div>`)
      .join('\n');
    const figs = [];
    for (const fig of ex.figures) {
      const xml = read(ex.folder, fig.file);
      const imgs = [];
      for (const id of themeIds) {
        let svg;
        if (fig.type === 'bpmn') svg = await renderer.bpmn(xml, { title: titleOf(xml) || nice(fig.file), source: fig.file, theme: id });
        else if (fig.type === 'drd') svg = await renderer.drd(xml, { title: `${nice(fig.file)} (decision requirements)`, source: fig.file, theme: id });
        else svg = (await tablesFromXml(xml, fig.file, id))[0].svg;
        imgs.push(`<img data-style="${id}" src="${uri(svg)}" alt="${esc(fig.alt)}">`);
      }
      figs.push(`<div class="paper${fig.narrow ? ' narrow' : ''}${fig.wide ? ' table' : ''}">${imgs.join('')}</div>`);
    }
    blocks.push(`<section class="panel example" aria-labelledby="${ex.id}">
  <div class="example-head"><h2 id="${ex.id}" style="margin:0">${ex.title}</h2><span class="tag ${tag}">${ex.kind}</span><span class="file">${ex.folder}/</span></div>
  <div class="cols">
    <dl class="brief">${rows}</dl>
    <div class="figs">${figs.join('\n')}</div>
  </div>
  <div>
    <h3>What to notice</h3>
    <ul class="notice">${ex.notice.map((n) => `<li>${n}</li>`).join('')}</ul>
  </div>
</section>`);
  }

  blocks.push(`<section class="panel" aria-labelledby="shapes">
  <h2 id="shapes">Shapes in these examples</h2>
  ${keySvg()}
  <ul class="key">${KEY}</ul>
  <p class="note">The full list of allowed shapes, with what each means and when to use it, is in <code>docs/symbol-reference.md</code>. A style changes colour, type, corner radius and shadow, never a shape, a marker or a line pattern (<code>docs/themes.md</code>); colour in a style only repeats what the shape already says.</p>
</section>`);

  blocks.push(`<section class="panel" aria-labelledby="own">
  <h2 id="own">Drawing your own</h2>
  <p>Write the brief first: the question, the trigger, who takes part, every way it can end, the steps, the decisions, the waits and limits. Then write only the meaning of the diagram (elements and flows, no coordinates, no style) and run <code>node tools/diagrams.mjs build &lt;folder&gt;</code>. It checks the rules, adds the layout and writes the SVG in the project's style (<code>diagrams.config.json</code>). <code>AGENTS.md</code> tells an agent exactly this.</p>
</section>`);

  const out = path.join(root, 'explainer', 'index.html');
  fs.writeFileSync(out, page(blocks.join('\n\n')));
  console.log(`wrote ${out} (${Math.round(fs.statSync(out).size / 1024)} KB)`);
} finally {
  await renderer.close();
}
