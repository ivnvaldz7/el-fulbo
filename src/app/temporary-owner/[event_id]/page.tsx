import { redirect } from 'next/navigation';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getMyTemporaryOwnerAssignment } from '@/lib/services/temporary-owners.service';
import { TemporaryOwnerClient } from './temporary-owner-client';

export default async function TemporaryOwnerPage({ params }: { params: { event_id: string } }) {
  const supabase = createServerSupabaseClient();
  const result = await getMyTemporaryOwnerAssignment(supabase, params.event_id);

  if (!result.ok) {
    redirect('/');
  }

  return (
    <ImmersiveScreen align="center" className="flex-col">
      <header className="fixed top-0 z-30 mx-auto left-0 right-0 flex h-16 w-full max-w-[390px] items-center justify-center border-b border-border/40 bg-background/80 px-4 backdrop-blur-md">
        <h1 className="font-headline text-xl font-black italic uppercase tracking-tighter text-white">OWNER TEMPORAL</h1>
      </header>

      <main className="mt-16 flex w-full max-w-[390px] lg:max-w-[480px] flex-col">
        <section className="py-6">
          <h2 className="font-headline text-3xl font-bold uppercase italic leading-none text-white">
            {result.data.groupName}
          </h2>
          <p className="font-mono text-[10px] uppercase text-pitch-green mt-1">Confirmación</p>
        </section>

        <TemporaryOwnerClient
          eventId={result.data.eventId}
          groupId={result.data.groupId}
          groupName={result.data.groupName}
          scheduledAt={result.data.scheduledAt}
          fieldName={result.data.fieldName}
        />
      </main>
    </ImmersiveScreen>
  );
}
