# Connection check

**Question this answers:** when does the Connections page check a connection, and when does it run nothing for it?
**Notation:** both. The steps around the decision are BPMN; the rule (trigger, connection added, sign-in started here, in; check or skip, out) is DMN, connected as in [bpmn-vs-dmn.md](../../../../docs/bpmn-vs-dmn.md#the-blend).
**Trigger:** something that can prompt a check happens for one connection: the page opens, Check is pressed on it, Check all is pressed, the window regains focus, or the app starts.
**Participants:** MonoRail app (drawn in full).
**Outcomes:** Connection checked, Connection not checked.
**Steps (happy path):** 1. Decide the check action (a business rule task that asks the decision). 2. Check the connection.
**Decisions:** "Connection check action" has three inputs (connection added, trigger, sign-in started here), so it is extracted to DMN (BL-6). Its two outcomes are "check" and "skip". The table is proven complete and exclusive by the linter.
**Waits and limits:** none.
**Failures that change the path:** none.
**Data that outlives a run:** none drawn.
**Open questions:**
- The source says the window-focus check happens only if a sign-in was started from the page. It does not say whether that applies to one focus event or until the sign-in finishes, so the diagram models only "a sign-in was started here" as a fact.
- The source does not say whether the checks run for several connections at once on page open or Check all; the diagram shows one connection, as the rule is the same for each.
**Out of scope:** what a check does and its results (ok, expired, needs setup, error, unavailable), how the user adds a connection, the sign-in itself.

Source of the facts: the request that described the Connections page. Files: [connection-check.bpmn](connection-check.bpmn) (the process, [render](connection-check.svg)) and [connection-check-action.dmn](connection-check-action.dmn) (the decision, [requirements](connection-check-action.svg) and [table](connection-check-action-table.svg)).
