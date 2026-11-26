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
| D-08 | US-013/US-017 | Sprint-1 preview was a Windows **zip**. From v1.0 the NSIS installer and portable exe are built by the `windows` job on a GitHub `windows-latest` runner. | The dev container has no Wine. |
| D-09 | US-010 | End-to-end tests read shown notifications and simulate a click through a test-only hook (`TASKREMINDER_E2E=1`). Real Windows toasts are checked manually by Hani (`docs/windows-preview-checklist.md`). | Toasts can't be clicked by Playwright. |
| D-10 | US-011 | Toast buttons use Windows toast XML with **protocol activation** (`taskreminder://…`) instead of Electron's `actions` option, which is macOS-only. The installer registers the scheme; the app also registers it on start. Toasts use `scenario="reminder"` so they stay on screen until handled. | Only reliable way to get Done/Snooze buttons on Windows toasts from Electron. |
| D-11 | US-011 | Snooze stores `snoozedUntil` on the task; the scheduler treats it as one extra reminder (key `snooze@<time>`). Changing the deadline or completing the task clears it. | Keeps one scheduler and the existing "never show twice" rule. |
| D-12 | US-012 | "Due" (badge, banner, reminder bar) = open task overdue or due within 60 minutes. The tray badge is a set of pre-rendered icons (1–9, 9+); Windows trays can't draw text. | The BRD/SRS didn't define "due"; this matches the default 1-hour reminder. |
| D-13 | US-009 | A reminder counts as missed when shown > 2 minutes after its time. One missed task → normal reminder (with buttons); several → one "You missed N reminders" summary + banner. `lastCheckedAt` is saved on every check and on quit. | Avoids a toast storm after a weekend off. |
| D-14 | US-016 | Import replaces the whole list (after a confirmation); the replaced list stays as `tasks.bak.json`. No merge. | Simplest correct behaviour for a single-user backup/restore. |
| D-15 | US-014 | The quick-add box is a second small window of the same UI (`index.html#quick`), always on top, hidden on blur/Esc/save. | Reuses the same quick-add component and validation. |
| D-16 | — | Tray menu has "Pause reminders for 1 hour" (SR-010 listed it). Paused reminders are marked as shown, not queued. | Matches "pause" meaning quiet; the badge and banner still show due tasks. |
| D-17 | — | Review fixes (Implementation Coverage Review): links opened from the UI are always denied (no `shell.openExternal`); toast links with user info, a port or a path are rejected; dark mode uses dark text on the accent and red colours. | Smaller attack surface; WCAG AA contrast in dark mode. |
| D-18 | — | A local log `%APPDATA%\TaskReminder\logs\main.log` (rotates at 512 KB to `main.1.log`) records start-up, failed IPC calls and renderer errors. Task titles and notes are never logged. Failed actions in the UI show a banner instead of failing silently. | Planned in the Admin Guide; needed to support Hani if something goes wrong. |
| D-19 | — | Unit coverage is a CI gate: lines/statements/functions ≥ 90 %, branches ≥ 85 %. The Electron main shell (`index.ts`, tray, notifier, ipc) is covered by the 14 end-to-end tests, not by unit coverage. | Keeps the measured core honest without mocking Electron. |
| D-20 | — | Pause is in memory only: restarting the app ends a pause. | A pause is for "the next hour", not across restarts. |
