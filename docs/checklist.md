# Review checklist

The yes/no list used to review a diagram, by a person, by the phase 5 scoring, and as the by-hand check until the linter exists. Each item cites the rule it comes from. Everything should be "yes".

## Both notations

- [ ] I can say in one sentence why this is BPMN, DMN, or both ([bpmn-vs-dmn.md](bpmn-vs-dmn.md)).
- [ ] The files are real `.bpmn` / `.dmn` XML, not only pictures ([versions.md](versions.md)).
- [ ] No colours in the files (BP-17, DM-14).
- [ ] All names follow the patterns (NM-1 to NM-9); all IDs have the right prefix and are readable (NM-10).
- [ ] Files are kebab-case and sit in `docs/diagrams/<process>/` (NM-11, NM-12).
- [ ] No label is longer than 40 characters (NM-9).

## BPMN

- [ ] One process, one start event, at least one end event (BP-1).
- [ ] Only allowed elements (BP-2).
- [ ] No activity or event has two incoming or two outgoing sequence flows (BP-3).
- [ ] Every split that reconverges has a join of the same type (BP-4).
- [ ] Every exclusive gateway is a question; every outgoing flow has an answer; a default is marked where answers are not exhaustive (BP-5, NM-4).
- [ ] No condition on a flow that leaves an activity (BP-6).
- [ ] Message flows only between pools and each is labelled (BP-7).
- [ ] Each distinct outcome has its own named end event (BP-8).
- [ ] Limits are timer boundary events with durations (BP-9).
- [ ] Failures are drawn only where they change the path (BP-10).
- [ ] The view has 15 shapes or fewer (BP-11).
- [ ] Loops use a marker for counted or collection repeats, a gateway only for decided repeats (BP-12).
- [ ] The process documents its purpose and trigger (BP-14).
- [ ] A call that waits for an answer is one task with two message flows (BP-18).
- [ ] Sub-processes have their own start and end events (BP-16).
- [ ] The layout follows LY-1 to LY-10: left to right, straight happy path, no crossing sequence flows, standard sizes. (`build` applies it; look at the render to confirm.)

## Blend

- [ ] Every decision that should be extracted was extracted (BL-6 to BL-10), and none that should stay was.
- [ ] A business rule task references its decision as `<file>.dmn#<decisionId>` and the reference resolves (BL-1).
- [ ] An exclusive gateway follows it, with one flow per output value spelled as in the table (BL-2).
- [ ] The process does not restate the rules and the decision does not mention tasks or order (BL-3, BL-4).
- [ ] A request that is only a mapping from facts to an answer produced a `.dmn` and no process (BL-11).

## DMN

- [ ] One diagram per file with one main decision (DM-1).
- [ ] Only allowed elements; each decision is a table or one-line expression (DM-2, DM-3).
- [ ] Every input and output is typed; enumerations list their allowed values (DM-4).
- [ ] Hit policy follows DM-5, and the table is complete (DM-6).
- [ ] Inputs are plain names; the table has at most 5 inputs and 12 rows (DM-7, DM-10).
- [ ] Entries stay within the FEEL subset (DM-8).
- [ ] Every decision says what it answers (DM-12).
- [ ] Nothing describes order or side effects (DM-13).
- [ ] The layout follows LY-11 and LY-12.

## See also

[bpmn-profile.md](bpmn-profile.md), [dmn-profile.md](dmn-profile.md), [naming.md](naming.md), [layout.md](layout.md) and [process-to-diagram.md](process-to-diagram.md), where this list is step 7.
