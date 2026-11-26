# Task Reminder

A small personal task reminder for Windows. It lives in the system tray, lets you add a task in seconds, and pops up a Windows notification before each deadline.

**Status: v1.0.0 (end of sprint 2).** All 17 v1 stories are implemented. See [docs/sprint-2-report.md](docs/sprint-2-report.md).

## Features
- Quick add: type a title, pick **Today 17:00**, **Tomorrow 9:00**, **Next Mon 9:00** or any date, press Enter. `Ctrl+Alt+T` opens a small quick-add box from anywhere.
- Today (overdue + due today), Upcoming (Tomorrow / This week / Later / No deadline) and Done views with counts; overdue tasks in red.
- Details panel: title, deadline, notes, priority, reminder times (presets or custom, up to 5), done/reopen, delete with Undo. Everything saves automatically.
- Reminders 1 hour before and at the deadline by default, as Windows notifications with **Done / Snooze 10 min / Snooze 1 hour / Tomorrow 9:00** buttons.
- Reminders missed while the PC was off or asleep are shown once at start-up ("You missed N reminders").
- Tray icon with a red badge counting overdue + due-within-the-hour tasks, and a "Due now" banner in the app. Pause reminders for 1 hour from the tray.
- Search (`/`) over titles and notes.
- Settings: start with Windows, default reminders for new tasks, Export / Import.
- Data in `%APPDATA%\TaskReminder\tasks.json` with automatic backup and recovery. No account, no internet.
- Keyboard: `N` new, `/` search, `↑/↓` move, `Space` done, `Del` delete, `Esc` close.

## Install
Download `TaskReminder-Setup-1.0.0.exe` (per-user, no admin rights) or `TaskReminder-Portable-1.0.0.exe` from the GitHub Actions run / release. See [docs/user-guide.md](docs/user-guide.md).
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
`npm run dist:win` (NSIS installer + portable exe) needs Windows or Wine; the `windows` job in `.github/workflows/ci.yml` builds it on every push and attaches it to a GitHub release for `v*` tags.

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
