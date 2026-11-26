# IPC contract (preload `window.api` ↔ main)

Task Reminder has no HTTP API, so there is no OpenAPI document (decision D-05). This file is the equivalent contract and matches `src/preload/api.ts` and `src/main/ipc.ts` as implemented in v1.0.0. Every call returns `{ ok: true, value }` or `{ ok: false, code, message }`.

| Call | Channel | Request | Response `value` | Error codes |
|---|---|---|---|---|
| `tasks.list()` | `tasks.list` | — | `Task[]` | — |
| `tasks.create(input)` | `tasks.create` | `{ title, deadline?: ISO \| null, notes?, priority?, reminderOffsets?: number[] }` | `Task` | `VALIDATION` (empty title, bad date, notes > 5000, > 5 offsets) |
| `tasks.update(id, patch)` | `tasks.update` | `patch`: any of `title, deadline, notes, priority, reminderOffsets, status` (unknown keys rejected) | `Task` | `NOT_FOUND`, `VALIDATION` |
| `tasks.delete(id)` | `tasks.delete` | — | `{ deleted: Task }` | `NOT_FOUND` |
| `tasks.restore(task)` | `tasks.restore` | full `Task` (from a delete) | `Task` | `VALIDATION` |
| `reminders.snooze(id, choice)` | `reminders.snooze` | `choice`: `'10m' \| '1h' \| 'tomorrow'` | `Task` (with `snoozedUntil`) | `NOT_FOUND`, `VALIDATION` |
| `settings.get()` | `settings.get` | — | `Settings` | — |
| `settings.set(patch)` | `settings.set` | `{ launchAtStartup?, defaultOffsets? }` (other keys rejected) | `Settings` | `VALIDATION` |
| `data.export()` | `data.export` | — (save dialog) | `{ path, count }` or `null` if cancelled | IO errors |
| `data.import()` | `data.import` | — (open dialog + confirm) | `{ count }` or `null` if cancelled | `INVALID_FILE` (nothing changed) |
| `quick.close()` | `quick.close` | — | — | — |
| `app.info()` | `app.info` | — | `{ loadResult: 'ok' \| 'empty' \| 'restored-from-backup' \| 'reset-corrupt', version, dataDir, shortcut: 'Ctrl+Alt+T' \| null, missed: string[] }` | — |

Events from main:
| Subscription | Channel | Payload | When |
|---|---|---|---|
| `onTasksChanged(cb)` | `tasks.changed` | `Task[]` | After any change, including reminders being marked as shown |
| `onFocusTask(cb)` | `ui.focusTask` | `{ id }` | A reminder notification was clicked |
| `onFocusTask(cb)` payload | | `{ id, fromReminder: true }` | `fromReminder` shows the Done/Snooze bar |
| `onMissed(cb)` | `ui.missed` | `{ ids }` | Reminders were missed while the PC was off/asleep |
| `onQuickReset(cb)` | `ui.quickReset` | `{}` | The quick-add box is reopened (Ctrl+Alt+T) |

`Task` fields: see `src/core/types.ts` (LLD §2). Titles are trimmed and cut to 200 characters.

## Notification links
Windows toast buttons launch `taskreminder://` URLs, delivered to the running app as a second-instance command line and parsed by `src/core/protocol.ts`:
`open?id=<id>`, `done?id=<id>`, `snooze?id=<id>&c=10m|1h|tomorrow`. Ids must match `[A-Za-z0-9-]{1,64}`; any other URL is ignored.
