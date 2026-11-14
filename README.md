# MonoRail Diagrams

The standard for drawing **process and flow diagrams** in MonoRail apps: **BPMN 2.0** for flow, **DMN** for decisions, with a rule for when to use which and the one way they connect.

The goal: point an agent here and have it turn a described process into a diagram that matches every other MonoRail diagram, quickly and without guesswork.

> Status: the written standard, the tools and three worked examples are in place. The agent skill and the agent test are still to come. See [PLAN.md](PLAN.md) for the plan and the current state.

## Which notation?

| You are describing | Use |
| --- | --- |
| Steps in order, waiting, people or systems exchanging messages, repeats | **BPMN** |
| A mapping from facts to an answer, no order | **DMN** |
| A process that contains such a mapping | **Both**, joined as in [bpmn-vs-dmn.md](docs/bpmn-vs-dmn.md#the-blend) |
| How parts of the app are wired together | Not covered here |

## The standard

| Page | What it settles |
| --- | --- |
| [bpmn-vs-dmn.md](docs/bpmn-vs-dmn.md) | Which notation, and the blend rules. **Read first.** |
| [process-to-diagram.md](docs/process-to-diagram.md) | The step-by-step procedure, with the brief template |
| [bpmn-profile.md](docs/bpmn-profile.md) | Which BPMN elements are allowed and the rules for them |
| [dmn-profile.md](docs/dmn-profile.md) | Which DMN elements are allowed and the rules for them |
| [naming.md](docs/naming.md) | Names, IDs, file names |
| [layout.md](docs/layout.md) | How diagrams are laid out |
| [symbol-reference.md](docs/symbol-reference.md) | Every allowed shape and what it means |
| [checklist.md](docs/checklist.md) | The review list |
| [versions.md](docs/versions.md) | Pinned notation versions and tools |

Every rule has an ID (`BP-3`, `NM-4`, `BL-2` and so on) so reviews, tools and agents can cite it.

## Examples and tools

- [examples/](examples/README.md): the poem loop, a Chat turn, and the spending limit (the blend of BPMN and DMN).
- [explainer/index.html](explainer/index.html): open in a browser. Each example beside its brief, with what to notice. Rebuild with `node tools/build-explainer.mjs`.
- [templates/](templates/process.bpmn): start a new `.bpmn` or `.dmn` from these.
- [tools/](tools/README.md): `node diagrams.mjs build <folder>` checks the rules, lays the diagram out and writes the SVG.

## For agents

Start at [AGENTS.md](AGENTS.md).

## Repository map

```
AGENTS.md      agent entry point
PLAN.md        the plan and its status
docs/          the standard
examples/      worked examples with briefs and renders
templates/     starting files for a process and a decision
tools/         check, lay out and render (Node)
explainer/     the explainer page, built from the examples
```

Files are never pictures only: the source of truth is `.bpmn` and `.dmn` XML, and images are renders of it. This repository holds no personal data; examples use MonoRail's own public behaviour or fictional data.
