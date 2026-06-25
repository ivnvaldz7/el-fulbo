import { redirect } from 'next/navigation';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { PageHeader } from '@/components/ui/page-header';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { RecurringClient } from './recurring-client';
import type { RecurringSchedule } from './recurring-client';

export default async function RecurringSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/welcome');
  const { id } = await params;

  const { data: isAdmin } = await supabase.rpc('is_group_admin', { gid: id });
  if (!isAdmin) redirect(`/groups/${id}/dashboard`);

  const { data: schedules } = await supabase
    .from('group_recurring_schedules')
    .select('*')
    .eq('group_id', id)
    .eq('active', true)
    .order('day_of_week', { ascending: true });

  return (
    <ImmersiveScreen align="center" className="flex-col">
      <PageHeader title="PARTIDO FIJO" backHref={`/groups/${id}/dashboard`} />

      <main className="mt-16 flex w-full max-w-[390px] lg:max-w-[480px] flex-col">
        <section className="py-6">
          <h2 className="font-headline text-3xl font-bold uppercase italic leading-none text-white">
            Calendario fijo
          </h2>
          <p className="font-mono text-[10px] uppercase text-pitch-green mt-1">
            El evento se crea automáticamente y se notifica a todos los jugadores
          </p>
        </section>

        <RecurringClient
          groupId={id}
          schedules={(schedules ?? []) as RecurringSchedule[]}
        />
      </main>
    </ImmersiveScreen>
  );
}
