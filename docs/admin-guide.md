# Task Reminder — Install and operations guide

## Requirements
Windows 10 (21H2+) or 11, x64. No admin rights, no internet connection, no account.

## Install / upgrade / uninstall (v0.9 preview zip)
| Action | Steps |
|---|---|
| Install | Unzip `Task Reminder-0.9.0-win.zip` to a permanent folder; run `Task Reminder.exe`. On first run the app registers itself to start with Windows (minimised to the tray, `--hidden`). |
| Upgrade | Quit from the tray, replace the folder contents with the new zip, start again. Data is not in the app folder, so it is kept. |
| Uninstall | Quit from the tray; in *Settings → Apps → Startup* turn Task Reminder off (sprint 2 adds a setting); delete the folder. Delete `%APPDATA%\TaskReminder` only if you want to remove your tasks. |

From v1.0 a per-user installer (`TaskReminder-Setup-x.y.z.exe`) and a portable exe replace the zip.

## Files
| Path | Purpose |
|---|---|
| `%APPDATA%\TaskReminder\tasks.json` | All tasks (JSON, `version: 1`) |
| `%APPDATA%\TaskReminder\tasks.bak.json` | Previous good save, written before every save |
| `%APPDATA%\TaskReminder\tasks.corrupt-<ms>.json` | Unreadable file kept aside during recovery |
| `%APPDATA%\TaskReminder\settings.json` | `launchAtStartup`, `defaultOffsets` (minutes, default `[60, 0]`), `lastCheckedAt` |
| `%APPDATA%\TaskReminder\electron\` | Electron's own cache/profile |

## Configuration
There is no configuration UI yet (sprint 2). `settings.json` can be edited while the app is not running:
- `"launchAtStartup": false` stops auto-start (applied on next start).
- `"defaultOffsets": [1440, 60, 0]` gives new tasks reminders 1 day, 1 hour and 0 minutes before the deadline (max 5).

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
| No notifications | Windows notifications off for the app, or Focus Assist on. Check *Settings → System → Notifications*. Unpacked (zip) builds without a Start-menu shortcut may have toasts suppressed on some Windows builds; see the sprint 1 report, risk R-07. |
| App starts twice | It can't: a second start just brings the first window forward. |
| "Restored from backup" banner | `tasks.json` was unreadable; the backup was loaded and the damaged file kept as `tasks.corrupt-*.json`. |
| "Could not be read… new list was started" | Both files were unreadable. Recover by renaming a `tasks.corrupt-*.json` you can repair, or ask for help. |
| Reminders late after sleep | Catch-up after sleep/resume is sprint 2 (US-009). |

## Backup
Copy `%APPDATA%\TaskReminder\tasks.json` somewhere safe (for example a OneDrive folder). Export/Import from the app arrives in sprint 2.
