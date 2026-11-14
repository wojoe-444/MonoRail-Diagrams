# PLAN: MonoRail Diagrams

This file is the full plan for this repository, written so that any agent (or person) can pick the work up cold if the original session is cut off. Keep the **Status** table current; it is the handoff.

Created 2026-11-14. Owner: the repository owner (`wojoe-444`). Repo is **private** by the owner's decision.

## 1. Purpose

Give every MonoRail app one standard way to draw process and flow diagrams, and make that standard so easy for agents to find and follow that they convert a described process into a consistent diagram quickly and reliably.

The standard is **BPMN 2.0 + DMN**, with explicit guidance on when to use which and when (if ever) they blend.

## 2. Success criteria

An agent that is pointed at this repo, given a plain-language description of a process or decision, will:

1. Pick the right notation (BPMN, DMN, or the sanctioned blend) without asking.
2. Produce valid `.bpmn` / `.dmn` files that pass this repo's linter with no errors.
3. Follow the naming, layout and element-subset rules, so two different agents drawing the same process produce diagrams a reviewer calls "the same style".
4. Find this repo in one step: from an app's `CLAUDE.md` / `AGENTS.md` to the right instruction, with no hunting.

Measured in phase 5 (see section 6): a fixed set of real MonoRail processes, agent output scored by the linter plus a short style checklist.

## 3. Decisions already made

| Decision | Choice | Why |
| --- | --- | --- |
| Notation | BPMN 2.0 for flow, DMN for decisions | Both are OMG standards with a fixed meaning per shape; free tooling exists; they are designed to work together. |
| Source of truth | Real `.bpmn` and `.dmn` XML files, never a picture | Machine-checkable, openable in standard editors, renderable. Images (SVG/PNG) are renders only. |
| Layout | Agents write the semantic part (elements, flows); a tool lays it out | Agents are poor at hand-placing coordinates. Auto-layout must be verified before it is relied on (phase 3). |
| Subset | A restricted **profile** of BPMN/DMN elements | Most consistency comes from limiting the vocabulary, not from the notation itself. |
| Repo visibility | Private | Owner's call (2026-11-14). Revisit if agents on other machines cannot reach it. Keep content free of personal data regardless, because MonoRail's own repo is public and may link here. |
| Explainer | The interactive artifact becomes a static page in this repo | Owner finds it a handy way to see how a process maps to a diagram. |
| Worked examples | Real MonoRail processes taken from the MonoRail repo's `CLAUDE.md` | They are the processes agents will actually be asked about. |
| Commits | Straight to `main` while the repo is new and single-owner | Owner asked for commit/push per phase. Switch to PRs once others contribute. |
| DMN file version | Author DMN **1.3** files | Current spec is 1.6 (1.7 beta), but the tool libraries read 1.3 only. See `docs/versions.md`. Decided 2026-11-14. |
| Link from BPMN to DMN | A business rule task's `implementation` attribute holds `<file>.dmn#<decisionId>` | BPMN has no standard link to DMN; a relative reference is lintable. Our convention (rule BL-1). |
| Where an app's diagrams live | The app's own repo, `docs/diagrams/<process>/` | A diagram changes with the code it describes. Proposed 2026-11-14; the owner can change it. |
| Notation for a lone decision | Deliver the `.dmn` alone (BL-11) | Found by the first agent trial: a trivial wrapper process only repeats the table. |
| Themes | Render-time only; `plain` default, `cards` and `dusk` styled; rules T-1 to T-6 in `docs/themes.md` | Added 2026-11-14 at the owner's request: a plain technical style stays available, styled ones for other settings, "without lowering the level of rigor". A theme may set colour, type, radius, shadow and ring weight only; tests prove a themed render equals the plain one except for the stylesheet. Choice per project in `diagrams.config.json`. |
| Rule IDs | Every rule has an ID (`BP-`, `DM-`, `NM-`, `LY-`, `BL-`) | Reviews, the linter and agents can cite a rule exactly. |

## 4. The BPMN vs DMN guidance (the core of the standard)

Draft position, to be written up properly in `docs/bpmn-vs-dmn.md`:

