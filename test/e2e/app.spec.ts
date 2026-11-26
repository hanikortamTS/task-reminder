/**
 * End-to-end tests through the real Electron app (Automation Testing Plan).
 * Story IDs in each title map to the TC table in docs/test-evidence.
 */
import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

interface Seam {
  notifications(): { taskId: string | null; title: string; body: string; kind: string; actions: string[] }[];
  clickNotification(id: string | null): void;
  toastAction(url: string): boolean;
  openQuick(): void;
  quickVisible(): boolean;
  badge(): number;
  setDialogPath(p: string | null): void;
  hideWindow(): void;
  isVisible(): boolean;
}
type G = { __taskReminderTest: Seam };

const ROOT = path.join(__dirname, '..', '..');

async function launch(dataDir: string): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({
    args: ['--no-sandbox', ROOT],
    env: { ...process.env, TASKREMINDER_E2E: '1', TASKREMINDER_DATA_DIR: dataDir },
  });
  const page = await app.firstWindow();
  await page.waitForSelector('[data-testid="quickadd-input"]');
  return { app, page };
}

function seed(dataDir: string, tasks: Record<string, unknown>[], created = new Date(Date.now() - 86_400_000).toISOString()) {
  const base = { notes: '', priority: false, reminderOffsets: [60, 0], status: 'open', snoozedUntil: null, firedReminders: [], completedAt: null };
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, 'tasks.json'),
    JSON.stringify({ version: 1, tasks: tasks.map((t, i) => ({ ...base, id: `seed-${i}`, createdAt: created, updatedAt: created, deadline: null, ...t })) }),
  );
}

const inMin = (m: number) => new Date(Date.now() + m * 60_000).toISOString();
const rows = (page: Page) => page.locator('[data-testid="task-row"]');

let dataDir: string;
let app: ElectronApplication | undefined;
test.beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tr-e2e-'));
});
async function quit(a: ElectronApplication) {
  const proc = a.process();
  const exited = proc.exitCode !== null ? Promise.resolve() : new Promise<void>((r) => proc.once('exit', () => r()));
  await a.evaluate(({ app: e }) => e.exit(0)).catch(() => undefined);
  await exited;
}

test.afterEach(async () => {
  if (app) await quit(app);
  app = undefined;
  // Helper processes can still be flushing the Electron profile for a moment; temp cleanup is best effort.
  fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
});

test('US-001: add a task with a quick deadline chip; empty title is refused; no deadline goes to Upcoming', async () => {
  let page: Page;
  ({ app, page } = await launch(dataDir));
  await expect(page.getByTestId('empty')).toHaveText('Nothing due today. Add your first task above.');

  // AC2: empty title
  await page.getByTestId('quickadd-input').press('Enter');
  await expect(page.getByTestId('quickadd-error')).toHaveText('Give the task a name');
  await expect(rows(page)).toHaveCount(0);

  // AC1: title + chip + Enter
  await page.getByTestId('quickadd-input').fill('Send invoice');
  await page.getByTestId('chip-today').click();
  await page.getByTestId('quickadd-input').press('Enter');
  await expect(page.getByTestId('view-today')).toBeVisible();
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText('Send invoice');
  await expect(page.getByTestId('quickadd-input')).toHaveValue('');

  // AC3: no deadline → Upcoming / No deadline
  await page.getByTestId('quickadd-input').fill('Read about OCR');
  await page.getByTestId('quickadd-input').press('Enter');
  await expect(page.getByTestId('view-upcoming')).toBeVisible();
  await expect(page.locator('h2', { hasText: 'No deadline' })).toBeVisible();
  await expect(rows(page).first()).toContainText('Read about OCR');
});

test('US-003/US-004: views, grouping, counts and overdue highlighting', async () => {
  seed(dataDir, [
    { title: 'Submit timesheet', deadline: inMin(-120), priority: true },
    { title: 'Review payment form', deadline: inMin(30) },
    { title: 'Pay supplier', deadline: new Date(Date.now() + 2 * 86_400_000).toISOString() },
    { title: 'Old done', status: 'done', completedAt: new Date().toISOString() },
  ]);
  let page: Page;
  ({ app, page } = await launch(dataDir));
  await expect(page.locator('h2').first()).toHaveText('Overdue');
  const overdue = rows(page).first();
  await expect(overdue).toContainText('Submit timesheet');
  await expect(overdue).toHaveClass(/overdue/);
  await expect(overdue.getByTestId('task-meta')).toContainText('Overdue by 2 h');
  await expect(page.getByTestId('count-done')).toHaveText('1');

  // AC2 of US-004: completing the overdue task moves it to Done
  await overdue.locator('input[type=checkbox]').click();
  await expect(rows(page).filter({ hasText: 'Submit timesheet' })).toHaveCount(0);
  await page.getByTestId('nav-done').click();
  await expect(rows(page).filter({ hasText: 'Submit timesheet' })).toHaveCount(1);

  await page.getByTestId('nav-upcoming').click();
  await expect(page.locator('h2')).not.toHaveCount(0);
  await expect(rows(page).filter({ hasText: 'Pay supplier' })).toHaveCount(1);
  await expect(rows(page).filter({ hasText: 'Review payment form' })).toHaveCount(0);
});

