# Sprint 2 report — Task Reminder v1.0.0

**Date:** 26 Nov 2026 · **Goal:** complete v1 — custom reminders, Done/Snooze actions, missed-reminder catch-up, tray badge and banner, search, Ctrl+Alt+T quick add, export/import, installer.
**Result:** goal met in code and automated tests. 9 of 9 committed stories done (22 points). Together with sprint 1: **17 of 17 v1 stories** (46 points). Real Windows toast buttons and the installer need your check on Windows (see "Requires your Windows PC").

Started at Hani's request before the sprint 1 Windows checklist was run, so the Windows-only checks of both sprints are now combined in `docs/windows-preview-checklist.md`.

## Stories
| Story | Pts | Status | Evidence |
|---|---|---|---|
| US-002 Notes, priority, reminder fields | 3 | Done | E2E "US-002/US-008" (notes + priority saved, long-title notice); unit `sprint2.test.ts` (store limits) |
| US-006 Search | 2 | Done | E2E "US-006" ("/" focus, title+notes, no-results, Esc clears); unit (searchTasks) |
| US-008 Per-task reminder times | 2 | Done | E2E "US-002/US-008" (preset, custom 2 h, remove, No reminder); unit (labels, limits) |
| US-009 Missed reminders after PC off / sleep | 3 | Done* | E2E "US-009" (summary notification + banner, not shown again after restart); unit (catch-up window, missed flag). *Sleep/resume uses Electron `powerMonitor`: manual check |
| US-010 (re-verified) Click opens task with actions | — | Done* | E2E "US-011/US-010"; *real toast click → checklist #5 |
| US-011 Done / Snooze on reminders | 3 | Done* | E2E "US-011/US-010" (toast links snooze 1 h, done, invalid link ignored; in-app bar → tomorrow 09:00); unit (toast XML, link parsing, snooze scheduling). *Real Windows toast buttons → checklist #3–4 |
| US-012 Tray badge + due banner | 2 | Done | E2E "US-012" (badge 2 → 1 after Done, banner); unit (dueTasks) |
| US-014 Ctrl+Alt+T quick add | 2 | Done* | E2E "US-014" (box opens focused, Enter saves + hides, Esc discards). *Global hotkey itself → checklist #7 |
| US-016 Export / import | 2 | Done | E2E "US-016" (export, invalid file rejected with nothing changed, re-import, settings persist); unit (dataTransfer) |
| US-017 Installer + portable exe | 3 | Done* | GitHub Actions `windows` job builds both on `windows-latest`; *install on your PC → checklist #1 |

Deferred: none.

