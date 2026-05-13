import Link from 'next/link';
import { redirect } from 'next/navigation';
import { resolveInviteState } from '@/lib/services/invite.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { FloatingPanel } from '@/components/ui/floating-panel';

function formatDate(dateIso: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateIso));
}

export default async function InviteCooldownPage({ params }: { params: { code: string } }) {
  const inviteCode = decodeURIComponent(params.code).toUpperCase();
  const resolution = await resolveInviteState(createServerSupabaseClient(), inviteCode);

  if (!resolution.ok) {
    redirect('/join?error=invalid');
  }

  if (resolution.data.kind !== 'expelled_cooldown') {
    redirect(`/invite/${inviteCode}`);
  }

  const { cooldown } = resolution.data;

  return (
    <ImmersiveScreen align="center" contentClassName="mx-auto max-w-[390px]">
      <FloatingPanel className="text-center border-2 border-pitch-green/20">
        <header className="mb-6">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">En espera</p>
          <h1 className="mt-2 font-headline text-2xl font-black italic uppercase leading-none text-white">YA PEDISTE</h1>
          <p className="mt-4 font-headline text-sm font-medium leading-relaxed text-white/60">
            El admin no aprobó tu pedido del <span className="text-white">{formatDate(cooldown.lastRejectionAt)}</span>. 
            Podés volver a pedir a partir del <span className="text-pitch-green font-bold">{formatDate(cooldown.cooldownExpiresAt)}</span>.
          </p>
        </header>

        {cooldown.lastRejectionNote ? (
          <div className="mb-6 border border-white/10 bg-absolute-dark p-4 text-left">
            <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-white/40">Mensaje del admin</p>
            <p className="mt-2 font-headline text-sm font-medium text-white/80 italic">&ldquo;{cooldown.lastRejectionNote}&rdquo;</p>
          </div>
        ) : null}

        <Link
          href="/"
          className="mt-4 flex min-h-14 w-full items-center justify-center bg-pitch-green px-8 font-headline text-lg font-bold italic uppercase text-black transition-transform active:scale-95"
        >
          VOLVER AL INICIO
        </Link>
      </FloatingPanel>
    </ImmersiveScreen>
  );
}
