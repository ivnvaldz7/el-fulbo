import { z } from 'zod';
import { EventModality } from '@/lib/types/events.types';

export const createEventSchema = z.object({
  date: z.string().min(1, 'La fecha es obligatoria'),
  time: z.string().min(1, 'La hora es obligatoria'),
  modality: z.enum(['F5', 'F6', 'F7', 'F8', 'F11'], {
    message: 'Modalidad inválida',
  }),
  locationName: z.string().trim().min(1, 'El nombre de la cancha no puede estar vacío.').max(100, 'Máximo 100 caracteres'),
  googleMapsLink: z.string().url('El link de Google Maps no es una URL válida.').optional().or(z.literal('')),
  notes: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  const scheduledAt = new Date(`${data.date}T${data.time}:00`);
  const now = new Date();
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(now.getFullYear() + 1);

  if (scheduledAt < now) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La fecha y hora no pueden ser en el pasado.',
      path: ['date'],
    });
  }

  if (scheduledAt > oneYearFromNow) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La fecha no puede ser más de un año en el futuro.',
      path: ['date'],
    });
  }
});

export type CreateEventData = z.infer<typeof createEventSchema>;
