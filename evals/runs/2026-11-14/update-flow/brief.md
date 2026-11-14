# Update flow

**Question this answers:** how does MonoRail find a new version of itself, offer it, and install it, including the backup before the installer runs?
**Notation:** both (a process over time with a wait for the user and a hold on failure; one mapping from two settings to "back up or skip", pulled out per BL-6)
**Trigger:** 30 seconds after startup, then every 4 hours, the app checks GitHub releases.
**Participants:** MonoRail app (drawn in full); User (black box); GitHub (black box, only in the apply-update diagram)
**Outcomes:** No update found; Update ignored for six hours; Pop-up hidden until next check; Update installed (app restarted).
**Steps (happy path):** 1. Check GitHub releases. 2. Show update pop-up. 3. (User clicks Download and Restart) Download update. 4. Check backup requirement. 5. Back up global items. 6. Run installer; the app restarts.
**Decisions:**
- "Update available?" tests one fact with two outcomes, so it stays in the process.
- "Download and Restart chosen?" and "Ignore for six hours chosen?" read the one choice the user made in the pop-up (two clicks of one choice, drawn as two yes/no questions so each gateway has two outcomes). They are not rules, so they stay in the process.
- "Backup needed?" routes on the decision *Backup requirement* ([backup-requirement.dmn](backup-requirement.dmn)): inputs Backup folder set, Back up before updating; outputs backup, skip. Extracted because it reads two facts (BL-6).
- "Backup succeeded?" and "Try backup again?" test one fact with two outcomes, so they stay in the process.
**Waits and limits:** 30 seconds after startup, then every 4 hours (timer start event); the update waits for the user's choice in the pop-up; after a failed backup the update is held until the user chooses Try again or Update without a backup.
**Failures that change the path:** a failed backup holds the update and offers Try again (back up again) or Update without a backup (go straight to the installer).
**Data that outlives a run:** the six-hour snooze time (kept by the app); not drawn, the diagram only needs its effect.
**Open questions:**
- Does the snooze stop the next 4-hourly check, or only hide the pop-up? The source says only "Ignore for six hours"; drawn as ending the run.
- When a backup folder is set but "Back up before updating" is off, no backup is taken (drawn as `skip`); the source states the on case only.
- If the download fails, what happens? The source is silent; not drawn.
- Can the user leave a held update without choosing? The source names two choices only; not drawn.
- The first check runs 30 s after startup, but "Ignore for six hours" and the X are described separately from the check schedule; the hidden-until-next-check state is drawn as ending the run.
**Out of scope:** the "What's new" list, the before-update folder's "newest 5 each" pruning, which items count as global, the installer's own screens, and update-ready state kept between app starts.

Files: [update-flow.bpmn](update-flow.bpmn) (render [update-flow.svg](update-flow.svg)), [apply-update.bpmn](apply-update.bpmn) (render [apply-update.svg](apply-update.svg), called from the first by the call activity "Apply update"), [backup-requirement.dmn](backup-requirement.dmn) (renders [backup-requirement.svg](backup-requirement.svg), [backup-requirement-table.svg](backup-requirement-table.svg)).

Layout note: in update-flow the "No" exit of "Update available?" is the straight line and the update path drops below it, because the message flows from the pop-up to the User pool would otherwise cross the "No update found" end event (LY-5 over LY-2).
