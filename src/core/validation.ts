import { z } from 'zod';
import type { Task } from './types';

/** IPC input validation — LLD §5. All main-process inputs pass through these schemas. */
export const TITLE_MAX = 200;
export const NOTES_MAX = 5000;
export const MAX_OFFSETS = 5;

const isoInstant = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date');
const offsets = z.array(z.number().int().min(0).max(60 * 24 * 30)).max(MAX_OFFSETS);

export const titleSchema = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => s.length > 0, 'Give the task a name')
  .transform((s) => s.slice(0, TITLE_MAX));

export const newTaskSchema = z.object({
  title: titleSchema,
  deadline: isoInstant.nullable().optional(),
  notes: z.string().max(NOTES_MAX).optional(),
  priority: z.boolean().optional(),
  reminderOffsets: offsets.optional(),
});

export const taskPatchSchema = z
  .object({
    title: titleSchema,
    deadline: isoInstant.nullable(),
    notes: z.string().max(NOTES_MAX),
    priority: z.boolean(),
    reminderOffsets: offsets,
    status: z.enum(['open', 'done']),
  })
  .partial()
  .strict();

export const taskSchema: z.ZodType<Task> = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(TITLE_MAX),
  deadline: isoInstant.nullable(),
  notes: z.string().max(NOTES_MAX),
  priority: z.boolean(),
  reminderOffsets: offsets,
  status: z.enum(['open', 'done']),
  snoozedUntil: isoInstant.nullable(),
  firedReminders: z.array(z.string()),
  createdAt: isoInstant,
  updatedAt: isoInstant,
  completedAt: isoInstant.nullable(),
});

export const taskFileSchema = z.object({ version: z.literal(1), tasks: z.array(taskSchema) });

export class ValidationError extends Error {
  readonly code = 'VALIDATION';
}

export function parseOrThrow<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, value: unknown): T {
  const r = schema.safeParse(value);
  if (!r.success) throw new ValidationError(r.error.issues.map((i) => i.message).join('; '));
  return r.data;
}
