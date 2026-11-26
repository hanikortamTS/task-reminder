/** Sprint 2 end-to-end tests through the real Electron app. */
import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

interface Seam {
  notifications(): { taskId: string | null; title: string; body: string; kind: string }[];
  clickNotification(id: string | null): void;
  toastAction(url: string): boolean;
  openQuick(): void;
  quickVisible(): boolean;
  badge(): number;
  setDialogPath(p: string | null): void;
}
type G = { __taskReminderTest: Seam };

const ROOT = path.join(__dirname, '..', '..');
let dataDir: string;
let app: ElectronApplication | undefined;

async function launch(): Promise<Page> {
  app = await electron.launch({ args: ['--no-sandbox', ROOT], env: { ...process.env, TASKREMINDER_E2E: '1', TASKREMINDER_DATA_DIR: dataDir } });
  const page = await app.firstWindow();
  await page.waitForSelector('[data-testid="quickadd-input"]');
  return page;
}

function seed(tasks: Record<string, unknown>[], opts: { createdHoursAgo?: number; lastCheckedHoursAgo?: number } = {}) {
  const created = new Date(Date.now() - (opts.createdHoursAgo ?? 24) * 3_600_000).toISOString();
  const base = { deadline: null, notes: '', priority: false, reminderOffsets: [60, 0], status: 'open', snoozedUntil: null, firedReminders: [], completedAt: null, createdAt: created, updatedAt: created };
  fs.writeFileSync(path.join(dataDir, 'tasks.json'), JSON.stringify({ version: 1, tasks: tasks.map((t, i) => ({ ...base, id: `seed-${i}`, ...t })) }));
  if (opts.lastCheckedHoursAgo !== undefined)
    fs.writeFileSync(path.join(dataDir, 'settings.json'), JSON.stringify({ lastCheckedAt: new Date(Date.now() - opts.lastCheckedHoursAgo * 3_600_000).toISOString() }));
}
const inMin = (m: number) => new Date(Date.now() + m * 60_000).toISOString();
const rows = (page: Page) => page.locator('[data-testid="task-row"]');
const seam = <T>(fn: (s: Seam, arg: never) => T, arg?: unknown) =>
  app!.evaluate((_e, [src, a]) => new Function('s', 'a', `return (${src})(s, a)`)((globalThis as unknown as G).__taskReminderTest, a), [fn.toString(), arg] as const) as Promise<T>;
const readTasks = () => JSON.parse(fs.readFileSync(path.join(dataDir, 'tasks.json'), 'utf8')).tasks as Record<string, unknown>[];

test.beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tr-e2e2-'));
});
test.afterEach(async () => {
  if (app) {
    const proc = app.process();
    const exited = proc.exitCode !== null ? Promise.resolve() : new Promise<void>((r) => proc.once('exit', () => r()));
    await app.evaluate(({ app: e }) => e.exit(0)).catch(() => undefined);
    await exited;
  }
  app = undefined;
  fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
});

test('US-002/US-008: notes, priority and reminder times are edited in the details panel', async () => {
  seed([{ title: 'Prepare steerco deck', deadline: inMin(3 * 24 * 60) }]);
  const page = await launch();
  await page.getByTestId('nav-upcoming').click();
  await rows(page).first().click();
  await page.getByTestId('details-notes').fill('Use the NDF template');
  await page.getByTestId('details-priority').click();
  await expect(rows(page).first().locator('.prio')).toBeVisible();
  await page.getByTestId('reminder-add').selectOption('1440');
  await expect(page.getByTestId('reminder-pill')).toHaveCount(3);
  await page.getByRole('button', { name: 'Remove 1 hour before' }).click();
  await page.getByTestId('reminder-add').selectOption('custom');
  await page.getByTestId('custom-amount').fill('2');
  await page.locator('.custom select').selectOption('h');
  await page.getByTestId('custom-add').click();
  await expect(page.getByTestId('reminder-pill')).toHaveText(['1 day before×', '2 hours before×', 'At deadline×']);
  await page.getByTestId('details-title').click(); // blur notes → save
  await expect.poll(() => readTasks()[0]).toMatchObject({ notes: 'Use the NDF template', priority: true, reminderOffsets: [0, 1440, 120] });
  await page.getByTestId('reminder-add').selectOption('none');
  await expect(page.getByTestId('no-reminder')).toBeVisible();
  await expect.poll(() => readTasks()[0].reminderOffsets).toEqual([]);

  // US-002 AC3: long titles are shortened with a notice
  await page.getByTestId('quickadd-input').fill('x'.repeat(230));
  await page.getByTestId('quickadd-input').press('Enter');
  await expect(page.getByTestId('quickadd-notice')).toHaveText('Title shortened to 200 characters.');
});

test('US-006: search filters by title and notes, "/" focuses, no-results message', async () => {
  seed([{ title: 'Pay supplier invoice', deadline: inMin(600) }, { title: 'Call bank', notes: 'ask about INVOICE fee' }, { title: 'Book dentist' }]);
  const page = await launch();
  await page.locator('body').press('/');
  await expect(page.getByTestId('search')).toBeFocused();
  await page.keyboard.type('invoice');
  await expect(page.getByTestId('view-search')).toBeVisible();
  await expect(rows(page)).toHaveCount(2);
  await page.getByTestId('search').fill('xyz');
  await expect(page.getByTestId('empty')).toHaveText('No tasks match ‘xyz’');
  await page.getByTestId('search').press('Escape');
  await expect(page.getByTestId('search')).toHaveValue('');
});

