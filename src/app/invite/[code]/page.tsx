import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { UsersRound } from 'lucide-react';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { resolveInviteState } from '@/lib/services/invite.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AcceptInviteButton } from './accept-invite-button';

export default async function InvitePage({ params }: { params: { code: string } }) {
  const inviteCode = decodeURIComponent(params.code).toUpperCase();
  const supabase = createServerSupabaseClient();
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

  if (resolution.data.kind === 'expelled_cooldown') {
    redirect(`/invite/${inviteCode}/cooldown`);
  }

  const preview = resolution.data.preview;
  const isAnonymous = resolution.data.kind === 'anonymous';

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-8 text-sm font-black text-cancha">
        Volver
      </Link>

      <section className="rounded-card border border-black/10 bg-white/80 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          {preview.logoUrl ? (
            <Image
              src={preview.logoUrl}
              alt={`Logo de ${preview.groupName}`}
              width={64}
              height={64}
              className="h-16 w-16 rounded-card border border-black/10 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-card bg-cancha text-cal">
              <UsersRound className="h-7 w-7" aria-hidden="true" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-black text-noche">{preview.groupName}</h1>
            <p className="mt-1 text-sm font-bold text-neutral-600">
              {preview.defaultModality} · {preview.activePlayers} jugadores · Organizado por {preview.adminName}
            </p>
          </div>
        </div>

        <p className="mt-8 text-2xl font-black text-noche">¡Te invitaron!</p>
        <p className="mt-1 text-lg font-bold text-noche">Unite al fulbito de este grupo.</p>
        <p className="mt-2 text-neutral-700">
          Usamos tu cuenta de Google para guardar tu carta y tus partidos.
        </p>

        <div className="mt-8">
          {isAnonymous ? (
            <GoogleSignInButton nextPath={`/invite/${inviteCode}`} />
          ) : (
            <AcceptInviteButton inviteCode={inviteCode} />
          )}
        </div>
      </section>
    </main>
  );
}
