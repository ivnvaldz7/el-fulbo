'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { routes } from '@/lib/routes';
import { FloatingPanel } from '@/components/ui/floating-panel';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { createSharedGuestKey, readSharedGuestKey, useSharedGuestKey } from './shared-guest-key';

type SharedAttendee = {
  playerId: string;
  displayName: string;
  status: 'going' | 'maybe' | 'waitlist';
  isGuest: boolean;
};

type SharedEvent = {
  id: string;
  fieldName: string;
  scheduledAt: string;
  modality: string;
  notes: string | null;
  maxPlayers: number;
  guestPlayerId: string | null;
};

type SharedAttendance = {
  groupName: string;
  event: SharedEvent | null;
  attendees: SharedAttendee[];
};

function countdown(scheduledAt: string) {
  const hours = Math.max(0, Math.ceil((new Date(scheduledAt).getTime() - Date.now()) / 36e5));
  if (hours < 1) return 'Es hoy';
  if (hours < 24) return `Faltan ${hours} horas`;
  const days = Math.ceil(hours / 24);
  return `Faltan ${days} ${days === 1 ? 'día' : 'días'}`;
}

export function SharedGroupAttendanceClient({ shareToken }: { shareToken: string }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const queryClient = useQueryClient();
  const guestKey = useSharedGuestKey(shareToken);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, isPending, error } = useQuery({
    queryKey: ['shared-group-attendance', shareToken, guestKey],
    queryFn: async () => {
      const { data: result, error: rpcError } = await supabase.rpc('get_shared_group_attendance', {
        p_share_token: shareToken,
        p_guest_key: guestKey,
      });
      if (rpcError) throw new Error(rpcError.message);
      return result as SharedAttendance;
    },
  });

  async function reserve(status: 'going' | 'not_going') {
    if (!data?.event) return;
    const key = guestKey ?? readSharedGuestKey(shareToken) ?? createSharedGuestKey(shareToken);
    if (!key) return;
    if (status === 'going' && name.trim().length < 2) {
      toast.error('Escribí cómo te dicen para anotarte.');
      return;
    }

    setSaving(true);
    try {
      const { error: rpcError } = await supabase.rpc('reserve_shared_guest_attendance', {
        p_share_token: shareToken,
        p_event_id: data.event.id,
        p_guest_key: key,
        p_display_name: name.trim() || 'Invitado',
        p_status: status,
      });
      if (rpcError) throw new Error(rpcError.message);
      toast.success(
        status === 'going' ? 'Tu lugar quedó reservado.' : 'Te bajaste de la convocatoria.',
      );
      await queryClient.invalidateQueries({ queryKey: ['shared-group-attendance', shareToken] });
    } catch (reservationError) {
      toast.error(
        reservationError instanceof Error
          ? reservationError.message
          : 'No pudimos guardar tu respuesta.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (isPending) {
    return (
      <ImmersiveScreen align="center" contentClassName="mx-auto max-w-md">
        <FloatingPanel>Buscando convocatoria...</FloatingPanel>
      </ImmersiveScreen>
    );
  }

  if (error || !data) {
    return (
      <ImmersiveScreen align="center" contentClassName="mx-auto max-w-md">
        <FloatingPanel>No pudimos abrir esta convocatoria.</FloatingPanel>
      </ImmersiveScreen>
    );
  }

  if (!data.event) {
    return (
      <ImmersiveScreen align="center" contentClassName="mx-auto max-w-md">
        <FloatingPanel className="text-center">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">
            {data.groupName}
          </p>
          <h1 className="mt-3 font-headline text-3xl font-black italic uppercase text-white">
            Todavía no hay convocatoria
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Cuando el grupo abra el próximo fulbo, este mismo enlace va a mostrarla.
          </p>
        </FloatingPanel>
      </ImmersiveScreen>
    );
  }

  const going = data.attendees.filter((attendee) => attendee.status === 'going');
  const waitlist = data.attendees.filter((attendee) => attendee.status === 'waitlist');
  const guestAttendee = data.event.guestPlayerId
    ? data.attendees.find((attendee) => attendee.playerId === data.event?.guestPlayerId)
    : null;
  const eventDate = new Date(data.event.scheduledAt);

  return (
    <ImmersiveScreen align="center" contentClassName="mx-auto max-w-md py-6">
      <div className="rounded-[2rem] bg-white/5 p-1.5 ring-1 ring-white/10">
        <FloatingPanel className="bg-[#0b100d] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-pitch-green">
            {data.groupName}
          </p>
          <h1 className="mt-3 font-headline text-3xl font-black italic uppercase leading-none text-white">
            Próximo fulbo
          </h1>
          <p className="mt-3 text-sm font-semibold text-white/75">
            {eventDate.toLocaleDateString('es-AR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}{' '}
            · {eventDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="mt-1 text-sm text-white/55">
            {data.event.fieldName} · {data.event.modality}
          </p>
          <p className="mt-4 inline-flex rounded-full bg-pitch-green/15 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-pitch-green">
            {countdown(data.event.scheduledAt)}
          </p>

          <section className="mt-7 rounded-2xl bg-black/35 p-4 ring-1 ring-white/10">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-headline text-xl font-black italic uppercase text-white">
                {going.length} de {data.event.maxPlayers}
              </h2>
              <span className="font-mono text-[10px] font-bold uppercase text-white/45">
                Confirmados
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {going.length ? (
                going.map((attendee) => (
                  <span
                    key={attendee.playerId}
                    className="rounded-full bg-white/8 px-3 py-1.5 text-sm font-semibold text-white/75"
                  >
                    {attendee.displayName}
                  </span>
                ))
              ) : (
                <p className="text-sm text-white/45">Todavía no se anotó nadie.</p>
              )}
            </div>
            {waitlist.length ? (
              <p className="mt-4 text-xs text-amber-300">{waitlist.length} en lista de espera</p>
            ) : null}
          </section>

          {guestAttendee ? (
            <section className="mt-5">
              <p className="text-sm font-semibold text-pitch-green">
                {guestAttendee.status === 'waitlist'
                  ? 'Quedaste en espera.'
                  : 'Tu lugar está reservado.'}
              </p>
              <button
                type="button"
                onClick={() => void reserve('not_going')}
                disabled={saving}
                className="mt-3 min-h-11 w-full border border-white/15 px-4 font-headline text-sm font-black uppercase text-white/70 transition-colors hover:border-white/40 hover:text-white disabled:opacity-50"
              >
                Bajarme
              </button>
            </section>
          ) : (
            <section className="mt-5">
              <label className="block font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
                ¿Cómo te dicen?
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={40}
                placeholder="Tu apodo"
                className="mt-2 min-h-12 w-full rounded-xl bg-white/7 px-4 text-white outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-pitch-green"
              />
              <button
                type="button"
                onClick={() => void reserve('going')}
                disabled={saving}
                className="mt-3 min-h-12 w-full rounded-full bg-pitch-green px-5 font-headline text-base font-black uppercase text-black transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Me anoto'}
              </button>
            </section>
          )}

          <Link
            href={routes.sharedAttendance(data.event.id)}
            className="mt-5 block text-center font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white/45 hover:text-white"
          >
            Ya usás El Fulbo. Abrir mi asistencia
          </Link>
        </FloatingPanel>
      </div>
    </ImmersiveScreen>
  );
}
