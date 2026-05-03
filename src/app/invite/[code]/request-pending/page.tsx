import Link from 'next/link';
import { redirect } from 'next/navigation';
import { resolveInviteState } from '@/lib/services/invite.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function daysAgoLabel(dateIso: string) {
  const now = new Date();
  const then = new Date(dateIso);
  const diffDays = Math.max(1, Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24)));
  return `${diffDays} día${diffDays === 1 ? '' : 's'}`;
}

export default async function InviteRequestPendingPage({ params }: { params: { code: string } }) {
  const inviteCode = decodeURIComponent(params.code).toUpperCase();
  const resolution = await resolveInviteState(createServerSupabaseClient(), inviteCode);

  if (!resolution.ok) {
    redirect('/join?error=invalid');
  }

  if (resolution.data.kind !== 'expelled_pending_request') {
    redirect(`/invite/${inviteCode}`);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-5 py-10">
      <section className="rounded-card border border-black/10 bg-white/80 p-6 shadow-sm">
        <h1 className="text-3xl font-black text-noche">Ya mandaste una solicitud</h1>
        <p className="mt-4 text-neutral-700">
          Esperá que el admin la revise. La enviaste hace {daysAgoLabel(resolution.data.requestCreatedAt)}.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-card bg-noche px-5 py-3 text-sm font-black text-cal"
        >
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
