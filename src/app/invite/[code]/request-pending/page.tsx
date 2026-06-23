import Link from 'next/link';
import { redirect } from 'next/navigation';
import { resolveInviteState } from '@/lib/services/invite.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { FloatingPanel } from '@/components/ui/floating-panel';

function daysAgoLabel(dateIso: string) {
  const now = new Date();
  const then = new Date(dateIso);
  const diffDays = Math.max(1, Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24)));
  return `${diffDays} día${diffDays === 1 ? '' : 's'}`;
}

export default async function InviteRequestPendingPage({ params }: { params: { code: string } }) {
  const inviteCode = decodeURIComponent(params.code).toUpperCase();
  const resolution = await resolveInviteState(await createServerSupabaseClient(), inviteCode);

  if (!resolution.ok) {
    redirect('/join?error=invalid');
  }

  if (resolution.data.kind !== 'expelled_pending_request') {
    redirect(`/invite/${inviteCode}`);
  }

  return (
    <ImmersiveScreen align="center" contentClassName="mx-auto max-w-[390px] lg:max-w-[480px]">
      <FloatingPanel className="text-center border-2 border-pitch-green/20">
        <header className="mb-6">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">Pendiente</p>
          <h1 className="mt-2 font-headline text-2xl font-black italic uppercase leading-none text-white">YA MANDASTE</h1>
          <p className="mt-4 font-headline text-sm font-medium leading-relaxed text-white/60">
            Mandaste la solicitud hace <span className="text-white">{daysAgoLabel(resolution.data.requestCreatedAt)}</span>. 
            Esperá que el admin la revise para poder volver a la cancha.
          </p>
        </header>

        <Link
          href="/"
          className="mt-8 flex min-h-14 w-full items-center justify-center bg-pitch-green px-8 font-headline text-lg font-bold italic uppercase text-black transition-transform active:scale-95"
        >
          VOLVER AL INICIO
        </Link>
      </FloatingPanel>
    </ImmersiveScreen>
  );
}
