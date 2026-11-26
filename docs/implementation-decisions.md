# Implementation decisions

Divergences from, or clarifications of, the LLD. Each names the story it came from.

| ID | Story | Decision | Why |
|---|---|---|---|
| D-01 | US-015 | Deadlines are stored as UTC ISO strings (`toISOString()`), displayed in local time. The LLD said "local with offset". | Unambiguous and sortable; the UI converts to local time everywhere. No contract impact. |
| D-02 | US-001 | After 17:00 the "Today 17:00" chip becomes "In 1 hour" (rounded up to 5 minutes); the third chip is "Next Mon 9:00". | A chip must never create an already-overdue task. |
| D-03 | US-007 | A reminder whose time was already past when the task was created is skipped (e.g. a task due in 30 minutes only gets the "at deadline" reminder). Editing a task never replays reminders that were already behind "now". | Avoids a burst of stale "1 hour before" toasts the moment a task is added or edited. |
| D-04 | US-007 | More than 3 reminders due at the same moment collapse into one "N tasks need attention" notification. | Avoids a toast storm; the full missed-reminders summary is US-009 (sprint 2). |
| D-05 | — | No OpenAPI spec: the app has no HTTP API. The IPC contract is documented in `docs/api/ipc-contract.md`. | The orchestrator's docs set assumes a web API. |
| D-06 | — | No seeded admin account, no `CREDENTIALS.md`, no health endpoint. | Single-user desktop app with no login (A-03, BR-006). The "app is running" check is the tray icon; E2E tests verify start-up. |
| D-07 | US-005 | Details panel in sprint 1 has title, deadline, done/reopen and delete. Notes, priority and reminder times are edited in sprint 2 (US-002 moved to sprint 2 during planning). | Sprint load balancing in the Sprint Plan. Data model already contains these fields. |
| D-08 | US-013/US-017 | Sprint-1 preview is a Windows **zip** (`Task Reminder.exe` inside). NSIS installer and portable exe need Wine on Linux, so they will be built on a Windows CI runner in sprint 2. | Container has no Wine. |
| D-09 | US-010 | End-to-end tests read shown notifications and simulate a click through a test-only hook (`TASKREMINDER_E2E=1`). Real Windows toasts are checked manually by Hani (`docs/windows-preview-checklist.md`). | Toasts can't be clicked by Playwright. |
