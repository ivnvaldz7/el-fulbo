import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { FloatingPanel } from '@/components/ui/floating-panel';
import { RewardsHub } from '@/components/rewards/rewards-hub';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { routes } from '@/lib/routes';

export default async function RewardsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(routes.login);
  }

  // Ensure they have a base card first
  const { data: baseCard } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .is('archived_at', null)
    .order('joined_at', { ascending: true })
    .limit(1)
    .single();

  if (!baseCard) {
    redirect('/onboarding-global');
  }

  return (
    <ImmersiveScreen align="center" contentClassName="mx-auto w-full max-w-[480px] py-8">
      <FloatingPanel className="border-2 border-white/10 p-6">
        <header className="mb-8">
          <Link
            href="/teams"
            className="group mb-4 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Volver a Equipos
          </Link>
          <h1 className="font-headline text-3xl font-black italic uppercase leading-none text-white text-balance">
            Tus Recompensas
          </h1>
          <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-pitch-green">
            Progreso y Mejoras
          </p>
        </header>

        <RewardsHub />
      </FloatingPanel>
    </ImmersiveScreen>
  );
}
