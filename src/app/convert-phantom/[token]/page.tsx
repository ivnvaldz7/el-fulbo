import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getTokenInfo } from '@/lib/services/phantom-player.service';
import { ConvertPhantomClient } from './convert-phantom-client';

interface Props {
  params: { token: string };
}

export default async function ConvertPhantomPage({ params }: Props) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const tokenResult = await getTokenInfo(supabase, params.token);

  if (!tokenResult.ok) {
    const { ImmersiveScreen } = await import('@/components/ui/immersive-screen');
    return (
      <ImmersiveScreen align="center" contentClassName="max-w-sm mx-auto text-center">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Link inválido</p>
        <h1 className="mt-2 font-headline text-3xl font-black italic uppercase text-white">Link inválido o expirado</h1>
        <p className="mt-3 font-mono text-sm text-white/50">Pedile al admin que te envíe uno nuevo.</p>
      </ImmersiveScreen>
    );
  }

  if (!user) {
    redirect(`/welcome?redirect=/convert-phantom/${params.token}`);
  }

  return (
    <ConvertPhantomClient
      token={params.token}
      playerName={tokenResult.data.playerName}
      groupName={tokenResult.data.groupName}
    />
  );
}
