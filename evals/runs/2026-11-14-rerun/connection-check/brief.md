# Connection check

**Question this answers:** when does the Connections page check a connection?
**Notation:** DMN alone. The request is only facts in (is it added, what happened, was a sign-in started here) and an answer out (check or skip), with no steps, waits or messages, so no process wraps it (BL-11).
**Trigger:** an event on the Connections page or in the app: the page opens, Check, Check all, the window regains focus, the app starts.
**Participants:** Connections page (the decision is asked once per connection).
**Outcomes:** check, skip.
**Steps (happy path):** none (decision only).
**Decisions:** "Connection check action" has three inputs (connection added, trigger, sign-in started here) and two outcomes, so it is a DMN table (BL-6).
**Waits and limits:** none.
**Failures that change the path:** none.
**Data that outlives a run:** none drawn.
**Open questions:**
- How long "a sign-in was started from that page" stays true (until the next check, until the sign-in ends, or for a time) was not stated, so the table takes it as a plain fact.
- Whether Check can be pressed on a connection that is not added was not stated. The table skips it either way.
**Out of scope:** what a check does, its result states, and the sign-in itself.

Files: [connection-check-action.dmn](connection-check-action.dmn) ([requirements](connection-check-action.svg) and [table](connection-check-action-table.svg)).
