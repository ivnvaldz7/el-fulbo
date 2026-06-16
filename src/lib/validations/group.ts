import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, 'Ponele un nombre al grupo').max(40, 'Maximo 40 caracteres'),
  modality: z.enum(['F5', 'F6', 'F7', 'F8', 'F11']),
});

export type CreateGroupData = z.infer<typeof createGroupSchema>;
