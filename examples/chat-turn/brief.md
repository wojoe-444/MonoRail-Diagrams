# Chat turn

**Question this answers:** what happens to one message the user sends in Chat, from "Send" to the end of the turn?
**Notation:** BPMN (steps, a time limit, an interruption by the user)
**Trigger:** the user sends a message.
**Participants:** MonoRail app (drawn in full); User (black box)
**Outcomes:** Turn finished, Message refused, Turn timed out, Turn stopped.
**Steps (happy path):** 1. Check whether the chat already runs a turn. 2. Run the turn in a worker process.
**Decisions:** "Chat already running a turn?" tests one fact with two outcomes, so it stays in the process.
**Waits and limits:** the turn is limited to 30 minutes (timer boundary event); the user can press Stop at any time while it runs (message boundary event).
**Failures that change the path:** Stop kills the worker's whole process tree before the turn is marked stopped.
**Data that outlives a run:** none drawn (a per-chat lock file keeps one turn per chat; it is not shown as data because the diagram only needs its effect).
**Open questions:**
- Is a message sent while a turn is running refused, or queued? The sources say one turn per chat is kept; this diagram draws it as refused.
- Does the 30 minute limit also kill the process tree? The sources say Stop does; the timeout path here only ends the turn.
**Out of scope:** the content of the turn, approvals (they are denied and shown in the thread), cost booking, the spending limit (see [spending-limit](../spending-limit/brief.md)).

Source of the facts: MonoRail's own description of Chat's sending (one turn per chat, kill the process tree on Stop, 30 minute time-out). Files: [chat-turn.bpmn](chat-turn.bpmn), render [chat-turn.svg](chat-turn.svg).
