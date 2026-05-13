import { z } from 'zod';

export const assignOwnerSchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const removeOwnerSchema = assignOwnerSchema;
