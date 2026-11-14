# Coordinator sends a message to another chat

**Question this answers:** what happens when the Coordinator calls `send_to_chat`, and when is the message refused?
**Notation:** both. BPMN for the steps and the child turn that stops when the Coordinator's turn ends; DMN for the refusal rule, because it maps three facts to one answer (BL-6, BL-7).
**Trigger:** the Coordinator calls `send_to_chat` for a target chat.
**Participants:** MonoRail app (drawn in full); Coordinator turn (black box: sends the request, and its end stops the child turn).
**Outcomes:** Child turn finished, Send refused, Child turn stopped.
**Steps (happy path):** 1. Check target chat (decision Send action). 2. Run child turn. The send is refused when any of the three facts below is true.
**Decisions:** "Send action" ([send-action.dmn](send-action.dmn), extracted): inputs are "Target is a Coordinator chat", "Log changed in the last minute" and "Chat already running a turn" (the per-chat lock file); output is allow or refuse. Any true input refuses; the table is unique and complete without ordering the checks.
**Waits and limits:** the child turn runs until it finishes or the Coordinator's own turn ends. No duration is drawn.
**Failures that change the path:** the Coordinator's turn ending stops the child turn (interrupting message boundary event).
**Data that outlives a run:** the lock file per chat (`turn-locks/`); not drawn, only its effect (the "Chat already running a turn" input).
**Open questions:**
- The child turn runs "through Chat's normal start-turn checks" (allowed folders, Ask or Agent mode). The source does not say what happens to the message when one of those checks refuses it, so that path is not drawn; it is noted on the "Run child turn" task.
- The source does not say whether the refusal reason is shown to the Coordinator, so the process has one "Send refused" end and the reasons live in the table's annotations.
- Does "Coordinator turn ended" include a Stop by the user? Drawn as one event, because the source only says the child turn stops when the Coordinator's turn ends.
**Out of scope:** how the reply is read back (`wait_for_reply`), the spending limit, approvals, cost booking.

Source of the facts: the request text describing MonoRail's Coordinator (`send_to_chat`, lock file per chat, child turns through Chat's `startTurn`). Files: [send-to-chat.bpmn](send-to-chat.bpmn), render [send-to-chat.svg](send-to-chat.svg); [send-action.dmn](send-action.dmn), renders [send-action.svg](send-action.svg) and [send-action-table.svg](send-action-table.svg).
