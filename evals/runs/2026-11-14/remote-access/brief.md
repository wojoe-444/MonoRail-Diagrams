# Remote access request check

**Question this answers:** does the Remote access server serve a request that comes from a phone, or refuse it?
**Notation:** DMN (facts about the request go in, serve or refuse comes out; no order, waiting or side effects are described).
**Trigger:** a request reaches the Remote access server (it listens on 127.0.0.1 only).
**Participants:** none drawn; the decision only has inputs.
**Outcomes:** serve, refuse.
**Steps (happy path):** none; this is a decision, not a process.
**Decisions:** "Remote request action" has four inputs (host accepted, login allowed, pairing path, paired device cookie), so it is extracted to a table (BL-6). A request is served only when the host is the tailnet name or loopback, the login is in the allowed logins list, and either the request is for the pairing path or it carries a paired device's cookie. Everything else is refused.
**Waits and limits:** none drawn.
**Failures that change the path:** none.
**Data that outlives a run:** none drawn (the allowed logins and the paired devices are inputs).
**Open questions:**
- The source gives the conditions but not the order the server tests them in, and does not say whether a refusal differs by reason (for example the status code). The table has one output, "refuse", and no process is drawn.
- "All of these hold" is read to mean the host and login checks also apply to the pairing path; the pairing path is exempt only from the cookie.
**Out of scope:** how pairing codes are issued and expire, how a device is paired, and what a served request then does.
