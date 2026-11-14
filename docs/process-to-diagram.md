# From a described process to a diagram

The procedure to follow when someone describes a process or a decision and asks for a diagram. It is the same for people and agents. The point is that the thinking is done in plain words first, in a fixed shape (the **brief**), and the diagram is then built from the brief. Two agents that fill in the same brief the same way draw the same diagram.

## The steps

1. **Choose the notation.** Apply the three questions in [bpmn-vs-dmn.md](bpmn-vs-dmn.md). Outcome: BPMN, DMN, both, or "not a process or decision diagram". If it is none of these, say so and stop.
2. **Gather the facts.** Read the source the process comes from (the app's docs, the code, or the person's description). Do not invent steps. Where the source is silent, write the gap into the brief as a question instead of filling it with a guess.
3. **Write the brief** (template below). Keep it short. Show it with the diagram.
4. **Set the level.** One diagram answers one question. If the brief has more than about 15 shapes of steps, decide now which part becomes a sub-process or a call activity ([BP-11](bpmn-profile.md)).
5. **Build the model** with only the allowed elements ([bpmn-profile.md](bpmn-profile.md), [dmn-profile.md](dmn-profile.md)), named and identified as in [naming.md](naming.md). Start from a [template](../templates/) and write **only the semantic part**: elements and flows, no `<bpmndi:...>` coordinates. Write the happy path first, so that at every split its flow is the first one in the file; then add branches, failures and loops.
6. **Pull out decisions.** For each gateway in the brief, apply the extraction rules ([BL-6 to BL-10](bpmn-vs-dmn.md#when-to-pull-a-decision-out-of-a-gateway)). Extract to a `.dmn` file where they say so, and connect it the one sanctioned way.
7. **Check and render.** From the `tools` folder of this repository (after `npm install` once), run `node diagrams.mjs build <your diagram folder>`. It lints first and changes nothing if there is an error; otherwise it adds the layout to your files and writes the `.svg` renders. Fix every error, explain any warning you keep, then look at the renders and go through [checklist.md](checklist.md). Add `--png` to also get a picture you can open. Details: [tools/README.md](../tools/README.md).
8. **Save** in the app's repo under `docs/diagrams/<process>/` ([NM-12](naming.md)): the `.bpmn`, each `.dmn`, the rendered `.svg` of each (a decision gives two: the requirements diagram and its table), and `brief.md`. The [examples](../examples/) show the result.
9. **Report** in the reply: which notation you chose and why in one sentence, the open questions from the brief, and the paths of the files.

## The brief

```markdown
# <Process or decision name>

**Question this answers:** one sentence.
**Notation:** BPMN | DMN | both  (why, one sentence)
**Trigger:** what starts it.
**Participants:** who or what acts or is talked to. Mark the one we draw in full.
**Outcomes:** every distinct way it can end, as past-participle states.
**Steps (happy path):** numbered, verb + object.
**Decisions:** for each: the question, the facts it uses, its possible outcomes,
                and whether it is extracted (BL-6 to BL-10) or stays in the process.
**Waits and limits:** timeouts, waits for a person or a system, with durations.
**Failures that change the path:** only those.
**Data that outlives a run:** only that which matters to the flow.
**Open questions:** anything the source did not say.
**Out of scope:** what this diagram deliberately leaves out.
```

## Example brief: the poem loop

```markdown
# Poem loop

**Question this answers:** how does a script improve a writing prompt with three separate agents?
**Notation:** BPMN (steps in order, three rounds, messages to another program)
**Trigger:** the script is started.
**Participants:** Python script (drawn in full); Codex CLI (black box)
**Outcomes:** Prompt improved after three rounds.
**Steps (happy path):** 1. Write poem. 2. Grade poem. 3. Revise prompt. Repeat for three rounds.
**Decisions:** none. The round count is fixed, so it is a loop marker, not a gateway.
**Waits and limits:** none drawn.
**Failures that change the path:** none.
**Data that outlives a run:** the writer prompt, which the reviser overwrites each round (data store).
**Open questions:** none.
**Out of scope:** the content of the prompts.
```

The real files are in [examples/poem-loop](../examples/poem-loop/brief.md).

## When the source is unclear

Ask a question in the brief rather than choosing silently. A diagram built on a guess looks authoritative and is the hardest kind to catch later.

## See also

[bpmn-vs-dmn.md](bpmn-vs-dmn.md) for step 1, [naming.md](naming.md) and [layout.md](layout.md) for step 5, [checklist.md](checklist.md) for step 7, and [symbol-reference.md](symbol-reference.md) when you need to know what a shape means.
