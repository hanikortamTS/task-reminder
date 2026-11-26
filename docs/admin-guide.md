# Task Reminder — Install and operations guide

## Requirements
Windows 10 (21H2+) or 11, x64. No admin rights, no internet connection, no account.

## Install / upgrade / uninstall (v1.0)
| Action | Steps |
|---|---|
| Install | Run `TaskReminder-Setup-1.0.0.exe` (per-user into `%LOCALAPPDATA%\Programs\Task Reminder`, no admin). It creates Start-menu and desktop shortcuts and registers the `taskreminder://` link used by notification buttons. On first run the app registers itself to start with Windows (minimised to the tray, `--hidden`). |
| Portable | Run `TaskReminder-Portable-1.0.0.exe` from any folder. Notification buttons work once the app has run once (it registers `taskreminder://` itself). |
| Upgrade | Quit from the tray and run the newer installer. Data is not in the app folder, so it is kept. Export first if you want an extra backup. |
| Uninstall | *Windows Settings → Apps → Task Reminder → Uninstall*. Delete `%APPDATA%\TaskReminder` only if you also want to remove your tasks. |
| From the v0.9 zip | Quit the old app from the tray, install v1.0, then delete the old unzipped folder. Tasks are kept. |

## Files
| Path | Purpose |
|---|---|
| `%APPDATA%\TaskReminder\tasks.json` | All tasks (JSON, `version: 1`) |
| `%APPDATA%\TaskReminder\tasks.bak.json` | Previous good save, written before every save |
| `%APPDATA%\TaskReminder\tasks.corrupt-<ms>.json` | Unreadable file kept aside during recovery |
| `%APPDATA%\TaskReminder\settings.json` | `launchAtStartup`, `defaultOffsets` (minutes, default `[60, 0]`), `lastCheckedAt` |
| `%APPDATA%\TaskReminder\electron\` | Electron's own cache/profile |

## Configuration
Everything is in the app under **Settings**: start with Windows, default reminders for new tasks, export/import. The same values live in `settings.json` (`launchAtStartup`, `defaultOffsets` in minutes, max 5). `lastCheckedAt` is written by the app and drives the missed-reminder catch-up; don't edit it.

| Fixed setting | Value |
|---|---|
| Quick-add shortcut | `Ctrl+Alt+T` (if another app owns it, Settings says so; use the tray menu) |
| "Due" for badge/banner | overdue, or due within the next 60 minutes |
| Missed reminder | shown more than 2 minutes after its time (PC off/asleep) |
| Notification link scheme | `taskreminder://open|done|snooze?id=…&c=10m|1h|tomorrow` (anything else is ignored) |

Environment variables (developer/test use only):
| Variable | Effect |
|---|---|
| `TASKREMINDER_DATA_DIR` | Use another data folder instead of `%APPDATA%\TaskReminder` |
| `TASKREMINDER_E2E=1` | Exposes a test hook used by the end-to-end tests; never set this in normal use |

## Users and roles
Single user, no accounts, no passwords. Data is protected by the Windows account's file permissions.

## Troubleshooting
| Symptom | Cause / fix |
|---|---|
| No notifications | Windows notifications off for the app, or Focus Assist on. Check *Settings → System → Notifications*. The tray badge and "Due now" banner still work. The portable exe has no Start-menu shortcut, which on some Windows builds suppresses toasts: use the installer. |
| Notification buttons do nothing | The `taskreminder://` link is not registered: run the installer version, or start the portable exe once. |
| App starts twice | It can't: a second start just brings the first window forward. |
| "Restored from backup" banner | `tasks.json` was unreadable; the backup was loaded and the damaged file kept as `tasks.corrupt-*.json`. |
| "Could not be read… new list was started" | Both files were unreadable. Recover by renaming a `tasks.corrupt-*.json` you can repair, or ask for help. |
| Reminders after sleep | On wake-up the app shows anything that fell due while asleep, once ("You missed N reminders"). |

## Backup
Settings → **Export tasks…** saves a JSON file you can keep in OneDrive; **Import tasks…** restores it (asks first; the replaced list is kept as `tasks.bak.json`).
