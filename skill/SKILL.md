---
name: monorail-diagrams
description: Draw, update or review a process, workflow, lifecycle, flow or decision-rules diagram for a MonoRail app, in MonoRail's standard (BPMN 2.0 for flow, DMN for decisions). Use when asked to diagram, map, document or visualise how something works step by step, when a decision depends on several facts and should be a rules table, or when a diagram under docs/diagrams/ needs changing.
---

# MonoRail diagrams

MonoRail draws every process and decision diagram the same way. The standard, the tools and the examples live in one repository, `wojoe-444/MonoRail-Diagrams` (private). This skill only gets you there; **it holds no rules of its own**, so there is nothing here to go stale. Follow the repository.

## 1. Find the standard

Use the first that exists:

1. The folder in the environment variable `MONORAIL_DIAGRAMS`.
2. `~/Repos/MonoRail-Diagrams` (MonoRail's usual Repos folder).
3. Clone it there: `gh repo clone wojoe-444/MonoRail-Diagrams ~/Repos/MonoRail-Diagrams`. The repository is private; if the clone is refused, tell the user the diagrams standard is unreachable and ask them to grant access or point you at a checkout. Do not draw from memory.

Then `git -C <folder> pull --ff-only` so you have the current rules. The first time on a machine, run `npm install` in its `tools` folder (needs Node 20 or newer, and Edge or Chrome installed).

## 2. Follow its AGENTS.md

Read `AGENTS.md` at the root of that folder and do what it says, in order: choose the notation, write the brief, build from a template, run the build command, check the result.

## 3. Report

Say which notation you chose and why in one sentence, list any open questions from the brief, and give the paths of the files you wrote.

If the instructions in the repository and this file ever disagree, the repository wins.
