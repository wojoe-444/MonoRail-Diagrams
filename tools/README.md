# Tools

Check, lay out and render MonoRail BPMN and DMN files. The point: an agent writes only the *meaning* of a diagram (elements, flows, rules) and these tools add everything that makes diagrams look alike.

## Setup

Needs Node 20 or newer and Microsoft Edge or Google Chrome installed (rendering drives the installed browser; nothing is downloaded).

```
cd tools
npm install
```

Set `DIAGRAMS_BROWSER=chrome` to use Chrome instead of Edge.

## Use

```
node diagrams.mjs build  <file|folder>...    check, then lay out, then render
node diagrams.mjs check  <file|folder>...    lint only; exit code 1 on errors
node diagrams.mjs layout <file|folder>...    add coordinates to the files, in place
node diagrams.mjs render <file|folder>...    write .svg next to each file  [--png]
npm test                                      the tools' own tests
```

`build` is the one to use. It lints first and changes nothing if there is an error. Then it writes the layout into the `.bpmn` / `.dmn` and writes the renders:

| Source | Writes |
| --- | --- |
| `name.bpmn` | `name.svg` |
| `name.dmn` | `name.svg` (decision requirements diagram) and `name-table.svg` (the decision table; with several tables, `name-table-<decisionId>.svg`) |

`--png` also writes a `.png` of each render, only for looking at (the repo ignores them).

Running `build` again is safe: layout replaces any earlier coordinates and gives the same result.

## What the linter checks

Every message names the rule it comes from, so the fix is in the docs: BP-* in [bpmn-profile.md](../docs/bpmn-profile.md), DM-* in [dmn-profile.md](../docs/dmn-profile.md), NM-* in [naming.md](../docs/naming.md), BL-* in [bpmn-vs-dmn.md](../docs/bpmn-vs-dmn.md).

- **BPMN:** allowed elements and event types, one start and at least one end, no implicit splits or joins, paired gateways, gateway questions and flow answers, no conditions on activity flows, message flows only across pools and labelled, named outcomes, at most 15 shapes per view, purpose and trigger documentation, no colour, id prefixes and name rules.
- **DMN:** allowed elements, one main decision, a description on every decision, types on everything, allowed values on string inputs and outputs, hit policy, plain-name inputs, size limits, FEEL subset. It also **evaluates the table**: every combination of input values must match a rule (DM-6), and under hit policy UNIQUE no two rules may match the same combination (DM-5). A message names the failing combination.
- **The blend:** each business rule task must point at `<file>.dmn#<decisionId>` that exists next to it, be followed by an exclusive gateway, and that gateway must have exactly one flow per output value of the decision, spelled the same (BL-1, BL-2).

Rules that need judgement (task names as verb plus object, whether a gateway should be a decision, whether the diagram answers one question) are not linted; they are in [checklist.md](../docs/checklist.md).

## Why our own layouter

`bpmn-auto-layout` 1.3.0 was tried first (2026-11-14) and rejected: on the poem loop it ignored the pools and message flows, drew no edges, laid the process out top to bottom and stacked an expanded sub-process's contents on top of each other. Our profile is narrow enough to lay out exactly, which also makes the layout rules ([layout.md](../docs/layout.md)) true by construction instead of approximately:

- `layout-bpmn.mjs`: columns by longest path, the first outgoing flow of a split stays on the main line, other branches below (boundary-event exceptions nearest the line), loop-backs along the bottom, black-box pools underneath with vertical message flows, data references in a band above, and label placement that tries several spots and picks one that touches nothing.
- `layout-dmn.mjs`: main decision on top, inputs on the bottom row.
- `tables.mjs`: the decision table drawn as SVG.
- `render.mjs`: `bpmn-js` and `dmn-js` viewers in a headless browser, then a white background, a title above and the source file name below.

Limits, reported with a clear message instead of guessed: lanes, text annotations, several white-box pools. Message flows are drawn straight down to the black-box pools below, so they can cross lines of lower rows.

## Files

```
diagrams.mjs        the command line
lint.mjs            BPMN and DMN rules, blend checks
feel.mjs            the FEEL subset evaluator behind the table checks
layout-bpmn.mjs     layout-dmn.mjs     tables.mjs     render.mjs
lib/load.mjs        reading files
test/               node --test
```
