# Naming

Names are where two agents most often drift apart, so they are rules here. A name is what a person reads on the diagram; an ID is what other files and tools refer to. Both are covered. Used by [bpmn-profile.md](bpmn-profile.md) and [dmn-profile.md](dmn-profile.md); checked in [checklist.md](checklist.md).

## Names on the diagram

- **NM-1. Plain sentence case.** Plain English, MonoRail's own terms as the app uses them (Chat, Ask mode, Agent mode, Settings), no abbreviations beyond ones the app already shows. Use one word for one thing everywhere. Why: a reader should recognise the name from the app.
- **NM-2. Tasks: verb + object.** "Write poem", "Check spending limit", "Back up data". One action per task: if a name needs "and", it is two tasks.
- **NM-3. Events name a state.**

  | Event | Pattern | Examples |
  | --- | --- | --- |
  | Start | What triggered it, past tense | "Turn requested", "Update available" |
  | Intermediate | The thing awaited or sent | "Reply received", "30 min passed" |
  | End | The result, past participle | "Poem revised", "Turn refused", "Update held" |
- **NM-4. Exclusive gateways ask; their flows answer.** The gateway is a question ending in "?" ("Limit reached?"). Each outgoing flow is labelled with an answer: "Yes" and "No", or, after a business rule task, the decision's output values spelled exactly as in the table ([BL-2](bpmn-vs-dmn.md#the-blend)). Parallel gateways carry no name.
- **NM-5. Pools and lanes name participants.** A pool is the participant's name ("MonoRail app", "Codex CLI"). A lane is a role ("User", "Main process").
- **NM-6. Message flows name the content.** A noun phrase for what is sent: "Poem", "Spending decision". Never a verb.
- **NM-7. Data is a noun.** "Writer prompt", "Poem".
- **NM-8. Decisions name the answer.** A noun phrase: "Spending limit action". No verbs, no "Check" or "Determine". Inputs are nouns too ("Share spent"). Output values are short lowercase words matching the app's own terms ("allow", "warn", "stop").
- **NM-9. Labels stay short.** At most 40 characters including spaces. Anything longer goes in `documentation`.

## IDs in the files

**NM-10. IDs are readable and stable.** Use camelCase with a prefix that says what the thing is. Never let a tool renumber them: other files, the linter and humans refer to them.

| Thing | Prefix | Example |
| --- | --- | --- |
| Process | `proc_` | `proc_startTurn` |
| Pool or participant | `pool_` | `pool_app`, `pool_codex` |
| Lane | `lane_` | `lane_user` |
| Task (any type) | `task_` | `task_writePoem` |
| Sub-process or call activity | `sub_` | `sub_round` |
| Event | `evt_` | `evt_turnRequested`, `evt_poemRevised` |
| Boundary event | `bnd_` | `bnd_timeout` |
| Gateway | `gw_` | `gw_limitReached` |
| Sequence flow | `flow_` + from + `_to_` + to | `flow_writePoem_to_gradePoem` |
| Message flow | `msg_` | `msg_poem` |
| Data object, data store | `data_` | `data_writerPrompt` |
| Decision | `dec_` | `dec_spendingLimitAction` |
| Decision input | `in_` | `in_shareSpent` |
| Business knowledge model | `bkm_` | `bkm_roundToStep` |

## Files and folders

- **NM-11. Kebab-case files.** A process is `<process>.bpmn`; a decision is `<decision>.dmn`, named after the decision. A process and the decisions it calls sit in the same folder.
- **NM-12. One folder per diagram set.** In the app's repo: `docs/diagrams/<process>/`, holding the `.bpmn`, its `.dmn` files, and the rendered `.svg` of each. [process-to-diagram.md](process-to-diagram.md) says what else goes in.

## See also

[layout.md](layout.md) for where labels sit, and [symbol-reference.md](symbol-reference.md) for what each shape is called.
