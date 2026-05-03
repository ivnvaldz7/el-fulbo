import Link from 'next/link';
import { redirect } from 'next/navigation';
import { resolveInviteState } from '@/lib/services/invite.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-5 py-10">
      <section className="rounded-card border border-black/10 bg-white/80 p-6 shadow-sm">
        <h1 className="text-3xl font-black text-noche">Ya pediste volver</h1>
        <p className="mt-4 text-neutral-700">
          El admin no aprobó tu pedido del {formatDate(cooldown.lastRejectionAt)}. Podés volver a pedir a partir
          del {formatDate(cooldown.cooldownExpiresAt)}.
        </p>
        {cooldown.lastRejectionNote ? (
          <div className="mt-5 rounded-card border border-black/10 bg-black/5 p-4 text-sm text-neutral-700">
            <p className="font-black text-noche">Mensaje del admin</p>
            <p className="mt-2">{cooldown.lastRejectionNote}</p>
          </div>
        ) : null}
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
