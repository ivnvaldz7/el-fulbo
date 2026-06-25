import { redirect } from 'next/navigation';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { PageHeader } from '@/components/ui/page-header';
import { OwnersSettingsClient } from './owners-settings-client';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getOwnersSettingsData } from '@/lib/services/owners.service';

export default async function OwnersSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { id } = await params;
  const result = await getOwnersSettingsData(supabase, id);

  if (!result.ok) {
    redirect(`/groups/${id}/dashboard`);
  }

  return (
    <ImmersiveScreen align="center" className="flex-col">
      <PageHeader title="OWNERS" backHref={`/groups/${id}/dashboard`} />

      <main className="mt-16 flex w-full max-w-[390px] lg:max-w-[480px] flex-col">
        <section className="py-6">
          <h2 className="font-headline text-3xl font-bold uppercase italic leading-none text-white">
            {result.data.groupName}
          </h2>
          <p className="font-mono text-[10px] uppercase text-pitch-green mt-1">Gestión de owners</p>
        </section>

        <OwnersSettingsClient
          groupId={result.data.groupId}
          owners={result.data.owners}
          candidates={result.data.candidates}
        />
      </main>
    </ImmersiveScreen>
  );
}
