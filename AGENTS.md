# AGENTS.md: drawing process and decision diagrams

You were pointed here because someone wants a process or a decision drawn. MonoRail uses **BPMN 2.0** (flow) and **DMN** (decisions), in one fixed style. Follow this page; it routes you to the rest.

## Do this

1. Read [docs/bpmn-vs-dmn.md](docs/bpmn-vs-dmn.md). It decides BPMN, DMN, both, or "not covered".
2. Follow [docs/process-to-diagram.md](docs/process-to-diagram.md). Write the **brief** first, then build from it.
3. Build only with the allowed elements: [docs/bpmn-profile.md](docs/bpmn-profile.md) and [docs/dmn-profile.md](docs/dmn-profile.md). Names and IDs: [docs/naming.md](docs/naming.md). Layout: [docs/layout.md](docs/layout.md).
4. Check against [docs/checklist.md](docs/checklist.md) (and the linter, once it exists; see [PLAN.md](PLAN.md)).
5. Save in the app's repo under `docs/diagrams/<process>/` and say which notation you chose and why, in one sentence.

## Non-negotiable

- **Real files, not pictures.** Produce `.bpmn` / `.dmn` XML. Never hand-draw SVG or PNG as the deliverable, and never use Mermaid for processes. An image is only a render of the XML.
- **Do not invent steps.** If the source does not say, add an open question to the brief.
- **Only the allowed elements.** If you need one that is not listed, stop and ask; the standard changes in one place, not diagram by diagram.
- **Blend one way only.** A business rule task references a decision, and an exclusive gateway routes on its output ([BL-1 to BL-5](docs/bpmn-vs-dmn.md#the-blend)).
- **No colour, no decoration** in the files.
- **No personal data** in diagrams or names: paths on a user's machine, emails, tokens, real names.

## Quick reference

| Pattern | Rule |
| --- | --- |
| Task name | Verb + object: "Write poem" |
| Start / end event | "Turn requested" / "Turn refused" (a state, past tense) |
| Exclusive gateway | A question ending in "?"; flows carry the answers |
| Gateway with 2 or more inputs, or 3 or more outcomes | Extract to DMN |
| Timeout | Timer boundary event on the activity, duration in the label |
| IDs | `task_writePoem`, `gw_limitReached`, `dec_spendingLimitAction` |
| View size | At most 15 shapes; collapse into a sub-process beyond that |

## Where things are

[README.md](README.md) lists every page. [docs/symbol-reference.md](docs/symbol-reference.md) says what each shape means, and [docs/versions.md](docs/versions.md) holds the pinned versions.
