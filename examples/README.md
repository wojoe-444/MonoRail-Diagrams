# Examples

Worked examples of the standard, all built with `node tools/diagrams.mjs build` from files that contain only the meaning of the diagram. Each folder has a `brief.md` (the filled-in brief from [process-to-diagram.md](../docs/process-to-diagram.md)), the source files and the `.svg` renders.

| Example | Shows |
| --- | --- |
| [poem-loop](poem-loop/brief.md) | A black-box pool and request/reply message flows (BP-18), a looping sub-process (BP-12), a data store (BP-13). Comes with the [script](poem-loop/poem_loop.py) it describes. |
| [chat-turn](chat-turn/brief.md) | Boundary events: a timer limit and a message interruption (BP-9), a message start event, several named end events (BP-8), a message flow into a boundary event. |
| [spending-limit](spending-limit/brief.md) | **The blend:** a business rule task calls a DMN decision and a gateway routes on its answer (BL-1, BL-2), plus a decision table and its requirements diagram. |

Starting a new diagram: copy from [templates](../templates/process.bpmn) and follow [process-to-diagram.md](../docs/process-to-diagram.md). The [explainer](../explainer/index.html) shows all three beside their briefs.
