import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogOut, Plus, Search, ShieldAlert, User } from 'lucide-react';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { FloatingPanel } from '@/components/ui/floating-panel';
import { DeleteGroupButton } from '@/components/groups/delete-group-button';

export default async function GroupsHubPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Obtener grupos donde el usuario es Admin u Owner (group_memberships)
  const { data: memberships, error: memError } = await supabase
    .from('group_memberships')
    .select(`
      role,
      group_id,
      groups!inner (
        name,
        default_modality
      )
    `)
    .eq('user_id', user.id);

  // 2. Obtener grupos donde el usuario es un Jugador regular (players)
  const { data: playerCards, error: playError } = await supabase
    .from('players')
    .select(`
      group_id,
      groups!inner (
        name,
        default_modality
      )
    `)
    .eq('user_id', user.id)
    .is('archived_at', null);

  if (memError || playError) {
    console.error('[groups] Error fetching data:', { memError: memError?.message, playError: playError?.message });
  }

  // Unificar y eliminar duplicados (por si el admin también tiene una ficha de jugador)
  const mergedGroups = new Map<string, { group_id: string; name: string; default_modality: string; isAdmin: boolean }>();

  if (memberships) {
    memberships.forEach((m) => {
      const g = m.groups as unknown as { name: string; default_modality: string };
      mergedGroups.set(m.group_id, {
        group_id: m.group_id,
        name: g.name,
        default_modality: g.default_modality,
        isAdmin: m.role === 'admin' || m.role === 'owner',
      });
    });
  }

  if (playerCards) {
    playerCards.forEach((p) => {
      if (!mergedGroups.has(p.group_id)) {
        const g = p.groups as unknown as { name: string; default_modality: string };
        mergedGroups.set(p.group_id, {
          group_id: p.group_id,
          name: g.name,
          default_modality: g.default_modality,
          isAdmin: false,
        });
      }
    });
  }

  const userGroups = Array.from(mergedGroups.values());
  const hasGroups = userGroups.length > 0;

  return (
    <ImmersiveScreen align="center" contentClassName="mx-auto max-w-[390px] w-full py-8 px-4">
      <FloatingPanel className="border-2 border-white/10 p-6">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-headline text-3xl font-black italic uppercase leading-none text-white text-balance">Mis Equipos</h1>
            <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-pitch-green">Hub Principal</p>
          </div>
        </header>

        {hasGroups ? (
          <div className="flex flex-col gap-4">
              {userGroups.map((group) => {
              return (
                <article
                  key={group.group_id}
                  className="group relative border-2 border-white/10 bg-absolute-dark transition-all duration-150 hover:border-pitch-green/50 hover:bg-white/5"
                >
                  <Link
                    href={`/groups/${group.group_id}/dashboard`}
                    className={`flex flex-col justify-between p-5 ${group.isAdmin ? 'pr-28' : ''}`}
                    aria-label={`Ir al dashboard de ${group.name}`}
                  >
                    <h2 className="font-headline text-xl font-black uppercase italic text-white transition-colors duration-150 group-hover:text-pitch-green">
                      {group.name}
                    </h2>
                    <p className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
                      {group.default_modality}
                    </p>
                  </Link>
                  {group.isAdmin && (
                    <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
                      <div className="flex h-8 items-center rounded-full bg-pitch-green/10 px-3 font-mono text-[9px] font-bold uppercase tracking-wider text-pitch-green pointer-events-none select-none">
                        Admin
                      </div>
                      <DeleteGroupButton groupId={group.group_id} groupName={group.name} />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4 rounded-xl border border-dashed border-white/20 bg-white/5 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white/50">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <p className="font-headline text-lg font-bold text-white">Todavía no estás en ningún equipo</p>
              <p className="mt-1 max-w-[240px] font-mono text-[10px] text-white/40">
                Podés crear tu propio grupo o pedirle a un amigo que te comparta su link de invitación.
              </p>
            </div>
          </div>
        )}

        <div className="mt-10 flex flex-col gap-3">
          <Link
            href="/groups/new"
            className="btn-interactive flex h-14 w-full items-center justify-center gap-2 bg-pitch-green px-4 font-headline text-sm font-bold uppercase tracking-widest text-black hover:brightness-110"
          >
            <Plus className="h-5 w-5" />
            Crear Nuevo Equipo
          </Link>
        </div>
      </FloatingPanel>
    </ImmersiveScreen>
  );
}

