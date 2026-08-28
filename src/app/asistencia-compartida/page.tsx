import type { ReactNode } from 'react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { FloatingPanel } from '@/components/ui/floating-panel';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { routes } from '@/lib/routes';
import { sharedAttendanceSearchParamsSchema } from '@/lib/validations/shared-attendance';
import { SharedAttendanceClient } from '@/components/events/shared-attendance-client';

function AccessState({ children }: { children: ReactNode }) {
  return (
    <ImmersiveScreen align="center" contentClassName="mx-auto max-w-md">
      <FloatingPanel className="text-center">{children}</FloatingPanel>
    </ImmersiveScreen>
  );
}

export default async function SharedAttendancePage(props: {
  searchParams?: Promise<{ eventId?: string | string[] }>;
}) {
  const searchParams = await props.searchParams;
  const rawEventId = Array.isArray(searchParams?.eventId)
    ? searchParams.eventId[0]
    : searchParams?.eventId;
  const parsed = sharedAttendanceSearchParamsSchema.safeParse({ eventId: rawEventId });

  if (!parsed.success) {
    return (
      <AccessState>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-red-300">
          Enlace inválido
        </p>
        <h1 className="mt-3 font-headline text-2xl font-black italic uppercase text-white">
          No encontramos el partido
        </h1>
        <p className="mt-3 text-sm text-white/60">
          Pedile a quien organiza que te comparta un enlace nuevo.
        </p>
      </AccessState>
    );
  }

  const eventId = parsed.data.eventId;
  const nextPath = routes.sharedAttendance(eventId);
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AccessState>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">
          Convocatoria privada
        </p>
        <h1 className="mt-3 font-headline text-2xl font-black italic uppercase text-white">
          Entrá para verla
        </h1>
        <p className="mt-3 text-sm text-white/60">
          Solo los miembros de El Fulbo pueden consultar y responder la convocatoria.
        </p>
        <div className="mt-6">
          <GoogleSignInButton nextPath={nextPath} />
        </div>
      </AccessState>
    );
  }

  return <SharedAttendanceClient eventId={eventId} />;
}
