/** Data model — LLD §2 (SR-002, SR-011). */
export type TaskStatus = 'open' | 'done';

export interface Task {
  id: string;
  title: string;
  /** ISO-8601 instant (UTC), or null for "no deadline". Displayed in local time. */
  deadline: string | null;
  notes: string;
  priority: boolean;
  /** Minutes before the deadline at which to remind. [] = no reminder. */
  reminderOffsets: number[];
  status: TaskStatus;
  snoozedUntil: string | null;
  /** Keys of reminders already shown ("<offset>@<deadline>"), prevents duplicates. */
  firedReminders: string[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface TaskFile {
  version: 1;
  tasks: Task[];
}

export interface Settings {
  launchAtStartup: boolean;
  defaultOffsets: number[];
  lastCheckedAt: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  launchAtStartup: true,
  defaultOffsets: [60, 0],
  lastCheckedAt: null,
};

export interface NewTaskInput {
  title: string;
  deadline?: string | null;
  notes?: string;
  priority?: boolean;
  reminderOffsets?: number[];
}

export type TaskPatch = Partial<Pick<Task, 'title' | 'deadline' | 'notes' | 'priority' | 'reminderOffsets' | 'status'>>;
