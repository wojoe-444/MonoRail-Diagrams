# Spending limit (blended example)

**Question this answers:** before a Chat turn starts, does the spending limit let it run, run it with a warning, or refuse it?
**Notation:** both. The process (what happens around the decision) is BPMN; the decision (facts in, action out) is DMN, connected as in [bpmn-vs-dmn.md](../../docs/bpmn-vs-dmn.md#the-blend).
**Trigger:** a turn is requested.
**Participants:** MonoRail app (drawn in full).
**Outcomes:** Turn finished, Turn refused.
**Steps (happy path):** 1. Check the spending limit (a business rule task that asks the decision). 2. Run the turn.
**Decisions:** "Spending limit action" has four inputs (limit enabled, share spent, over-limit behaviour, one more turn allowed) and three outcomes, so it is extracted to DMN (BL-6, BL-7). Its table is proven complete and exclusive by the linter.
**Waits and limits:** none.
**Failures that change the path:** none.
**Data that outlives a run:** none drawn.
**Open questions:**
- MonoRail warns when 50, 80 and 90 percent are crossed. The table calls everything from 50 up to the limit "warn", and does not model each level or whether a warning repeats.
- "Share spent" is taken as the percentage of whichever limit (daily or monthly) is closest to being reached. The sources say a daily and/or monthly limit exists but not how the page combines them.
**Out of scope:** booking a finished turn's cost, the "Allow one more turn" button itself, a running turn (it is never cut off).

Source of the facts: MonoRail's own description of its spending limit. Files: [start-turn.bpmn](start-turn.bpmn) (the process, [render](start-turn.svg)) and [spending-limit-action.dmn](spending-limit-action.dmn) (the decision, [requirements](spending-limit-action.svg) and [table](spending-limit-action-table.svg)).
