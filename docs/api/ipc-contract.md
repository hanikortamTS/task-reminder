# IPC contract (preload `window.api` ↔ main)

Task Reminder has no HTTP API, so there is no OpenAPI document (decision D-05). This file is the equivalent contract and matches `src/preload/api.ts` and `src/main/ipc.ts` as implemented in v0.9.0. Every call returns `{ ok: true, value }` or `{ ok: false, code, message }`.

| Call | Channel | Request | Response `value` | Error codes |
|---|---|---|---|---|
| `tasks.list()` | `tasks.list` | — | `Task[]` | — |
| `tasks.create(input)` | `tasks.create` | `{ title, deadline?: ISO \| null, notes?, priority?, reminderOffsets?: number[] }` | `Task` | `VALIDATION` (empty title, bad date, notes > 5000, > 5 offsets) |
| `tasks.update(id, patch)` | `tasks.update` | `patch`: any of `title, deadline, notes, priority, reminderOffsets, status` (unknown keys rejected) | `Task` | `NOT_FOUND`, `VALIDATION` |
| `tasks.delete(id)` | `tasks.delete` | — | `{ deleted: Task }` | `NOT_FOUND` |
| `tasks.restore(task)` | `tasks.restore` | full `Task` (from a delete) | `Task` | `VALIDATION` |
| `app.info()` | `app.info` | — | `{ loadResult: 'ok' \| 'empty' \| 'restored-from-backup' \| 'reset-corrupt', version }` | — |

Events from main:
| Subscription | Channel | Payload | When |
|---|---|---|---|
| `onTasksChanged(cb)` | `tasks.changed` | `Task[]` | After any change, including reminders being marked as shown |
| `onFocusTask(cb)` | `ui.focusTask` | `{ id }` | A reminder notification was clicked |
| `onQuickAdd(cb)` | `ui.quickAdd` | `{}` | Tray menu → Add a task |

`Task` fields: see `src/core/types.ts` (LLD §2). Titles are trimmed and cut to 200 characters.

Not yet implemented (sprint 2, per LLD §3): `reminders.snooze`, `settings.get/set`, `data.export/import`.
