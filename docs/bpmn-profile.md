# BPMN profile

BPMN 2.0 has far more shapes than a MonoRail diagram needs. This page is the subset we allow and the rules for using it. Two agents given the same process and the same vocabulary draw much the same diagram; that is the point. Versions: [versions.md](versions.md). Deciding whether you need BPMN at all: [bpmn-vs-dmn.md](bpmn-vs-dmn.md).

These diagrams are **documentation**, not executable models. We draw what happens so people and agents agree on it. No engine runs them, so flows carry labels rather than executable conditions.

## Allowed elements

Each row is explained, with the shape described, in [symbol-reference.md](symbol-reference.md).

| Group | Allowed | Not allowed (for now) |
| --- | --- | --- |
| Participants | Pool (a process we draw), black-box pool (a participant we only exchange messages with), lane | Nested pools, pools within lanes |
| Start events | None, message, timer | Signal, conditional, multiple |
| End events | None, message, error, terminate | Signal, escalation, compensation, cancel |
| Intermediate events | Message (catch and throw), timer (catch) | Signal, link, conditional, escalation, compensation |
| Boundary events | Timer, error, message (interrupting or not) on an activity | Signal, conditional, escalation, compensation, cancel |
| Activities | Task, user task, service task, business rule task, send task, receive task, manual task | Script task |
| Sub-processes | Embedded sub-process, call activity | Event sub-process, transaction, ad-hoc |
| Activity markers | Standard loop, parallel multi-instance, sequential multi-instance | Compensation marker |
| Gateways | Exclusive, parallel, event-based | Inclusive (see BP-4), complex |
| Flows | Sequence flow, default flow, message flow | Conditional sequence flow out of an activity |
| Data | Data object, data store, data association | Data input and output sets, collections |
| Artifacts | Text annotation (with association), group | Custom artifacts |

Adding an element to the profile is a change to this standard: edit this table, [symbol-reference.md](symbol-reference.md) and the profile lint together.

## Rules

- **BP-1. One process per file; one start; at least one end.** A file holds one process (plus the pools it talks to). It has a single start event and one or more end events. Why: a reader finds the beginning without searching.
- **BP-2. Only the allowed elements.** Anything outside the table above is reported by the linter. Why: a bounded vocabulary is what makes diagrams comparable.
- **BP-3. No implicit splits or joins.** An activity or event has at most one incoming and one outgoing sequence flow. To split or join, use a gateway. Why: implicit splits are read differently by different people.
- **BP-4. Pair your gateways.** A split gateway that reconverges is closed by a join of the same type. Branches that never rejoin each end in their own end event. Use an inclusive gateway only when more than one branch can really run at once and a parallel gateway would be wrong; then it still needs its join.
- **BP-5. Label exclusive gateways' flows with the answers.** The gateway is named as a question ([naming.md](naming.md)); every outgoing flow carries an answer. When the answers are not exhaustive, mark one outgoing flow as the default.
- **BP-6. No conditions on flows leaving activities.** If the path depends on something, put a gateway after the activity. Why: a condition on an activity's exit hides the decision.
- **BP-7. Message flows cross pools.** They run between different pools, never within one. Each message flow is labelled with what is sent.
- **BP-8. End events name outcomes.** Each distinct outcome gets its own end event ("Poem revised", "Turn refused"). A generic "End" is allowed only when there is exactly one outcome.
- **BP-9. Draw limits as timer boundary events.** A timeout or deadline sits on the activity it limits, with the duration in its label ("30 min").
- **BP-10. Draw a failure only when it changes what happens next.** Failures that just stop the process are covered by an end event named for the result. Failures with their own path (a retry, a hold, a fallback) are boundary events.
- **BP-11. A view holds at most 15 shapes.** Count tasks, events, gateways, data and pools; do not count labels or annotations. Beyond 15, collapse a part into an embedded sub-process, or a call activity when another process reuses it. Why: past this size nobody checks the diagram.
- **BP-12. Loops.** Use a loop or multi-instance marker when the same steps repeat over a count or a collection. Draw a loop-back flow through a gateway only when the repeat depends on a decision. The three rounds in the poem loop are a marker.
- **BP-13. Show data only when it explains the flow.** A data store for a value that survives between runs or rounds; a data object for a value that decides who can proceed or what happens next. Skip the rest.
- **BP-14. Every process says what it is for.** The process carries `documentation` with one sentence for its purpose and one for its trigger.
- **BP-15. Business rule tasks follow the blend rules.** They reference a decision and are followed by a gateway, as in [bpmn-vs-dmn.md](bpmn-vs-dmn.md#the-blend) (BL-1, BL-2).
- **BP-16. Sub-processes have their own start and end.** An embedded sub-process contains a start event and at least one end event.
- **BP-17. No colour.** No fill or stroke colours in the file. Colour never carries meaning here. (An explainer may colour things to teach; the diagram files do not.)

## Participants in a MonoRail process

- Your own app or the part of it you are drawing is the **pool** (white box): "MonoRail app", "Chat worker".
- Anything you only talk to is a **black-box pool**: "Codex CLI", "GitHub", "User's browser". Do not draw its insides.
- Use **lanes** only when two or more roles inside one pool hand work to each other (for example the renderer and the main process).
- A person is a participant when they act or decide (a user task in a pool or lane named "User").

## What BPMN does not capture

BPMN shows flow. It does not show screens, class structure or timing numbers beyond a timer's label. Put that information in the process's documentation or a linked page, not in the diagram. Rules for the decisions inside a process: [dmn-profile.md](dmn-profile.md).

See also [layout.md](layout.md), [naming.md](naming.md) and [checklist.md](checklist.md). The steps to follow are in [process-to-diagram.md](process-to-diagram.md).
