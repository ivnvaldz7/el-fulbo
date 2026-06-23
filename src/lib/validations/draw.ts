import { z } from 'zod';

export const confirmDrawSchema = z.object({
  eventId: z.string().uuid(),
  seed: z.string().trim().min(1),
  assignments: z
    .array(
      z.object({
        playerId: z.string().uuid(),
        team: z.enum(['A', 'B', 'substitute']),
        assignedPosition: z.enum(['ARQ', 'DEF', 'MED', 'DEL']).nullable(),
        playedPrimaryPosition: z.boolean(),
      }),
    )
    .min(1),
  teamAName: z.string().trim().min(1).max(30),
  teamBName: z.string().trim().min(1).max(30),
});

export type ConfirmDrawData = z.infer<typeof confirmDrawSchema>;

