import Link from 'next/link';
import { redirect } from 'next/navigation';
import { resolveInviteState } from '@/lib/services/invite.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { RequestReturnForm } from './request-return-form';

export default async function InviteRequestReturnPage({ params }: { params: { code: string } }) {
  const inviteCode = decodeURIComponent(params.code).toUpperCase();
  const resolution = await resolveInviteState(createServerSupabaseClient(), inviteCode);

  if (!resolution.ok) {
    redirect('/join?error=invalid');
  }

  if (resolution.data.kind !== 'expelled_can_request') {
    redirect(`/invite/${inviteCode}`);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-5 py-10">
      <section className="rounded-card border border-black/10 bg-white/80 p-6 shadow-sm">
        <h1 className="text-3xl font-black text-noche">Para volver necesitás que el admin te apruebe</h1>
        <p className="mt-4 text-neutral-700">
          Fuiste sacado del grupo. Si querés volver, mandá una solicitud al admin.
        </p>

        <RequestReturnForm inviteCode={inviteCode} />

        <Link
          href="/"
          className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-card border border-black/15 px-5 py-3 text-sm font-black text-noche"
        >
          No, gracias
        </Link>
      </section>
    </main>
  );
}
