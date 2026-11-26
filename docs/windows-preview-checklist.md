# Windows checklist (v1.0.0) — about 10 minutes

Please run these on your PC and tell me which ones fail. Each line names the story it checks.

1. [ ] Quit the old v0.9 app if it is running (tray → Quit). Run `TaskReminder-Setup-1.0.0.exe` → the app opens, ✓ icon in the tray, "Task Reminder" in the Start menu. Your v0.9 tasks are still there. (US-017)
2. [ ] Add "Test reminder" with a custom deadline **3 minutes from now**. (US-001)
3. [ ] At that time a notification appears with sound and buttons **Done / Snooze 10 min / Snooze 1 hour / Tomorrow 9:00**. (US-007, US-011)
4. [ ] Click **Snooze 10 min** → it comes back 10 minutes later. Then click **Done** → the task moves to Done. (US-011)
5. [ ] Add another task due in 3 minutes; when it pops up, click the notification text → the app opens on that task with Done/Snooze at the top. (US-010)
6. [ ] With a task due within the hour, the tray icon shows a red number and the app shows a "Due now" banner. (US-012)
7. [ ] Press **Ctrl+Alt+T** while in another app → small box; type, Enter → task saved. (US-014)
8. [ ] Open a task → add notes, set priority, add "1 day before" under Reminders. Press **/** and search for a word from the notes. (US-002, US-006, US-008)
9. [ ] Settings → Export tasks… → a file is saved. (US-016)
10. [ ] Add a task due in 5 minutes, quit the app from the tray, wait 6 minutes, start it again → the missed reminder pops up right away (with two or more missed, you get one "You missed N reminders" notification). (US-009)
11. [ ] Restart Windows → Task Reminder starts by itself in the tray. (US-013)

If notifications don't appear: check Focus Assist / Do not disturb and *Settings → System → Notifications → Task Reminder*.
