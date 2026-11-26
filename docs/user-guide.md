# Task Reminder — Quick start (v1.0)

## Install
1. Run **TaskReminder-Setup-1.0.0.exe**. It installs for your user only (no admin rights), adds a Start-menu and desktop shortcut, and starts the app.
   - Prefer no install? Use **TaskReminder-Portable-1.0.0.exe** from any folder.
2. If Windows SmartScreen warns you, click **More info → Run anyway** (the app is not code-signed).
3. A blue ✓ icon appears in the tray (bottom-right, maybe under the ^ arrow). From now on it starts with Windows, hidden in the tray.

## Add a task
- In the window: click the box at the top (or press **N**), type, optionally pick a deadline, press **Enter**.
- From anywhere: press **Ctrl+Alt+T**, type, press **Enter** (Esc closes without saving).
- Deadline chips: **Today 17:00** (after 17:00 it becomes **In 1 hour**), **Tomorrow 9:00**, **Next Mon 9:00**, or any date and time. No chip = no deadline.

## See what's due
- **Today**: overdue tasks (red) on top, then today's tasks by time. A red **!** marks high priority.
- **Upcoming**: Tomorrow, This week, Later, No deadline. **Done**: the last 30 days.
- The tray icon shows a red number = tasks overdue or due within the hour. The app shows the same as a "Due now" banner.
- **Search**: press **/** and type; it searches titles and notes in all views. **Esc** clears.

## Reminders
- By default every task with a deadline reminds you **1 hour before** and **at the deadline**. Change it per task under **Reminders** in the details panel (presets, custom, or *No reminder*), or for all new tasks in **Settings**.
- On a reminder notification: **Done**, **Snooze 10 min**, **Snooze 1 hour** or **Tomorrow 9:00**. Click the notification itself to open the task; the same buttons are shown at the top of its details.
- If the PC was off or asleep when reminders were due, you get one "You missed N reminders" notification and a banner listing them.
- Need quiet? Right-click the tray icon → **Pause reminders for 1 hour**.

## Change, finish or delete
Click a task. Everything saves by itself: title, deadline, reminders, priority, notes. Tick the box (or **Space**) to finish it. **Delete** shows an **Undo** bar for 5 seconds.

## Settings
Sidebar → **Settings**: start with Windows on/off, default reminders, **Export tasks…** (save a backup file) and **Import tasks…** (replace your list with a file; asks first).

## FAQ
- **No notifications?** Check *Windows Settings → System → Notifications → Task Reminder* is on and Focus Assist / Do not disturb is off. The tray badge and "Due now" banner still show what's due.
- **Where is my data?** `%APPDATA%\TaskReminder\tasks.json` (backup of the previous save: `tasks.bak.json`).
- **"Restored from backup" message?** The task file was damaged (for example a power cut mid-save). The last good copy was loaded; the damaged file is kept as `tasks.corrupt-<number>.json`.
- **Ctrl+Alt+T does nothing?** Another app uses that shortcut; Settings shows whether it is available. Use the tray menu → *Add a task* instead.
