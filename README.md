# Task Reminder

A small personal task reminder for Windows. It lives in the system tray, lets you add a task in seconds, and pops up a Windows notification before each deadline.

**Status: v0.9.0 preview (end of sprint 1).** See [docs/sprint-1-report.md](docs/sprint-1-report.md) for exactly what works and what is still to come.

## What works now
- Quick add: type a title, pick **Today 17:00**, **Tomorrow 9:00**, **Next Mon 9:00** or any date, press Enter.
- Today (overdue + due today), Upcoming (Tomorrow / This week / Later / No deadline) and Done views with counts.
- Overdue tasks in red with "Overdue by …".
- Details panel: rename, change deadline (saves automatically), mark done / reopen, delete with 5-second Undo.
- Reminders 1 hour before and at the deadline; clicking a reminder opens the task.
- Tray icon, close-to-tray, starts with Windows (installed/unzipped build only).
- Data in `%APPDATA%\TaskReminder\tasks.json` with automatic backup and recovery.
- Keyboard: `N` new, `↑/↓` move, `Space` done, `Del` delete, `Esc` close.

## Coming in sprint 2
Notes, priority and per-task reminder times in the UI; Done/Snooze buttons on notifications; catch-up of reminders missed while the PC was off; tray badge and in-app banner; search; `Ctrl+Alt+T` quick add from anywhere; export/import; installer.

## Develop
```bash
npm install
npm start              # build and run (Linux containers running as root: npx electron --no-sandbox .)
npm test               # unit tests (Vitest)
npm run test:coverage  # unit tests with coverage
npm run test:e2e       # end-to-end tests (Playwright + Electron); on headless Linux: xvfb-run -a npm run test:e2e
npm run typecheck && npm run lint
npm run dist:win:zip   # Windows x64 zip in release/
```
`npm run dist:win` (NSIS installer + portable exe) needs Windows or Wine; it will be wired into CI in sprint 2.

## Layout
| Folder | Contents |
|---|---|
| `src/core` | Pure logic: types, validation, dates, selectors, scheduler, task store (fully unit tested) |
| `src/main` | Electron main process: app shell, tray, scheduler service, notifier, IPC |
| `src/preload` | The only bridge between UI and main (`window.api`) |
| `src/renderer` | React UI |
| `test/unit`, `test/e2e` | Vitest and Playwright tests |
| `docs` | User guide, admin guide, user manual, IPC contract, decisions, sprint reports |

Plan documents (requirements, design, backlog, tests) live in the project's `task-reminder/sdlc/` folder. Story IDs (US-xxx) in code comments and test titles trace back to them.
