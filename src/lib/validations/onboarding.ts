import { z } from 'zod';

export const inviteCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^FULBO-[A-Z0-9]{6}$/);

export const fieldStatsSchema = z.object({
  pac: z.number().int().min(1).max(8),
  sho: z.number().int().min(1).max(8),
  pas: z.number().int().min(1).max(8),
  dri: z.number().int().min(1).max(8),
  def: z.number().int().min(1).max(8),
  phy: z.number().int().min(1).max(8),
});

export const goalkeeperStatsSchema = z.object({
  div: z.number().int().min(1).max(8),
  han: z.number().int().min(1).max(8),
  kic: z.number().int().min(1).max(8),
  ref: z.number().int().min(1).max(8),
  spd: z.number().int().min(1).max(8),
  pos: z.number().int().min(1).max(8),
});

export const playerPositionSchema = z.enum(['ARQ', 'DEF', 'MED', 'DEL']);

export const submitOnboardingStatsSchema = z
  .object({
    groupId: z.string().uuid(),
    primaryPosition: playerPositionSchema,
    secondaryPosition: playerPositionSchema.nullable(),
    stats: z.union([fieldStatsSchema, goalkeeperStatsSchema]),
  })
  .refine((data) => data.primaryPosition !== data.secondaryPosition, {
    message: 'La posicion secundaria debe ser distinta a la primaria',
    path: ['secondaryPosition'],
  })
  .refine((data) => (data.primaryPosition === 'ARQ' ? 'div' in data.stats : 'pac' in data.stats), {
    message: 'Las stats no coinciden con la posicion',
    path: ['stats'],
  });

export type SubmitOnboardingStatsData = z.infer<typeof submitOnboardingStatsSchema>;

export const defaultFieldStats = {
  pac: 5,
  sho: 5,
  pas: 5,
  dri: 5,
  def: 5,
  phy: 5,
};

export const defaultGoalkeeperStats = {
  div: 5,
  han: 5,
  kic: 5,
  ref: 5,
  spd: 5,
  pos: 5,
};
