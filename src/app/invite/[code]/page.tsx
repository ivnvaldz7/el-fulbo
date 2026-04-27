import Link from 'next/link';
import { redirect } from 'next/navigation';
import { UsersRound } from 'lucide-react';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { getInvitePreview } from '@/lib/services/invite.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AcceptInviteButton } from './accept-invite-button';

export default async function InvitePage({ params }: { params: { code: string } }) {
  const inviteCode = decodeURIComponent(params.code).toUpperCase();
  const supabase = createServerSupabaseClient();
  const preview = await getInvitePreview(supabase, inviteCode);

  if (!preview.ok) {
    redirect('/join?error=invalid');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('group_id')
      .eq('group_id', preview.data.groupId)
      .eq('user_id', user.id)
      .is('archived_at', null)
      .maybeSingle();

    if (existingPlayer?.group_id) {
      redirect(`/groups/${existingPlayer.group_id}/dashboard`);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-8 text-sm font-black text-cancha">
        Volver
      </Link>

      <section className="rounded-card border border-black/10 bg-white/80 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-card bg-cancha text-cal">
            <UsersRound className="h-7 w-7" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-noche">{preview.data.groupName}</h1>
            <p className="mt-1 text-sm font-bold text-neutral-600">
              {preview.data.defaultModality} · {preview.data.activePlayers} jugadores · Organizado por{' '}
              {preview.data.adminName}
            </p>
          </div>
        </div>

        <p className="mt-8 text-2xl font-black text-noche">Te invitaron a unirte a este grupo.</p>
        <p className="mt-2 text-neutral-700">
          Usamos tu cuenta de Google para guardar tu carta y tus partidos.
        </p>

        <div className="mt-8">
          {user ? (
            <AcceptInviteButton inviteCode={inviteCode} />
          ) : (
            <GoogleSignInButton nextPath={`/invite/${inviteCode}`} />
          )}
        </div>
      </section>
    </main>
  );
}
