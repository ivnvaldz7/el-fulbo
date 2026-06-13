import { NextResponse } from 'next/server';
import type { AppError } from '@/lib/types';
import { mapSupabaseError } from '@/lib/services/errors';

export type ApiResponse<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: AppError;
};

export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ ok: true, data }, { status });
}

export function errorResponse(error: AppError, status = 400): NextResponse<ApiResponse> {
  return NextResponse.json({ ok: false, error }, { status });
}

export function handleApiError(error: unknown, fallbackStatus = 500): NextResponse<ApiResponse> {
  if (error instanceof Error) {
    const appError = mapSupabaseError(error);
    const status = appError.code === 'FORBIDDEN' ? 403 : appError.code === 'UNAUTHORIZED' ? 401 : fallbackStatus;
    return errorResponse(appError, status);
  }
  const appError = mapSupabaseError(error);
  return errorResponse(appError, fallbackStatus);
}

export async function safeJson<T = unknown>(request: Request): Promise<T> {
  try {
    return await request.json();
  } catch {
    throw new Error('VALIDATION_ERROR: Invalid JSON');
  }
}

export function withCronSecret(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  return !!(cronSecret && request.headers.get('authorization') === `Bearer ${cronSecret}`);
}

export function cronAuthError(): NextResponse<ApiResponse> {
  return errorResponse({ code: 'FORBIDDEN', message: 'No tenés permisos.' }, 403);
}
