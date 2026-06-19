import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PlayerCardPreview } from '@/components/cards/player-card-preview';
import { resolveInviteState } from '@/lib/services/invite.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ReactivateButton } from './reactivate-button';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { FloatingPanel } from '@/components/ui/floating-panel';

function timeAgoLabel(dateIso: string) {
  const now = new Date();
  const then = new Date(dateIso);
  const diffDays = Math.max(1, Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24)));

  if (diffDays < 30) return `${diffDays} día${diffDays === 1 ? '' : 's'}`;
  const months = Math.floor(diffDays / 30);
  return `${months} mes${months === 1 ? '' : 'es'}`;
}

export default async function InviteWelcomeBackPage({ params }: { params: { code: string } }) {
  const inviteCode = decodeURIComponent(params.code).toUpperCase();
  const resolution = await resolveInviteState(createServerSupabaseClient(), inviteCode);

  if (!resolution.ok) {
    redirect('/join?error=invalid');
  }

  if (resolution.data.kind !== 'voluntary_returner') {
    redirect(`/invite/${inviteCode}`);
  }

  const { preview, archivedPlayer } = resolution.data;

  return (
    <ImmersiveScreen align="center" contentClassName="mx-auto max-w-[390px] lg:max-w-[480px]">
      <div className="mb-8 flex justify-center">
        <PlayerCardPreview
          name={archivedPlayer.displayName}
          position={archivedPlayer.primaryPosition}
          stats={archivedPlayer.stats}
          pending={archivedPlayer.statsStatus === 'pending_approval'}
        />
      </div>

      <FloatingPanel className="text-center border-2 border-pitch-green/20">
        <header className="mb-6">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">¡Volviste!</p>
          <h1 className="mt-2 font-headline text-2xl font-black italic uppercase leading-none text-white">
            TU CARTA EN {preview.groupName}
          </h1>
          <p className="mt-4 font-headline text-sm font-medium leading-relaxed text-white/60">
            Te fuiste hace <span className="text-white">{timeAgoLabel(archivedPlayer.archivedAt)}</span>. 
            Podés volver ahora mismo con tus stats e historial intactos.
          </p>
        </header>

        <div className="mt-8 flex flex-col gap-3">
          <ReactivateButton playerId={archivedPlayer.id} fallbackGroupId={preview.groupId} />
          <Link
            href="/"
            className="flex min-h-12 w-full items-center justify-center border-2 border-white/10 bg-black/40 font-headline text-xs font-bold uppercase tracking-widest text-white/60 transition-colors active:bg-white/5"
          >
            Prefiero no volver
          </Link>
        </div>
      </FloatingPanel>
    </ImmersiveScreen>
  );
}
