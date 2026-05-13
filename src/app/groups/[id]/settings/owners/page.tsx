import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
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
      <header className="fixed top-0 z-30 flex h-16 w-full max-w-[390px] items-center justify-between border-b-2 border-white/10 bg-absolute-dark px-4">
        <Link href={`/groups/${params.id}/dashboard`} className="text-pitch-green active:scale-95 transition-transform">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="font-headline text-xl font-black italic uppercase tracking-tighter text-white">OWNERS</h1>
        <div className="w-6"></div>
      </header>

      <main className="mt-16 flex w-full max-w-[390px] flex-col px-6">
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
