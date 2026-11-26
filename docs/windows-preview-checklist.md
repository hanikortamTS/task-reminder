# Windows preview checklist (v0.9.0) — about 10 minutes

Please run these on your PC and tell me which ones fail. Each line names the story it checks.

1. [ ] Unzip, start `Task Reminder.exe` → window opens, ✓ icon in the tray. (US-013)
2. [ ] Add "Test reminder" with a custom deadline **3 minutes from now** → it appears under Today. (US-001)
3. [ ] Wait → a Windows notification "Test reminder · Due now (hh:mm)" appears at that time, with sound. (US-007)
4. [ ] Click the notification → the app opens with that task selected. (US-010)
5. [ ] Add "Test early" due in **62 minutes** → after ~2 minutes a "Due in 1 h" notification appears. (US-007)
6. [ ] Close the window with X → the app keeps running in the tray; click the tray icon → it comes back. (US-013)
7. [ ] Right-click tray → Quit → the icon disappears. Start again → your tasks are still there. (US-013, US-015)
8. [ ] Restart Windows → Task Reminder starts by itself in the tray (no window). (US-013)
9. [ ] Does the app follow your Windows dark/light mode? Does anything look cramped or confusing?

If step 3 or 5 shows no notification: note whether Focus Assist was on, and check *Settings → System → Notifications → Task Reminder*.
