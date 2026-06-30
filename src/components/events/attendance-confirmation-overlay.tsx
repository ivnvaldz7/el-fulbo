'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { AttendanceStatus } from '@/lib/types';

const ATTENDANCE_OPTIONS: Array<{ value: AttendanceStatus; label: string }> = [
  { value: 'going', label: 'Voy' },
  { value: 'not_going', label: 'No voy' },
  { value: 'maybe', label: 'Tal vez' },
];

interface AttendanceConfirmationOverlayProps {
  eventId: string;
  onClose: () => void;
}

export function AttendanceConfirmationOverlay({ eventId, onClose }: AttendanceConfirmationOverlayProps) {
  const [saving, setSaving] = useState(false);
  const supabase = createBrowserSupabaseClient();

  async function handleConfirm(status: AttendanceStatus) {
    setSaving(true);
    try {
      const { error } = await supabase.rpc('update_attendance', {
        p_event_id: eventId,
        p_status: status,
      });

      if (error) throw error;

      toast.success(
        status === 'going' ? '¡Confirmaste tu asistencia!' :
        status === 'not_going' ? 'Avisaste que no vas.' :
        'Quedaste como tal vez.',
      );
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No pudimos guardar tu respuesta.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-sm border border-white/10 bg-absolute-dark p-6">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">
          Confirmación
        </p>
        <h2 className="mt-2 font-headline text-2xl font-black italic uppercase tracking-tight text-white">
          ¿Vas al partido?
        </h2>
        <p className="mt-2 text-sm text-white/60">
          Decile al organizador si contás con vos.
        </p>

        <div className="mt-6 grid gap-3">
          {ATTENDANCE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => void handleConfirm(option.value)}
              disabled={saving}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-4 font-headline text-lg font-bold italic uppercase tracking-tight text-white transition hover:border-white/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="mt-4 w-full py-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white/70 disabled:opacity-50"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
