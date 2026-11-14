# Run 2026-11-14

The first trial of the standard. One fresh agent per case, one attempt each, given only the CLAUDE.md pointer and the plain request ([how a trial is run](../../README.md#how-to-run-a-trial)).

**Caveats first.** The agents were general-purpose subagents of the same model family that wrote the standard, which probably flatters the result. They had the whole checkout available and were told not to read `evals/`. Each case ran once. The renders here were made by the layouter as it was before the message-routing fix (see below), so two of them show the problem.

## Result

| Case | Scored when run | Scored after BL-11 was added | Notes |
| --- | --- | --- | --- |
| [update-flow](update-flow/brief.md) | pass | pass | Too big for one view, so the agent split it into `update-flow` and `apply-update` (BP-11) and extracted a decision. |
| [remote-access](remote-access/brief.md) | pass | pass | One decision table, no process, as the case calls for. |
| [backup-schedule](backup-schedule/brief.md) | pass | pass | 13 shapes, a timer for the 15 minute retry. |
| [child-turn](child-turn/brief.md) | pass | pass | The blend, built the way [bpmn-vs-dmn.md](../../../docs/bpmn-vs-dmn.md#the-blend) says. |
| [connection-check](connection-check/brief.md) | pass | **fail** | The request was only facts in, answer out. The agent wrapped the decision in a trivial process (trigger, ask, branch to two ends). Nothing in the standard forbade that. |

So the first run was 5 of 5 against the scorer of the day and **4 of 5** against the scorer as it now stands.

## What the review found, and what changed

Found by the agents' own reports and by looking at the renders:

- **A message line ran through an end event** (`child-turn`, and the `update-flow` agent reordered its happy path to dodge the same thing). Fixed in the layouter: such a line now jogs sideways to a clear column. A regression test uses the agent's own file.
- **A label spilled over the pool border** (`connection-check`). Fixed: pools have room on the left and right.
- **The standard had a gap** (BL-11): do not wrap a lone decision in a process. Added, linted by the scorer, in [AGENTS.md](../../../AGENTS.md) and the checklist.
- **Known and left alone:** with two black-box pools stacked, a message flow to the lower one crosses the upper pool (`update-flow`'s `apply-update`). Message flows may cross (LY-5); noted in [tools/README.md](../../../tools/README.md).

## Re-run

`connection-check` was run again with the standard as it is now: [2026-11-14-rerun](../2026-11-14-rerun/connection-check/brief.md). The new agent delivered the `.dmn` alone and cited BL-11. Pass.

## Judgement calls worth a human look

These pass every mechanical check but a person might disagree:

- `update-flow` extracted a decision, "Backup requirement", from two booleans (backup folder set, back up before updating is on). That is what BL-6 says to the letter (more than one input), but a two-input decision is borderline. If it feels like overkill, the fix is in [bpmn-vs-dmn.md](../../../docs/bpmn-vs-dmn.md#when-to-pull-a-decision-out-of-a-gateway): raise the threshold of BL-6.
- `backup-schedule` has one generic start event for "at startup and every minute", and uses a timer only for the retry. A timer start event would say the same thing more directly.
- `child-turn` has one "Send refused" end for three different reasons; the reasons live only in the table's annotations. Reasonable, but the diagram does not show them.

Each agent also listed open questions about things the request did not say (what a failed download does, how long a sign-in flag lasts, and so on). That is the behaviour the standard asks for.

Scores: [results.md](results.md).
