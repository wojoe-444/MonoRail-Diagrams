# BPMN, DMN, or both?

Start here. This page decides which notation a request needs and, when the answer is "both", how they connect. The rules have IDs (`BL-1` and so on) so a linter, a reviewer or an agent can cite them.

## The three questions

Ask them in order and stop at the first "yes".

1. **Does it happen over time?** Steps in an order, waiting, people or systems exchanging messages, repeats, timeouts. Use **BPMN**. See [bpmn-profile.md](bpmn-profile.md).
2. **Is it a mapping from facts to an answer?** "Given these inputs, what is the outcome?" with no order, no waiting and no side effects. Use **DMN**. See [dmn-profile.md](dmn-profile.md).
3. **Is it a process that contains such a mapping?** Use **both**: BPMN for the process, DMN for the mapping, joined the one way described in [The blend](#the-blend).

If none fits, it is not a process or decision diagram (for example, how the parts of the app are wired together). This standard does not cover that. Say so instead of forcing a BPMN diagram.

## What each one is for

| | BPMN | DMN |
| --- | --- | --- |
| Answers | In what order does work happen, who or what does it, what do participants exchange? | Given these facts, what is the answer? |
| Time | Central. Things happen, wait, repeat, time out. | Absent. The table has no "before" or "after". |
| Participants | Pools and lanes: the app, a worker process, the user, an external system. | None. Only inputs and decisions. |
| Output | A path through the process and its end states. | A value (or list of values) per decision. |
| Changes when | The way work is carried out changes. | The business rule changes, with the process untouched. |

## MonoRail examples

| Request | Notation | Why |
| --- | --- | --- |
| The update flow: check, download, back up, install, hold on a failed backup | BPMN | Steps, a wait for the user, a failure path. |
| A Chat turn from "Send" to "reply shown", with Stop and the 30 minute limit | BPMN | Time, a timeout, a user interruption. |
| What the spending limit does at 50, 80, 90 and 100 percent | DMN | Facts in (limit on, share spent, stop or warn), one answer out. |
| Which mode a phone turn gets (Ask or Agent) | DMN | Requested mode, where the turn came from and a setting decide it. No order. |
| Starting a turn when a spending limit exists | **Both** | A process that, at one point, needs the spending decision. |

## The blend

They meet in exactly one way.

- **BL-1. A business rule task calls a decision.** In the BPMN file, one *business rule task* stands for "ask the decision". Its `implementation` attribute holds a relative reference to the decision, `spending-limit-action.dmn#dec_spendingLimitAction`. The decision lives in its own `.dmn` file beside the process. Why: BPMN has no standard link to DMN, and a relative reference is something a linter can check.
- **BL-2. A gateway routes on the answer.** Right after the business rule task comes one exclusive gateway. Each outgoing flow is labelled with one of the decision's output values, spelled exactly as in the decision table. Why: the reader sees every outcome in the process, and a linter can compare the labels with the table's allowed output values.
- **BL-3. The process does not repeat the rules.** The gateway only branches on the output. No condition on a flow says "if the share is above 80". Why: two copies of a rule drift apart.
- **BL-4. The decision knows nothing about the process.** The DMN names no task, step, order or timing. Why: that would turn the decision into a hidden process.
- **BL-5. One diagram, one notation.** A process diagram shows *that* a decision happens and *what the outcomes are*. The decision table shows *how*. Never draw a table inside a process or a task sequence inside a decision diagram.

A decision depending on another decision (an information requirement in the decision diagram) is not an order of execution. It says which facts a decision needs. That is allowed and is how a decision requirement diagram is drawn.

## When to pull a decision out of a gateway

Keep a gateway in BPMN when it tests **one fact with two outcomes**: "Backup succeeded?", "Limit reached?".

Extract it to DMN when **any** of these is true:

- **BL-6.** It tests more than one input.
- **BL-7.** It has more than two outcomes.
- **BL-8.** The rule is likely to change without the flow changing.
- **BL-9.** The same rule appears in more than one process.
- **BL-10.** The people who own the rule would rather read it as a table.

## Worked blend

Starting a turn when a spending limit may apply.

```
BPMN  Turn requested -> [Check spending limit] (business rule task) -> Action? (exclusive gateway)
                             |  implementation = spending-limit-action.dmn#dec_spendingLimitAction
                             |                                     allow ---> Run turn
                             |                                     warn  ---> Show warning, Run turn
                             |                                     stop  ---> Turn refused
DMN   Spending limit action:   inputs  limit on?, share spent, over-limit behaviour, one more turn allowed?
                               output  action: allow | warn | stop
```

The full files arrive in phase 2 (`examples/`). The decision table's rows come from MonoRail's own documentation of the spending limit; none are invented here.

## See also

- [bpmn-profile.md](bpmn-profile.md) and [dmn-profile.md](dmn-profile.md): what is allowed in each.
- [process-to-diagram.md](process-to-diagram.md): the procedure that uses this page as step 1.
- [naming.md](naming.md) for how decisions, outputs and gateway flows are named so BL-2 can be checked.
- [checklist.md](checklist.md): the review list, which includes these rules.
- [versions.md](versions.md): which notation versions this assumes.
