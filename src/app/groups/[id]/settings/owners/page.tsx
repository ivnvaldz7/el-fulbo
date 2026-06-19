import { redirect } from 'next/navigation';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { PageHeader } from '@/components/ui/page-header';
import { OwnersSettingsClient } from './owners-settings-client';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getOwnersSettingsData } from '@/lib/services/owners.service';

export default async function OwnersSettingsPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const result = await getOwnersSettingsData(supabase, params.id);

  if (!result.ok) {
    redirect(`/groups/${params.id}/dashboard`);
  }

  return (
    <ImmersiveScreen align="center" className="flex-col">
      <PageHeader title="OWNERS" backHref={`/groups/${params.id}/dashboard`} />

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