test('US-005: complete with Space, reopen, edit deadline with autosave, delete and undo', async () => {
  seed(dataDir, [{ title: 'Call bank', deadline: inMin(90) }]);
  let page: Page;
  ({ app, page } = await launch(dataDir));
  await rows(page).first().click();
  await expect(page.getByTestId('details')).toBeVisible();

  // AC1: Space marks done
  await page.locator('body').press(' ');
  await expect(page.getByTestId('count-done')).toHaveText('1');
  // AC2: reopen from Done
  await page.getByTestId('nav-done').click();
  await page.getByTestId('details-toggle').click();
  await expect(page.getByTestId('count-done')).toHaveText('0');

  // AC4: change deadline, no Save button
  await page.getByTestId('details-deadline').fill('2030-01-15T10:30');
  await page.getByTestId('nav-upcoming').click();
  await expect(rows(page).first().getByTestId('task-meta')).toContainText('15 Jan 10:30');

  // AC3: delete, then undo within 5 s restores it unchanged
  await rows(page).first().click();
  await page.getByTestId('details-delete').click();
  await expect(rows(page)).toHaveCount(0);
  await page.getByTestId('undo').click();
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText('Call bank');
});

test('US-015: tasks survive a restart; a damaged file is restored from backup', async () => {
  let page: Page;
  ({ app, page } = await launch(dataDir));
  for (const t of ['First', 'Second']) {
    await page.getByTestId('quickadd-input').fill(t);
    await page.getByTestId('quickadd-input').press('Enter');
  }
  await expect(page.getByTestId('count-upcoming')).toHaveText('2');
  await quit(app);

  ({ app, page } = await launch(dataDir));
  await expect(page.getByTestId('count-upcoming')).toHaveText('2');
  await quit(app);

  fs.writeFileSync(path.join(dataDir, 'tasks.json'), '{"broken');
  ({ app, page } = await launch(dataDir));
  await expect(page.getByTestId('banner')).toContainText('restored from the automatic backup');
  await expect(page.getByTestId('count-upcoming')).toHaveText('1');
});

test('US-007/US-010: a reminder fires at the deadline and clicking it opens the task', async () => {
  test.setTimeout(120_000);
  let page: Page;
  ({ app, page } = await launch(dataDir));
  await page.getByTestId('quickadd-input').fill('Stand-up call');
  // Deadline 1 minute ahead via the custom picker (minute precision), so the "at deadline" reminder fires.
  const d = new Date(Date.now() + 60_000);
  const p = (n: number) => String(n).padStart(2, '0');
  await page.getByTestId('chip-custom').fill(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`);
  await page.getByTestId('quickadd-input').press('Enter');
  const deadline = new Date(d);
  deadline.setSeconds(0, 0);

  const notes = () => app!.evaluate(() => (globalThis as unknown as G).__taskReminderTest.notifications());
  await expect.poll(notes, { timeout: 75_000, intervals: [1000] }).toHaveLength(1);
  const [n] = await notes();
  expect(n.title).toBe('Stand-up call');
  expect(n.body).toMatch(/^Due now \(\d\d:\d\d\)$/);
  // SR-013: fired within 30 s of the scheduled time
  expect(Math.abs(Date.now() - deadline.getTime())).toBeLessThan(30_000 + 2_000);

  // US-010: click → window shown with that task selected
  await app.evaluate(() => (globalThis as unknown as G).__taskReminderTest.hideWindow());
  await expect.poll(() => app!.evaluate(() => (globalThis as unknown as G).__taskReminderTest.isVisible())).toBe(false);
  await app.evaluate((_e, id) => (globalThis as unknown as G).__taskReminderTest.clickNotification(id), n.taskId);
  await expect.poll(() => app!.evaluate(() => (globalThis as unknown as G).__taskReminderTest.isVisible())).toBe(true);
  await expect(page.locator('[data-testid="task-row"][aria-selected="true"]')).toContainText('Stand-up call');
  await expect(page.getByTestId('details-title')).toHaveValue('Stand-up call');
});

test('US-013: closing the window keeps the app running in the tray', async () => {
  let page: Page;
  ({ app, page } = await launch(dataDir));
  await app.evaluate(() => (globalThis as unknown as G).__taskReminderTest.hideWindow());
  await expect.poll(() => app!.evaluate(() => (globalThis as unknown as G).__taskReminderTest.isVisible())).toBe(false);
  expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
  expect(page.isClosed()).toBe(false);
});

test('SR-014: renderer is sandboxed, isolated, has no Node and a CSP', async () => {
  let page: Page;
  ({ app, page } = await launch(dataDir));
  const prefs = await app.evaluate(({ BrowserWindow }) => {
    // getLastWebPreferences exists at runtime but is missing from Electron's typings.
    const wc = BrowserWindow.getAllWindows()[0].webContents as unknown as { getLastWebPreferences(): Record<string, unknown> };
    const p = wc.getLastWebPreferences();
    return { contextIsolation: p.contextIsolation, sandbox: p.sandbox, nodeIntegration: p.nodeIntegration };
  });
  expect(prefs).toEqual({ contextIsolation: true, sandbox: true, nodeIntegration: false });
  expect(await page.evaluate(() => typeof (window as unknown as Record<string, unknown>).require)).toBe('undefined');
  expect(await page.evaluate(() => typeof (window as unknown as Record<string, unknown>).process)).toBe('undefined');
  expect(await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')).toContain("default-src 'self'");
});
