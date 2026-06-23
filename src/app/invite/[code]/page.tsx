import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { UsersRound } from 'lucide-react';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { resolveInviteState } from '@/lib/services/invite.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AcceptInviteButton } from './accept-invite-button';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { FloatingPanel } from '@/components/ui/floating-panel';
import { AppShareButton } from '@/components/share/app-share-button';

export default async function InvitePage(props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const inviteCode = decodeURIComponent(params.code).toUpperCase();
  const supabase = await createServerSupabaseClient();
  const resolution = await resolveInviteState(supabase, inviteCode);

  if (!resolution.ok) {
    redirect('/join?error=invalid');
  }

  if (resolution.data.kind === 'invalid') {
    redirect('/join?error=invalid');
  }

  if (resolution.data.kind === 'archived') {
    redirect(
      `/invite/${inviteCode}/archived${
        resolution.data.groupName ? `?groupName=${encodeURIComponent(resolution.data.groupName)}` : ''
      }`,
    );
  }

  if (resolution.data.kind === 'active_member') {
    redirect(`/groups/${resolution.data.groupId}/dashboard`);
  }

  if (resolution.data.kind === 'group_full') {
    redirect(`/invite/${inviteCode}/group-full`);
  }

  if (resolution.data.kind === 'user_limit') {
    redirect(`/invite/${inviteCode}/user-limit`);
  }

  if (resolution.data.kind === 'voluntary_returner') {
    redirect(`/invite/${inviteCode}/welcome-back`);
  }

  if (resolution.data.kind === 'expelled_can_request') {
    redirect(`/invite/${inviteCode}/request-return`);
  }

  if (resolution.data.kind === 'expelled_pending_request') {
    redirect(`/invite/${inviteCode}/request-pending`);
  }

  const preview = resolution.data.preview;
  const isAnonymous = resolution.data.kind === 'anonymous';

  return (
    <ImmersiveScreen align="center" contentClassName="mx-auto max-w-[390px] lg:max-w-[480px]">
      <FloatingPanel className="border-2 border-white/10">
        <header className="mb-8">
          <Link href="/" className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">
            ← Volver
          </Link>
          
          <div className="mt-6 flex items-center gap-4">
            {preview.logoUrl ? (
              <div className="relative h-16 w-16 overflow-hidden border-2 border-white/10 bg-absolute-dark">
                <Image
                  src={preview.logoUrl}
                  alt={`Logo de ${preview.groupName}`}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center border-2 border-white/10 bg-absolute-dark text-pitch-green">
                <UsersRound className="h-7 w-7" aria-hidden="true" />
              </div>
            )}
            <div>
              <h1 className="font-headline text-2xl font-black italic uppercase leading-none text-white">{preview.groupName}</h1>
              <p className="mt-1 font-mono text-[9px] font-bold uppercase tracking-tight text-white/40">
                {preview.defaultModality} · {preview.activePlayers} jugadores
              </p>
            </div>
          </div>
        </header>

        <section className="mb-8">
          <p className="font-headline text-2xl font-black italic uppercase leading-tight text-white">¡Te invitaron!</p>
          <p className="mt-2 font-headline text-sm font-medium leading-relaxed text-white/60">
            Unite al grupo de <span className="text-pitch-green">{preview.adminName}</span>. 
            Usamos tu cuenta de Google para guardar tu carta y tus partidos.
          </p>
        </section>

        <div className="mt-8">
          {isAnonymous ? (
            <GoogleSignInButton nextPath={`/invite/${inviteCode}`} />
          ) : (
            <AcceptInviteButton inviteCode={inviteCode} />
          )}
          <AppShareButton />
        </div>
      </FloatingPanel>
    </ImmersiveScreen>
  );
}