test('US-009: reminders missed while the app was closed are shown once as a summary and a banner', async () => {
  seed(
    [
      { title: 'Submit timesheet', deadline: inMin(-120) },
      { title: 'Call bank', deadline: inMin(-90) },
    ],
    { createdHoursAgo: 6, lastCheckedHoursAgo: 5 },
  );
  const page = await launch();
  await expect.poll(() => seam((s) => s.notifications())).toHaveLength(1);
  const [n] = await seam((s) => s.notifications());
  expect(n).toMatchObject({ kind: 'missed', title: 'You missed 2 reminders' });
  await expect(page.getByTestId('missed-banner')).toContainText('You missed 2 reminders');
  await expect.poll(() => readTasks().map((t) => (t.firedReminders as string[]).length)).toEqual([2, 2]);
  // Restarting does not show them again.
  await app!.evaluate(({ app: e }) => e.exit(0)).catch(() => undefined);
  const page2 = await launch();
  await page2.waitForTimeout(1500);
  expect(await seam((s) => s.notifications())).toHaveLength(0);
});

test('US-011/US-010: toast buttons and the in-app bar mark done or snooze', async () => {
  seed([
    { id: 'a1', title: 'Send invoice', deadline: inMin(30) },
    { id: 'b2', title: 'Review form', deadline: inMin(45) },
  ]);
  const page = await launch();
  // Toast "Snooze 1 hour" button
  expect(await seam((s, a) => s.toastAction(a), 'taskreminder://snooze?id=a1&c=1h')).toBe(true);
  await expect.poll(() => readTasks().find((t) => t.id === 'a1')!.snoozedUntil).not.toBeNull();
  const until = Date.parse(readTasks().find((t) => t.id === 'a1')!.snoozedUntil as string);
  expect(Math.abs(until - (Date.now() + 3_600_000))).toBeLessThan(10_000);
  // Toast "Done" button
  await seam((s, a) => s.toastAction(a), 'taskreminder://done?id=b2');
  await expect.poll(() => readTasks().find((t) => t.id === 'b2')!.status).toBe('done');
  // Invalid link is ignored
  expect(await seam((s, a) => s.toastAction(a), 'taskreminder://delete?id=a1')).toBe(false);
  // Click toast body → in-app bar → Snooze until tomorrow 09:00
  await seam((s, a) => s.clickNotification(a), 'a1');
  await expect(page.getByTestId('reminder-bar')).toBeVisible();
  await page.getByTestId('bar-snooze-tomorrow').click();
  await expect(page.getByTestId('snoozed-until')).toContainText('tomorrow 09:00');
});

test('US-012: tray badge and due banner show due and overdue tasks', async () => {
  seed([{ title: 'Overdue one', deadline: inMin(-30) }, { title: 'Soon', deadline: inMin(20) }, { title: 'Later', deadline: inMin(600) }]);
  const page = await launch();
  await expect.poll(() => seam((s) => s.badge())).toBe(2);
  await expect(page.getByTestId('due-banner')).toContainText('Overdue one, Soon');
  await page.getByTestId('due-banner').getByText('Soon').click();
  await expect(page.getByTestId('reminder-bar')).toBeVisible();
  await page.getByTestId('bar-done').click();
  await expect.poll(() => seam((s) => s.badge())).toBe(1);
});

test('US-014: the quick-add box saves with Enter and closes with Esc', async () => {
  await launch();
  await seam((s) => s.openQuick());
  const quick = await app!.waitForEvent('window', (w) => w.url().endsWith('#quick'));
  await quick.waitForSelector('[data-testid="quick-window"]');
  await expect(quick.getByTestId('quickadd-input')).toBeFocused();
  await quick.getByTestId('quickadd-input').fill('Renew passport');
  await quick.getByTestId('quickadd-input').press('Enter');
  await expect.poll(() => seam((s) => s.quickVisible())).toBe(false);
  await expect.poll(() => readTasks().map((t) => t.title)).toEqual(['Renew passport']);
  await seam((s) => s.openQuick());
  await expect.poll(() => seam((s) => s.quickVisible())).toBe(true);
  await quick.getByTestId('quickadd-input').fill('Not saved');
  await quick.keyboard.press('Escape');
  await expect.poll(() => seam((s) => s.quickVisible())).toBe(false);
  expect(readTasks()).toHaveLength(1);
});

test('US-016: export and import from Settings; an invalid file changes nothing', async () => {
  seed([{ title: 'Keep me' }, { title: 'And me', deadline: inMin(600) }]);
  const page = await launch();
  await page.getByTestId('nav-settings').click();
  const out = path.join(dataDir, 'backup.json');
  await seam((s, a) => s.setDialogPath(a), out);
  await page.getByTestId('export').click();
  await expect(page.getByTestId('data-msg')).toContainText('Exported 2 tasks');
  expect(JSON.parse(fs.readFileSync(out, 'utf8')).tasks).toHaveLength(2);

  const bad = path.join(dataDir, 'bad.json');
  fs.writeFileSync(bad, '{"nope":1}');
  await seam((s, a) => s.setDialogPath(a), bad);
  await page.getByTestId('import').click();
  await expect(page.getByTestId('data-msg')).toContainText('not a Task Reminder export');
  expect(readTasks()).toHaveLength(2);

  await page.getByTestId('nav-upcoming').click();
  await rows(page).first().click();
  await page.getByTestId('details-delete').click();
  await expect.poll(() => readTasks()).toHaveLength(1);
  await page.getByTestId('nav-settings').click();
  await seam((s, a) => s.setDialogPath(a), out);
  await page.getByTestId('import').click();
  await expect(page.getByTestId('data-msg')).toHaveText('Imported 2 tasks.');
  await expect(page.getByTestId('count-upcoming')).toHaveText('2');

  // Settings persist
  await page.getByTestId('set-startup').click();
  await expect.poll(() => JSON.parse(fs.readFileSync(path.join(dataDir, 'settings.json'), 'utf8')).launchAtStartup).toBe(false);
});
