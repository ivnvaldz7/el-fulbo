import { redirect } from 'next/navigation';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { FloatingPanel } from '@/components/ui/floating-panel';
import { CreateTeamForm } from '@/components/teams/create-team-form';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function NewTeamPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <ImmersiveScreen align="center" contentClassName="mx-auto max-w-[390px] lg:max-w-[480px]">
      <FloatingPanel className="border-2 border-white/10">
        <header className="mb-8">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">Roster fijo</p>
          <h1 className="mt-2 font-headline text-3xl font-black italic uppercase leading-none text-white">NUEVO EQUIPO</h1>
          <p className="mt-3 font-headline text-base font-medium leading-tight text-white/60">
            Elegí nombre y tu posición. Después invitas al resto.
          </p>
        </header>

        <CreateTeamForm />
      </FloatingPanel>
    </ImmersiveScreen>
  );
}
