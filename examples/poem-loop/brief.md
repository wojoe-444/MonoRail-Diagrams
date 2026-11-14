# Poem loop

**Question this answers:** how does a script improve a writing prompt with three separate agents?
**Notation:** BPMN (steps in order, three rounds, messages to another program)
**Trigger:** the script is started.
**Participants:** Python script (drawn in full); Codex CLI (black box)
**Outcomes:** Prompt improved, after three rounds.
**Steps (happy path):** 1. Write poem. 2. Grade poem. 3. Revise prompt. Repeat for three rounds.
**Decisions:** none. The round count is fixed, so it is a loop marker, not a gateway.
**Waits and limits:** none drawn.
**Failures that change the path:** none.
**Data that outlives a run:** the writer prompt, which the reviser overwrites each round (data store).
**Open questions:** none.
**Out of scope:** the content of the prompts.

Source of the process: [poem_loop.py](poem_loop.py). Files: [poem-loop.bpmn](poem-loop.bpmn), render [poem-loop.svg](poem-loop.svg).
