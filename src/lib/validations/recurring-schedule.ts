import { z } from 'zod';

export const recurringScheduleSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  scheduled_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  field_name: z.string().trim().min(1).max(60),
  field_maps_url: z
    .union([z.string().url(), z.literal('')])
    .optional()
    .transform((val) => (val === '' || !val ? null : val))
    .nullable(),
  modality: z.enum(['F5', 'F6', 'F7', 'F8', 'F9', 'F11']),
  notes: z.string().trim().max(500).nullable().optional(),
  days_ahead: z.number().int().min(1).max(14).optional().default(4),
});

export type RecurringScheduleInput = z.infer<typeof recurringScheduleSchema>;
