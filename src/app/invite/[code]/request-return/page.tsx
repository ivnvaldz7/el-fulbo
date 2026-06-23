import Link from 'next/link';
import { redirect } from 'next/navigation';
import { resolveInviteState } from '@/lib/services/invite.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { RequestReturnForm } from './request-return-form';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { FloatingPanel } from '@/components/ui/floating-panel';

export default async function InviteRequestReturnPage(props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const inviteCode = decodeURIComponent(params.code).toUpperCase();
  const resolution = await resolveInviteState(await createServerSupabaseClient(), inviteCode);

  if (!resolution.ok) {
    redirect('/join?error=invalid');
  }

  if (resolution.data.kind !== 'expelled_can_request') {
    redirect(`/invite/${inviteCode}`);
  }

  return (
    <ImmersiveScreen align="center" contentClassName="mx-auto max-w-[390px] lg:max-w-[480px]">
      <FloatingPanel className="border-2 border-white/10">
        <header className="mb-8">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">Solicitud</p>
          <h1 className="mt-2 font-headline text-2xl font-black italic uppercase leading-none text-white">PEDÍ VOLVER</h1>
          <p className="mt-4 font-headline text-sm font-medium leading-relaxed text-white/60">
            Fuiste sacado del grupo. Si querés volver a entrar, mandale una solicitud al admin para que te apruebe.
          </p>
        </header>

        <RequestReturnForm inviteCode={inviteCode} />

        <Link
          href="/"
          className="mt-6 flex min-h-12 w-full items-center justify-center border-2 border-white/10 bg-black/40 font-headline text-xs font-bold uppercase tracking-widest text-white/60 transition-colors active:bg-white/5"
        >
          No, gracias
        </Link>
      </FloatingPanel>
    </ImmersiveScreen>
  );
}
