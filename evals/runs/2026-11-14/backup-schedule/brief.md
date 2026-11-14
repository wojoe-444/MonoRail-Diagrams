# Backup schedule

**Question this answers:** how does a scheduler check turn into a global backup, and what happens when the backup fails?
**Notation:** BPMN (steps in order, a wait of 15 minutes, a retry loop; the due check tests one fact with two outcomes, so it stays in the process)
**Trigger:** the scheduler's check, which runs once when the app starts and then every minute while it runs.
**Participants:** MonoRail app (drawn in full)
**Outcomes:** Backup completed, No backup needed.
**Steps (happy path):** 1. Check backup schedule. 2. Write .partial file. 3. Verify backup. 4. Rename .partial file. 5. Remove older backups (only the newest N are kept).
**Decisions:** "Backup due or missed?" (one fact, two outcomes, stays in the process; a backup missed while the app was closed counts as due, so it runs once at the startup check). "Backup verified?" (one fact, two outcomes, stays in the process).
**Waits and limits:** after a failure the backup is retried after 15 minutes (timer event).
**Failures that change the path:** a backup that does not verify waits 15 minutes and goes back to the check.
**Data that outlives a run:** none drawn.
**Open questions:**
- The source says "retried after 15 minutes". The diagram sends the retry back through the schedule check (a merge gateway before "Check backup schedule"), so the backup runs again only if the check still finds it due. Does the retry instead skip the check and write the backup straight away?
- Only a failed verification is drawn as a failure. Does a failure while writing or renaming the .partial file also lead to the 15 minute retry? Is the leftover .partial file deleted?
- The start event stands for both the startup check and the every-minute check (a diagram has one start); the two triggers are named in the process documentation, not as two start events.
- Several items (GitHub+ repos, Jira+ projects, Flashcards) each have their own backup. One backup is drawn; whether they run one after another in a single check is not drawn.
- What does "due" depend on (time since the last successful backup against the chosen frequency)? Not drawn; the gateway only shows the outcome.
**Out of scope:** the global folder and frequency settings, "Back up before updating", pruning details beyond "newest N kept", what a backup contains.

Source of the facts: the request's own description of MonoRail's global backups. Files: [backup-schedule.bpmn](backup-schedule.bpmn), render [backup-schedule.svg](backup-schedule.svg).
