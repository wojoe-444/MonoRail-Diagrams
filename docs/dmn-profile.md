# DMN profile

DMN (Decision Model and Notation) describes decisions: facts go in, an answer comes out. This page is the subset we allow and its rules. Deciding whether you need DMN: [bpmn-vs-dmn.md](bpmn-vs-dmn.md). Files are authored as **DMN 1.3**; why, and what is newer, is in [versions.md](versions.md).

DMN has two views of the same model:

- The **decision requirements diagram (DRD)**: which decisions exist and which facts or other decisions each one needs.
- The **decision table**: for one decision, the rules that turn inputs into an output.

## Allowed elements

| Element | Allowed? | Use |
| --- | --- | --- |
| Decision | Yes | One question answered. Holds a decision table or a literal expression. |
| Input data | Yes | A fact that comes from outside the model. |
| Business knowledge model | Yes | Reusable logic (a table or literal expression) that several decisions call. |
| Knowledge source | Yes | Names where a rule comes from (a policy, a document). Documentation only. |
| Information requirement | Yes | "This decision needs that input or decision." |
| Knowledge and authority requirement | Yes | Links to a business knowledge model or knowledge source. |
| Decision table | Yes | The default way to state rules. |
| Literal expression | Yes | One FEEL expression, for a simple computed value. |
| Decision service | No | Not needed yet. |
| Other boxed expressions (context, relation, list, invocation, function) | No | Keep every decision a table or a one-line expression so it can be read at a glance. |

## Rules

- **DM-1. One decision requirements diagram per file.** It has one main decision (the one whose answer the process uses); other decisions exist only to feed it.
- **DM-2. Only the allowed elements.** The linter reports the rest.
- **DM-3. Each decision is a decision table or a literal expression.** Why: any other expression type needs programming knowledge to read.
- **DM-4. Everything is typed.** Every input and output has a type (`string`, `number`, `boolean`, `date`). An input with a fixed set of values lists them as allowed values. Why: it makes completeness checkable (DM-6) and lets the process's gateway labels be compared with the real outputs ([BL-2](bpmn-vs-dmn.md#the-blend)).
- **DM-5. Hit policy.** Prefer **Unique** (U): rules never overlap, so row order never matters. **Any** (A) only when rows may overlap and always agree. **First** (F) only when order truly matters; it needs a final catch-all row and a note on why. **Collect** (C) when the answer is a list. **Priority**, **Rule order** and **Output order** are not allowed.
- **DM-6. The table is complete.** Every combination of input values gets an output: enumerate them all (possible when inputs list allowed values) or end with a catch-all row whose inputs are all `-` ("any").
- **DM-7. Inputs are plain names.** A column header is a variable name, not a calculation. If a value must be worked out first (a percentage, a day count), make that its own decision and feed it in.
- **DM-8. FEEL subset.** Table entries use only the following.

  | Need | Write | Example |
  | --- | --- | --- |
  | A value | The literal | `"stop"`, `80`, `true` |
  | Any value | `-` | `-` |
  | A range | Brackets for inclusive, parentheses for exclusive | `[50..80)` |
  | A comparison | `<`, `<=`, `>`, `>=` | `>= 90` |
  | One of several | Comma-separated values | `"warn","stop"` |
  | Anything but | `not(...)` | `not("allow")` |

  Literal expressions may also use arithmetic, `if ... then ... else ...`, and the built-ins `min`, `max`, `sum`, `count` and `string`. Anything outside this list needs a note saying why.
- **DM-9. Prefer one output column.** Use several outputs only when they are always used together.
- **DM-10. Keep tables small.** At most 5 inputs and 12 rows. Past that, split into two decisions.
- **DM-11. Requirements point to the decision that needs them.** An arrow runs from an input or a supporting decision up to the decision that consumes it.
- **DM-12. Say what each decision answers.** Every decision has `documentation` with one sentence (the question it answers). A table may have an annotation column that explains any row whose reason is not obvious.
- **DM-13. No order, no side effects.** Nothing in a DMN file describes when a decision runs, how often, or what happens afterwards. That is BPMN ([BL-4](bpmn-vs-dmn.md#the-blend)).
- **DM-14. No colour.** As for BPMN, no colour in the file.

## Reading a decision table

```
Spending limit action   (hit policy: U)
 #  | Limit on? | Share spent | Over-limit behaviour | One more turn allowed? | action
 1  | false     | -           | -                    | -                      | allow
 2  | true      | < 50        | -                    | -                      | allow
 ...
```

Read it row by row: when every input cell matches, the row's output is the answer. With hit policy U exactly one row matches. The real table (built from MonoRail's own description of the spending limit) is a phase 2 example.

## See also

[naming.md](naming.md) for decision, input and output names, [layout.md](layout.md) for how the diagram and the table are drawn, [symbol-reference.md](symbol-reference.md) for the shapes, [checklist.md](checklist.md) for review, and [process-to-diagram.md](process-to-diagram.md) for the steps. The process side: [bpmn-profile.md](bpmn-profile.md).
