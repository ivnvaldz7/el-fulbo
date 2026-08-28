import { z } from 'zod';

export const sharedAttendanceSearchParamsSchema = z.object({
  eventId: z.string().uuid(),
});