- **BPMN** answers "in what order does work happen, who or what does it, and what do participants exchange?". It is about sequence over time. MonoRail examples: the update flow, a Chat turn lifecycle, backup before update, remote-access pairing.
- **DMN** answers "given these inputs, what is the outcome?". It is about rules, not sequence. MonoRail examples: spending-limit thresholds (50/80/90 %, stop or warn), Ask vs Agent mode, whether a folder is allowed, which release-notes title to use.
- **They blend in exactly one sanctioned way:** a BPMN *business rule task* calls a DMN *decision*, and a gateway after it routes on the decision's output.
- **Two things are banned:**
  - Multi-attribute rule logic hidden in gateway conditions (extract it to DMN).
  - Sequencing, waiting or side effects inside DMN (that is BPMN).
- Rule of thumb for extraction: a gateway with more than two outgoing paths, or a condition that tests more than one input, is a DMN candidate.
- Never draw one diagram that tries to be both. A process diagram shows *that* a decision happens and *what the outcomes are*; the decision table shows *how*.

## 5. Intended repository layout

```
README.md          human entry point
AGENTS.md          agent entry point (short; routes to the right doc)
PLAN.md            this file
docs/
  bpmn-vs-dmn.md       when to use which, the blend rule, extraction rule of thumb
  bpmn-profile.md      allowed BPMN elements and what each means
  dmn-profile.md       allowed DMN elements: decision tables, hit policies, DRD, FEEL subset
  naming.md            naming rules for tasks, events, gateways, lanes, decisions, files
  layout.md            layout and reading-order rules
  process-to-diagram.md  the step-by-step procedure an agent follows
  symbol-reference.md  every allowed shape, with its meaning
examples/          worked examples: <name>/{description.md, *.bpmn, *.dmn, *.svg}
explainer/         the static explainer page(s)
tools/             lint, validate, render (phase 3)
skill/             Claude Code skill (SKILL.md) for agents (phase 4)
evals/             the agent test set and scoring (phase 5)
```

Not every directory exists yet; the Status table says what does.

## 6. Phases

### Phase 0: setup and plan (this commit)
Git initialised, remote linked, this plan committed. The first hand-drawn artifact (`explainer/poem-loop-svg-draft.html`) and its source script (`examples/poem-loop/poem_loop.py`) are kept as the seed example.

### Phase 1: the written standard
Deliverables: everything under `docs/`, plus `README.md` and `AGENTS.md`.
Done when: a reader can answer "BPMN, DMN or both?" from `docs/bpmn-vs-dmn.md` alone, every allowed element is listed with its meaning, naming and layout rules are concrete enough to lint, and docs link to each other (no orphan pages).
Pin the exact BPMN and DMN versions after verifying them against the OMG specs (do not rely on memory).

### Phase 2: examples and explainer
Deliverables:
- The poem loop redone as a real `.bpmn`.
- At least three MonoRail processes as real files, including one blended example: the **spending limit** (a DMN decision table called from a BPMN process).
- The explainer page, made static and self-contained, showing process description beside diagram.
Done when: every example opens in a standard editor and follows the profile.

### Phase 3: tooling
Deliverables in `tools/`: a lint/validate command (schema validity, profile subset, naming rules, the extraction rule of thumb where checkable), and a render command (layout, then SVG).
Verify before depending on any library: the current versions of `bpmn-js`, `dmn-js`, `bpmn-moddle`, `dmn-moddle`, `bpmnlint` and `bpmn-auto-layout` (npm), and whether auto-layout handles pools, message flows, data stores and looping sub-processes. If auto-layout falls short, the fallback is a small, documented coordinate scheme the agent fills in.
Done when: the lint passes every example and fails a deliberately bad one for the right reason.

### Phase 4: agent entry point
Deliverables: `AGENTS.md` (finished), `skill/SKILL.md` (a Claude Code skill that runs the `process-to-diagram` procedure), and a three-line snippet for an app's `CLAUDE.md` that points here.
Done when: from a clean checkout of an app, following the snippet reaches the right instruction in one hop.

