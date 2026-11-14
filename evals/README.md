# Evals: do agents follow the standard?

The test of the whole repository: give an agent **only the pointer** from [adopting.md](../docs/adopting.md) and a plain request, and see whether it produces diagrams that follow the standard. Success is defined in [PLAN.md](../PLAN.md); this folder makes it measurable.

## The cases

Five real MonoRail processes, each written the way a person would ask for it ([cases/](cases/)):

| Case | Notation expected | What it tests |
| --- | --- | --- |
| `update-flow` | BPMN | A long process: it will not fit 15 shapes, so the agent must collapse part into a sub-process (BP-11). Timer start, user choices, a held path. |
| `remote-access` | DMN | Facts in, answer out, with no order at all. A table, not a flow. |
| `backup-schedule` | BPMN | Timers, a verify step, a retry after a wait. |
| `child-turn` | Both | The blend: a decision with three facts, wrapped in a short process (BL-1, BL-2). |
| `connection-check` | DMN | A rules table that is easy to mistake for a flow, and easy to wrap in a pointless process (BL-11). |

The requests restate facts from MonoRail's own documentation, nothing invented.

## What the scorer checks

[score.mjs](score.mjs) runs five mechanical checks per case and the case passes only if all hold:

1. **files**: the notation the case expects has a file.
2. **built**: the files carry layout and each has its `.svg` (so the build command ran).
3. **brief**: `brief.md` exists with its required fields.
4. **lint**: no linter errors and at most 3 warnings.
5. **expect**: the case's own requirements (a timer event, enough end events, enough rules, a working blend; for a DMN-only case, no process around it).

It does not judge whether a diagram is a *good* description. Someone looks at the renders for that, and the run's notes say what they saw.

```
node evals/score.mjs evals/runs/<date>                       all cases
node evals/score.mjs evals/runs/<date> --only a-case,b-case  some cases
```

Each run folder holds one subfolder per case with what the agent wrote, and the scorer writes `results.md` and `results.json` beside them.

## How to run a trial

For each case, start a fresh agent (no memory of this repository) with this prompt, filling in the request and the output folder:

```text
You are an agent working in a MonoRail app repository. The app's CLAUDE.md contains this section:

  ## Diagrams
  Process and decision diagrams follow the MonoRail diagrams standard (BPMN 2.0 and DMN),
  repository `wojoe-444/MonoRail-Diagrams` (private; usually checked out at `~/Repos/MonoRail-Diagrams`).
  Before drawing or changing one, read its `AGENTS.md`. Diagrams live in `docs/diagrams/<process>/`.

The checkout is at <path to the checkout>. Do not read its `evals/` folder.

Request: <the case's request>

Write the diagram files into <run folder>/<case id>/ (this stands in for the app's docs/diagrams/<process>/).
Finish with a short summary.
```

Then score the run folder. Keep the run (folder, `results.md`, and a line on the model and date) in [runs/](runs/README.md) so changes to the standard can be compared with it.

## Limits to keep in mind

- Agents can read this folder, including the expected results; the prompt tells them not to, and a run that did read it should be discarded.
- A pass proves the standard was followed, not that the diagram is right. Two agents can both pass and one can still misread the process; the briefs' open questions and a look at the renders are how that shows up.
- Five cases are a spot check, not coverage. Add a case whenever a real request shows a gap.
