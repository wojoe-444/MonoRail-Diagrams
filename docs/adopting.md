# Adopting the standard in an app

How a MonoRail app, or the agents working in it, get pointed at this repository. Two small pieces, and both only point: all the rules stay here, so they are changed in one place. What an agent then does is in [AGENTS.md](../AGENTS.md).

## 1. A pointer in the app's agent instructions

Add this section to the app's `CLAUDE.md` (or `AGENTS.md`):

```markdown
## Diagrams

Process and decision diagrams follow the MonoRail diagrams standard (BPMN 2.0 and DMN),
repository `wojoe-444/MonoRail-Diagrams` (private; usually checked out at `~/Repos/MonoRail-Diagrams`).
Before drawing or changing one, read its `AGENTS.md`. Diagrams live in `docs/diagrams/<process>/`.
```

That is the whole pointer: where the standard is, what to read first, where the output goes. It is short on purpose, because agents read it every time.

## 2. The skill (optional, for Claude Code)

[skill/SKILL.md](../skill/SKILL.md) is a Claude Code skill that triggers when someone asks for a diagram or a flow, finds or clones this repository, and hands over to `AGENTS.md`. To install it for one person, copy the `skill` folder to `~/.claude/skills/monorail-diagrams/`. To ship it with an app, copy it to `<app>/.claude/skills/monorail-diagrams/`.

## Choose a theme (optional)

Diagrams render in the `plain` theme unless the project says otherwise. To use another, put `diagrams.config.json` next to the diagrams (or at the repository root):

```json
{ "theme": "cards" }
```

Themes are `plain`, `cards` and `dusk`; what they change, and what they may never change, is in [themes.md](themes.md). One project, one theme.

## Access

This repository is private. An agent that cannot clone it must say so and ask, never draw from memory: a diagram made without the standard is the kind this repository exists to prevent. If agents on other machines need it routinely, revisit the visibility decision in [PLAN.md](../PLAN.md).

## Where the output goes

In the app's repository: `docs/diagrams/<process>/` holding the `.bpmn`, any `.dmn`, the renders and `brief.md` ([NM-12](naming.md)). The [examples](../examples/README.md) show a finished folder. One thing to know in the MonoRail repository itself: its wiki bundles every `docs/**/*.md`, and its docs test requires each page to start with an `audience:` front-matter tag and to be linked from somewhere. A `brief.md` placed there needs `audience: human, ai` at the top and a link from a folder index (a `README.md` in `docs/diagrams/` listing each diagram set does both jobs). The standard does not require this because other apps may not have such a test; check the target repository's own documentation rules before adding the first diagram.

## Checking that it works

[evals/](../evals/README.md) holds the test set: real MonoRail processes written as plain requests, a scorer, and a recorded run of agents given only the pointer above.
