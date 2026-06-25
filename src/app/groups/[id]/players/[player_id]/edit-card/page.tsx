import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { EditCardForm } from './edit-card-form';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';

export default async function EditPlayerCardPage({
  params,
}: {
  params: Promise<{ id: string; player_id: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/');
  const { id, player_id } = await params;

  // Verify membership and role
  const { data: membership } = await supabase
    .from('group_memberships')
    .select('role')
    .eq('group_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  const isAdminOrOwner = membership?.role === 'admin' || membership?.role === 'owner';

  if (!isAdminOrOwner) {
    redirect(`/groups/${id}/players/${player_id}`);
  }

  const { data: player } = await supabase
    .from('players')
    .select('display_name, primary_position, stats')
    .eq('id', player_id)
    .eq('group_id', id)
    .is('archived_at', null)
    .single();

  if (!player) redirect(`/groups/${id}/dashboard`);

  return (
    <ImmersiveScreen align="center" className="flex-col py-12">
      <h1 className="font-headline text-3xl font-black italic uppercase text-white">Editar Carta</h1>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-pitch-green">
        Modo Dios (Solo Admins)
      </p>

      <div className="mt-8 flex w-full justify-center">
        <EditCardForm
          groupId={id}
          playerId={player_id}
          initialName={player.display_name}
          initialPosition={player.primary_position}
          initialStats={player.stats}
        />
      </div>
    </ImmersiveScreen>
  );
}
