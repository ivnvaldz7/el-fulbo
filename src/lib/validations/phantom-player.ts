import { z } from 'zod';

export const createPhantomSchema = z.object({
  groupId: z.string().uuid(),
  eventId: z.string().uuid(),
  name: z.string().trim().min(1).max(40),
  primaryPosition: z.enum(['ARQ', 'DEF', 'MED', 'DEL']).default('MED'),
});

export const convertPhantomSchema = z.object({
  playerId: z.string().uuid(),
  email: z.string().email(),
});

export type CreatePhantomInput = z.infer<typeof createPhantomSchema>;
export type ConvertPhantomInput = z.infer<typeof convertPhantomSchema>;
