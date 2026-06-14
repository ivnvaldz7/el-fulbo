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

  const { data: memberships, error } = await supabase
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

  if (error) {
    console.error('Error fetching memberships:', error);
  }

  const hasGroups = memberships && memberships.length > 0;

  return (
    <ImmersiveScreen align="center" contentClassName="mx-auto max-w-[390px] w-full py-8 px-4">
      <FloatingPanel className="border-2 border-white/10 p-6">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-headline text-3xl font-black italic uppercase leading-none text-white">Mis Equipos</h1>
            <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-pitch-green">Hub Principal</p>
          </div>
        </header>

        {hasGroups ? (
          <div className="flex flex-col gap-4">
            {memberships.map((membership) => {
              const group = membership.groups as unknown as { name: string; default_modality: string };
              const isAdmin = membership.role === 'admin' || membership.role === 'owner';
              return (
                <div
                  key={membership.group_id}
                  className="group relative flex flex-col justify-between overflow-hidden border-2 border-white/10 bg-absolute-dark p-5 transition-all hover:border-pitch-green/50"
                >
                  <Link
                    href={`/groups/${membership.group_id}/dashboard`}
                    className="absolute inset-0 z-0"
                    aria-label={`Ir al dashboard de ${group.name}`}
                  />
                  <div className="relative z-10 flex items-start justify-between pointer-events-none">
                    <div>
                      <h2 className="font-headline text-xl font-black uppercase italic text-white transition-colors group-hover:text-pitch-green">
                        {group.name}
                      </h2>
                      <p className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
                        {group.default_modality}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pointer-events-auto">
                      {isAdmin && (
                        <>
                          <div className="flex h-8 items-center rounded-full bg-pitch-green/10 px-3 font-mono text-[9px] font-bold uppercase tracking-wider text-pitch-green">
                            Admin
                          </div>
                          <DeleteGroupButton groupId={membership.group_id} groupName={group.name} />
                        </>
                      )}
                    </div>
                  </div>
                </div>
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
            className="flex h-14 w-full items-center justify-center gap-2 bg-pitch-green px-4 font-headline text-sm font-bold uppercase tracking-widest text-black transition-transform active:scale-95"
          >
            <Plus className="h-5 w-5" />
            Crear Nuevo Equipo
          </Link>
        </div>
      </FloatingPanel>
    </ImmersiveScreen>
  );
}
