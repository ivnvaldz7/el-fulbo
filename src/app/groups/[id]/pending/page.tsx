import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PlayerCardPreview } from '@/components/cards/player-card-preview';
import { getCurrentUserPlayerInGroup } from '@/lib/services/player.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { FloatingPanel } from '@/components/ui/floating-panel';

export default async function PendingPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const player = await getCurrentUserPlayerInGroup(supabase, params.id);

  if (!player.ok) {
    redirect('/');
  }

  if (player.data.statsStatus === 'approved') {
    redirect(`/groups/${params.id}/dashboard`);
  }

  return (
    <ImmersiveScreen align="center" contentClassName="mx-auto max-w-[390px]">
      <div className="mb-8 flex justify-center">
        <PlayerCardPreview
          name={player.data.displayName}
          position={player.data.primaryPosition}
          stats={player.data.stats!}
          currentBoost={player.data.currentBoost}
          pending
        />
      </div>

      <FloatingPanel className="text-center border-2 border-pitch-green/20">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">Estado: Pendiente</p>
        <h1 className="mt-2 font-headline text-2xl font-black italic uppercase leading-none text-white">
          ESPERANDO APROBACIÓN
        </h1>
        <p className="mt-4 font-headline text-sm font-medium text-white/60">
          El admin tiene que darte el visto bueno para que puedas confirmar asistencia a los partidos.
        </p>
        
        <Link
          href={`/groups/${params.id}/dashboard`}
          className="mt-8 flex min-h-14 w-full items-center justify-center bg-pitch-green px-8 font-headline text-lg font-bold italic uppercase text-black transition-transform active:scale-95"
        >
          EXPLORAR EL GRUPO
        </Link>
      </FloatingPanel>
    </ImmersiveScreen>
  );
}
