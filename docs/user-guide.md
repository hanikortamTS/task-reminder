# Task Reminder — Quick start

## Install (preview)
1. Unzip `Task Reminder-0.9.0-win.zip` to a folder you keep, for example `C:\Users\<you>\Apps\Task Reminder`.
2. Double-click **Task Reminder.exe**. If Windows SmartScreen warns you, click **More info → Run anyway** (the preview is not code-signed).
3. The window opens and a blue ✓ icon appears in the tray (bottom-right, you may need the ^ arrow).

## Add a task
Click the box at the top (or press **N**), type what you need to do, optionally click a deadline chip, and press **Enter**.
- **Today 17:00** (after 17:00 it becomes **In 1 hour**), **Tomorrow 9:00**, **Next Mon 9:00**, or pick any date and time.
- No chip = no deadline; the task goes to **Upcoming → No deadline**.

## See what's due
- **Today**: overdue tasks (red) on top, then today's tasks by time.
- **Upcoming**: Tomorrow, This week, Later, No deadline.
- **Done**: what you completed in the last 30 days.

## Reminders
Every task with a deadline reminds you **1 hour before** and **at the deadline**. Click the notification to open the task. If you add a task that is due in less than an hour, you only get the "at the deadline" reminder.

## Change, finish or delete
Click a task to open its details. Changes save by themselves. Tick the circle (or press **Space**) to finish it. **Delete** shows an **Undo** bar for 5 seconds.

## Closing
Closing the window keeps the app running in the tray so reminders still arrive. To stop it completely, right-click the tray icon → **Quit**.

## FAQ
- **I don't see notifications.** Check Windows *Settings → System → Notifications* is on for Task Reminder and that Focus Assist / Do not disturb is off. (A tray badge and in-app banner as a backup arrive in sprint 2.)
- **Where is my data?** `%APPDATA%\TaskReminder\tasks.json`. A backup of the previous save is in `tasks.bak.json`.
- **The app says it restored from backup.** Your task file was damaged (for example the PC lost power mid-save). The last good version was loaded; the damaged file is kept as `tasks.corrupt-<number>.json`.
