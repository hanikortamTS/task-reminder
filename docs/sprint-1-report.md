# Sprint 1 report — Task Reminder v0.9.0 (preview)

**Date:** 26 Nov 2026 · **Goal:** core usable app — add and view tasks, safe storage, default reminders that open the task, tray + start with Windows.
**Result:** goal met in code and automated tests. 8 of 8 committed stories done (24 points). Windows-only behaviour (real toasts, auto-start) still needs your check on a real PC — see "Requires your Windows PC".

## Stories
| Story | Pts | Status | Evidence |
|---|---|---|---|
| US-001 Quick add | 3 | Done | E2E "US-001" (AC1–AC3); unit `dates.test.ts` (chips), `taskStore.test.ts` (empty title, no deadline) |
| US-003 Today / Upcoming / Done views | 3 | Done | E2E "US-003/US-004"; unit `selectors.test.ts` (grouping, sort, empty, counts) |
| US-004 Overdue highlighting | 2 | Done | E2E "US-003/US-004" (red row, "Overdue by 2 h", completed moves to Done) |
| US-005 Edit, complete, reopen, delete + undo | 3 | Done | E2E "US-005" (Space, Reopen, autosave deadline, Delete → Undo) |
| US-007 Default reminders (1 h before + at deadline) | 5 | Done | Unit `scheduler.test.ts` fake clock (AC1–AC3, timing, edits, long waits); E2E "US-007/US-010" real timer fired within 30 s |
| US-010 Click reminder opens task | 2 | Done* | E2E via test hook (D-09); *real Windows toast click → manual check #4 |
| US-013 Tray, close-to-tray, start with Windows | 3 | Done* | E2E "US-013" (close keeps app running); *auto-start and Quit → manual checks #7–8 |
| US-015 Local storage + backup | 3 | Done | E2E "US-015" (restart, corrupt file → backup); unit `taskStore.test.ts` (atomic write, backup, corrupt handling) |

Deferred: none. US-002 had already moved to sprint 2 during planning (Sprint Plan).

## Test results (from a clean `npm ci`, 26 Nov 2026)
- Type-check: clean. Lint: clean.
- Unit (Vitest): **38 passed (38)** · coverage of `src/core` + scheduler service: 99.02% ( 407/411 ) lines, 94.11% ( 160/170 ) branches (target ≥ 90 %).
- End-to-end (Playwright + Electron 45 under xvfb):
```
  ✓  1 test/e2e/app.spec.ts:62:5 › US-001: add a task with a quick deadline chip; empty title is refused; no deadline goes to Upcoming (938ms)
  ✓  2 test/e2e/app.spec.ts:89:5 › US-003/US-004: views, grouping, counts and overdue highlighting (536ms)
  ✓  3 test/e2e/app.spec.ts:117:5 › US-005: complete with Space, reopen, edit deadline with autosave, delete and undo (796ms)
  ✓  4 test/e2e/app.spec.ts:146:5 › US-015: tasks survive a restart; a damaged file is restored from backup (1.2s)
  ✓  5 test/e2e/app.spec.ts:166:5 › US-007/US-010: a reminder fires at the deadline and clicking it opens the task (49.7s)
  ✓  6 test/e2e/app.spec.ts:196:5 › US-013: closing the window keeps the app running in the tray (305ms)
  ✓  7 test/e2e/app.spec.ts:205:5 › SR-014: renderer is sandboxed, isolated, has no Node and a CSP (364ms)
  7 passed (54.4s)
```
- Not run here: no-network monitoring (TC for US-015 AC3). Supported by design: no network code, CSP `connect-src 'none'`.

## How to run
- **Your PC:** unzip `Task Reminder-0.9.0-win.zip` (SHA-256 `7d60f709b249a2579a93eea48cfd2b3b03dff95767ad520ef072642f23cfc686`), run `Task Reminder.exe`. Then go through `docs/windows-preview-checklist.md`.
- **From source:** `npm ci && npm start` (as root in a Linux container: `npm run build && npx electron --no-sandbox .`).
- No login: single-user app, so there is no admin account or credentials file (D-06). "Health check" = the app starts, tray icon appears; verified by the E2E suite starting the app 9 times.

## Requires your Windows PC
- Real Windows toast appearance, sound and click (US-007, US-010). Risk R-07: an unzipped app without a Start-menu shortcut can have toasts suppressed on some Windows builds. If that happens, the sprint 2 installer adds the shortcut, and the tray badge/banner fallback (US-012) covers it.
- Auto-start after reboot and tray Quit (US-013).

## Decisions and divergences
See `docs/implementation-decisions.md` (D-01 … D-09). Most relevant: UTC storage of deadlines (D-01), "In 1 hour" chip after 17:00 (D-02), no replay of stale reminders when adding or editing (D-03), zip instead of installer for the preview (D-08).

## Defects found and fixed during the sprint
1. Scheduler replayed an already-passed "1 hour before" reminder when a task's deadline was moved closer (caught by a unit test). Fixed by separating "re-plan after change" from "timer fired".
2. "Overdue" heading rendered as a red-bordered box (CSS class clash with the Delete button). Fixed.
3. E2E clean-up raced with Electron still writing its profile; tests now wait for the process to exit.

## Documentation updated
README, `docs/user-guide.md`, `docs/admin-guide.md`, `docs/user-manual.docx` (with screenshots), `docs/api/ipc-contract.md` (IPC contract instead of OpenAPI, D-05), `docs/implementation-decisions.md`, `docs/windows-preview-checklist.md`.

## Next sprint needs
- Your results from the Windows checklist (especially toasts).
- A GitHub repository: this session can't create new repositories, so the code is delivered as a git bundle. Create an empty private repo (e.g. `task-reminder`) and add it to the project, and I'll push the history and set up CI with the Windows installer build.
- Sprint 2 scope (22 pts): US-002, US-006, US-008, US-009, US-011, US-012, US-014, US-016, US-017.
