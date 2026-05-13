import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { RecurringClient } from './recurring-client';
import type { RecurringSchedule } from './recurring-client';

export default async function RecurringSchedulePage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/welcome');

  const { data: isAdmin } = await supabase.rpc('is_group_admin', { gid: params.id });
  if (!isAdmin) redirect(`/groups/${params.id}/dashboard`);

  const { data: schedules } = await supabase
    .from('group_recurring_schedules')
    .select('*')
    .eq('group_id', params.id)
    .eq('active', true)
    .order('day_of_week', { ascending: true });

  return (
    <ImmersiveScreen align="center" className="flex-col">
      <header className="fixed top-0 z-30 flex h-16 w-full max-w-[390px] items-center justify-between border-b-2 border-white/10 bg-absolute-dark px-4">
        <Link
          href={`/groups/${params.id}/dashboard`}
          className="text-pitch-green active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="font-headline text-xl font-black italic uppercase tracking-tighter text-white">
          PARTIDO FIJO
        </h1>
        <div className="w-6" />
      </header>

      <main className="mt-16 flex w-full max-w-[390px] flex-col px-6">
        <section className="py-6">
          <h2 className="font-headline text-3xl font-bold uppercase italic leading-none text-white">
            Calendario fijo
          </h2>
          <p className="font-mono text-[10px] uppercase text-pitch-green mt-1">
            El evento se crea automáticamente y se notifica a todos los jugadores
          </p>
        </section>

        <RecurringClient
          groupId={params.id}
          schedules={(schedules ?? []) as RecurringSchedule[]}
        />
      </main>
    </ImmersiveScreen>
  );
}