## Test results (local, 26 Nov 2026)
- Type-check and lint: clean.
- Unit (Vitest): **52 passed (52)**; core coverage 99.61% ( 520/522 ) lines, 95.63% ( 241/252 ) branches (as reviewed).
- After review fixes: **56 passed (56)**; 99.63% ( 541/543 ) lines, 95.91% ( 258/269 ) branches; coverage thresholds now enforced in CI.
- End-to-end (Playwright + Electron 45, Xvfb), all 14:
```
  ✓   1 test/e2e/app.spec.ts:66:5 › US-001: add a task with a quick deadline chip; empty title is refused; no deadline goes to Upcoming (1.1s)
  ✓   2 test/e2e/app.spec.ts:93:5 › US-003/US-004: views, grouping, counts and overdue highlighting (535ms)
  ✓   3 test/e2e/app.spec.ts:121:5 › US-005: complete with Space, reopen, edit deadline with autosave, delete and undo (799ms)
  ✓   4 test/e2e/app.spec.ts:150:5 › US-015: tasks survive a restart; a damaged file is restored from backup (1.1s)
  ✓   5 test/e2e/app.spec.ts:170:5 › US-007/US-010: a reminder fires at the deadline and clicking it opens the task (27.6s)
  ✓   6 test/e2e/app.spec.ts:200:5 › US-013: closing the window keeps the app running in the tray (307ms)
  ✓   7 test/e2e/app.spec.ts:209:5 › SR-014: renderer is sandboxed, isolated, has no Node and a CSP (388ms)
  ✓   8 test/e2e/sprint2.spec.ts:56:5 › US-002/US-008: notes, priority and reminder times are edited in the details panel (771ms)
  ✓   9 test/e2e/sprint2.spec.ts:84:5 › US-006: search filters by title and notes, "/" focuses, no-results message (440ms)
  ✓  10 test/e2e/sprint2.spec.ts:98:5 › US-009: reminders missed while the app was closed are shown once as a summary and a banner (2.2s)
  ✓  11 test/e2e/sprint2.spec.ts:119:5 › US-011/US-010: toast buttons and the in-app bar mark done or snooze (430ms)
  ✓  12 test/e2e/sprint2.spec.ts:142:5 › US-012: tray badge and due banner show due and overdue tasks (492ms)
  ✓  13 test/e2e/sprint2.spec.ts:153:5 › US-014: the quick-add box saves with Enter and closes with Esc (551ms)
  ✓  14 test/e2e/sprint2.spec.ts:171:5 › US-016: export and import from Settings; an invalid file changes nothing (849ms)
  14 passed (38.2s)
```
- GitHub Actions on PR #1: Linux job (lint, type-check, unit, E2E) passed; Windows job builds the installer and portable exe — see the PR checks for the final state.

## How to run
- **Install:** `TaskReminder-Setup-1.0.0.exe` from the CI artifact `task-reminder-windows` (or the GitHub release once `v1.0.0` is tagged). Portable: `TaskReminder-Portable-1.0.0.exe`.
- **From source:** `npm ci && npm start`.
- No login (single-user app, D-06).

## Requires your Windows PC
Toast buttons via `taskreminder://` links (D-10), the global hotkey, sleep/resume catch-up, auto-start, and the installer itself. All are in the checklist.

## Decisions and divergences
`docs/implementation-decisions.md` D-10 … D-16: protocol-activated toast buttons (Electron's `actions` are macOS-only), snooze as an extra reminder, definition of "due" (overdue or within 60 min), missed = shown > 2 min late, import replaces the list after confirmation, quick-add as a second small window, tray "Pause reminders for 1 hour".

## Defects found and fixed during the sprint
1. The missed-reminders banner never appeared at start-up: the event was sent before the window was listening. Fixed by also returning the missed ids from `app.info` (caught by E2E US-009).
2. Controlled checkbox in Settings did not toggle under test because state updates after the save round-trip; the test now clicks and waits for the saved file (no product change).

## Documentation updated
README, `docs/user-guide.md`, `docs/admin-guide.md`, `docs/user-manual.docx` (new screenshots: details, search, settings), `docs/api/ipc-contract.md` (new channels and notification links), `docs/implementation-decisions.md`, `docs/windows-preview-checklist.md` (v1.0).

## Next
- Your Windows checklist results.
- Merge PR #1, then tag `v1.0.0` to publish the GitHub release.
- Independent coverage review and the delivery summary (closure).

## Review fixes (after the Implementation Coverage Review)
- G-02 checklist: steps 12–15 added (pause, import, dark mode, log file).
- G-03 dark-mode contrast fixed (dark text on accent/red, 7.4:1 and 6.9:1).
- G-04 failed actions now show a banner and are logged.
- G-05 coverage thresholds in `vitest.config.ts`.
- G-07 local log file (D-18).
- G-08 decisions D-17 to D-20 recorded.
- G-09 `shell.openExternal` removed; G-10 strict toast-link parser; G-13 US-001 test no longer fails after 23:00; G-16 unused `paused` field removed; G-19 branch figure corrected.
- Still open, needs Hani: G-01 run the Windows checklist; G-06 merge, tag v1.0.0 and protect `main`. Accepted for v1.0: G-11, G-12 (DST), G-14, G-15, G-17 (unsigned exe), G-18.
