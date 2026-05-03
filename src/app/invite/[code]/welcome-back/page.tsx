import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PlayerCardPreview } from '@/components/cards/player-card-preview';
import { resolveInviteState } from '@/lib/services/invite.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ReactivateButton } from './reactivate-button';

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
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-5 py-10">
      <section className="grid items-center gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-cancha">¡Volviste!</p>
          <h1 className="mt-3 text-4xl font-black text-noche">Esta es tu carta del grupo {preview.groupName}</h1>
          <p className="mt-4 text-lg text-neutral-700">
            Te fuiste hace {timeAgoLabel(archivedPlayer.archivedAt)}. Si querés, volvés con tus stats e historial.
          </p>
          <div className="mt-8 max-w-sm">
            <ReactivateButton playerId={archivedPlayer.id} fallbackGroupId={preview.groupId} />
            <Link
              href="/"
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-card border border-black/15 px-5 py-3 text-sm font-black text-noche"
            >
              Prefiero no volver
            </Link>
          </div>
        </div>

        <PlayerCardPreview
          name={archivedPlayer.displayName}
          position={archivedPlayer.primaryPosition}
          stats={archivedPlayer.stats}
          pending={archivedPlayer.statsStatus === 'pending_approval'}
        />
      </section>
    </main>
  );
}
