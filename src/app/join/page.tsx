import Link from 'next/link';
import { redirect } from 'next/navigation';
import { JoinForm } from './join-form';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { FloatingPanel } from '@/components/ui/floating-panel';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function JoinPage(props: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const searchParams = await props.searchParams;
  const error =
    searchParams?.error === 'invalid'
      ? 'No encontramos ese código. Revisá el link o pedile uno nuevo a quien organiza.'
      : null;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

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
    <ImmersiveScreen align="center" contentClassName="mx-auto max-w-[390px] lg:max-w-[480px]">
      <FloatingPanel className="border-2 border-white/10">
        <header className="mb-8">
          <Link href="/" className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">
            ← Volver
          </Link>
          <h1 className="mt-4 font-headline text-3xl font-black italic uppercase leading-none text-white">UNITE AL GRUPO</h1>
          <p className="mt-3 font-headline text-base font-medium text-white/60">
            Ingresá el código que te pasaron por WhatsApp.
          </p>
        </header>

        {error ? (
          <p className="mb-6 font-mono text-[10px] font-bold uppercase text-pitch-green text-center italic">
            {error}
          </p>
        ) : null}
        
        <JoinForm />
      </FloatingPanel>
    </ImmersiveScreen>
  );
}
