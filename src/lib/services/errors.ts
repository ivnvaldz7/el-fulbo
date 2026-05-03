import type { AppError } from '@/lib/types';

const customMessages: Record<string, AppError> = {
  ADMIN_GROUP_LIMIT_REACHED: {
    code: 'ADMIN_GROUP_LIMIT_REACHED',
    message: 'Llegaste al maximo de 3 grupos como admin.',
  },
  OWNER_CAP_REACHED: {
    code: 'OWNER_CAP_REACHED',
    message: 'Ya tenes 2 owners. Remove uno para sumar otro.',
  },
  PLAYER_GROUP_LIMIT_REACHED: {
    code: 'PLAYER_GROUP_LIMIT_REACHED',
    message: 'Este grupo llego al limite de 50 jugadores.',
  },
  USER_PLAYER_GROUPS_LIMIT_REACHED: {
    code: 'USER_PLAYER_GROUPS_LIMIT_REACHED',
    message: 'Llegaste al maximo de 10 grupos.',
  },
  INVITE_CODE_INVALID: {
    code: 'INVITE_CODE_INVALID',
    message: 'Ese link de invitacion no sirve.',
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    message: 'No tenés permisos para hacer eso.',
  },
  EXPELLED_COOLDOWN_ACTIVE: {
    code: 'EXPELLED_COOLDOWN_ACTIVE',
    message: 'Todavía no podés volver a pedir. Esperá un poco más.',
  },
  REINTEGRATION_REQUEST_PENDING: {
    code: 'REINTEGRATION_REQUEST_PENDING',
    message: 'Ya mandaste una solicitud. Esperá a que el admin la revise.',
  },
  STATS_PENDING_APPROVAL: {
    code: 'STATS_PENDING_APPROVAL',
    message: 'Tus stats estan pendientes de aprobacion.',
  },
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    message: 'Algunos datos no son validos.',
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'Necesitas iniciar sesion.',
  },
  CONFLICT: {
    code: 'CONFLICT',
    message: 'Esa acción ya no coincide con el estado actual.',
  },
};

export function mapSupabaseError(error: unknown): AppError {
  const err = error as { code?: string; message?: string; details?: unknown } | null;

  if (!err) {
    return { code: 'INTERNAL_ERROR', message: 'Algo salio mal.' };
  }

  for (const [needle, appError] of Object.entries(customMessages)) {
    if (err.message?.includes(needle)) {
      return { ...appError, details: err };
    }
  }

  switch (err.code) {
    case '23505':
      return { code: 'CONFLICT', message: 'Esa accion choca con el estado actual.', details: err };
    case '23503':
    case 'PGRST116':
      return { code: 'NOT_FOUND', message: 'No encontramos lo que buscas.', details: err };
    case '42501':
    case 'PGRST301':
      if (err.message?.includes('FORBIDDEN')) {
        return { code: 'FORBIDDEN', message: 'No tenés permisos para hacer eso.', details: err };
      }
      return { code: 'UNAUTHORIZED', message: 'Necesitas iniciar sesion.', details: err };
    default:
      return { code: 'INTERNAL_ERROR', message: 'Algo salio mal.', details: err };
  }
}

export function validationError(details?: unknown): AppError {
  return {
    code: 'VALIDATION_ERROR',
    message: 'Algunos datos no son validos.',
    details,
  };
}