### Phase 5: prove it
Deliverables in `evals/`: about five real MonoRail processes written as plain prompts, a scoring script (lint result plus a short style checklist), and a recorded run.
Done when: agents given only the pointer snippet produce diagrams that pass the lint and the checklist.

### Later (not scheduled)
- Adopt in the MonoRail repo: add the pointer from `docs/adopting.md` to its `CLAUDE.md`, and decide where its diagrams live given its wiki rules (every `docs/**/*.md` needs an `audience:` tag and an inbound link). Not done: it is a change to a different, public repository and needs the owner's go-ahead.
- Decide whether BL-6 should require more than two inputs (see the judgement calls in `evals/runs/2026-11-14/README.md`).
- Lanes and several white-box pools in the layouter, if a real process needs them.
- Re-run the evals whenever the standard changes materially, and add a case whenever a real request shows a gap.
- Revisit repository visibility if agents on other machines need it routinely.

## 7. Status

| Phase | State | Notes |
| --- | --- | --- |
| 0 Setup and plan | done | |
| 1 Written standard | done | `docs/` (9 pages), `README.md`, `AGENTS.md`. Versions and bpmn-js default shape sizes verified 2026-11-14. Links checked. Spending-limit decision table rows still to be written from MonoRail's own description (phase 2). |
| 2 Examples and explainer | done | 2026-11-14: poem loop, Chat turn and spending limit (the blend) as real files with briefs and renders; `explainer/index.html` generated from them by `tools/build-explainer.mjs` (also published as an artifact for the owner). The hand-drawn SVG draft was removed (it is in git history). |
| 3 Tooling | done | `tools/`: lint (with decision-table evaluation and blend checks), own layouter, renderer, 20 tests. `bpmn-auto-layout` tested and rejected, see `docs/versions.md` and `tools/README.md`. Found while building: BP-18 added, templates added. |
| 4 Agent entry point | done | `AGENTS.md`, `skill/SKILL.md` (thin: finds or clones the repo, hands over to AGENTS.md), `docs/adopting.md` with the CLAUDE.md snippet. Adopting it in the MonoRail repo itself is NOT done (see Later). |
| 5 Prove it | done, with caveats | `evals/`: five real processes, a scorer, and the first trial (`evals/runs/2026-11-14`): 4 of 5 by today's scorer. The miss exposed a gap in the standard (BL-11, added) and the re-run passes. Caveats: agents were the same model family as the author, one attempt per case; the scorer proves the standard was followed, not that a diagram is right. A person should look at the renders. |

### Added after phase 5

| Addition | State | Notes |
| --- | --- | --- |
| Themes (`plain`, `cards`, `dusk`) | done 2026-11-14 | `tools/themes.mjs`, `docs/themes.md`. Render-time only, chosen per project in `diagrams.config.json`. Tests enforce that a themed render equals the plain one except for the stylesheet, that the stylesheet sets only allowed properties, and a contrast and ring-weight floor. `cards` is modelled on a status-board screenshot the owner supplied; end events are indigo, not red, so a normal outcome never looks like an error. The explainer has a style switch. Renders are now deterministic (marker ids numbered), so rebuilding does not churn git. |

## 8. Notes for an agent resuming this work

- Read this file, then `git log` to see how far the Status table has got. Update the table as you finish each phase and commit it with the work.
- Verify facts that can go stale (spec versions, library names, versions, features) before writing them down. Say "to verify" in the docs rather than guessing.
- Do not put personal data in this repo: no emails, home-folder paths, tokens or real project names beyond MonoRail itself. Examples about MonoRail processes use MonoRail's public behaviour, as documented in the MonoRail repo's `CLAUDE.md`.
- Commit messages: short imperative subject, then a plain body. Push to `main`.
- The owner wants to understand the logic, not only get the files. Where a rule has a reason, write the reason next to it.
- The owner may describe a process "X" and ask how it translates into a diagram. The explainer and the examples are how that gets answered, so keep them current.
- Why the notation was chosen, the notation facts and the context for each decision came from a working session on 2026-11-14. The first artifact in that session was a hand-drawn SVG of a three-agent poem loop (write, grade, revise a prompt) in BPMN style. It is kept here only as a seed; the real `.bpmn` replaces it in phase 2.
