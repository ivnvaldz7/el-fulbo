import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, User } from 'lucide-react';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { FloatingPanel } from '@/components/ui/floating-panel';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PlayerCardPreview } from '@/components/cards/player-card-preview';
import type { PlayerPosition, PlayerStats } from '@/lib/types';
import { routes } from '@/lib/routes';

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get the FIRST active card to act as their "Base Card"
  const { data: latestCard } = await supabase
    .from('players')
    .select('*')
    .eq('user_id', user.id)
    .is('archived_at', null)
    .order('joined_at', { ascending: true })
    .limit(1)
    .single();

  let clampedStats = null;
  if (latestCard?.stats) {
    clampedStats = { ...latestCard.stats } as Record<string, number>;
    for (const key in clampedStats) {
      if (typeof clampedStats[key] === 'number' && clampedStats[key] < 50) {
        clampedStats[key] = 50;
      }
    }
  }

  return (
    <ImmersiveScreen align="center" contentClassName="mx-auto max-w-[390px] lg:max-w-[480px] w-full py-8">
      <FloatingPanel className="border-2 border-white/10 p-6">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <Link
              href={routes.groups}
              className="group mb-4 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Volver al Hub
            </Link>
            <h1 className="font-headline text-3xl font-black italic uppercase leading-none text-white text-balance">
              Mi Perfil
            </h1>
            <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-pitch-green">
              Identidad Global
            </p>
          </div>
        </header>

        <div className="mb-6 rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-balance font-mono text-xs text-white/60 leading-relaxed">
            Esta es tu <strong className="text-white">Carta Base</strong>. Es un reflejo de tu ficha activa más reciente. Cuando te unas a un nuevo equipo o torneo, ingresarás con estos stats como punto de partida.
          </p>
        </div>

        {latestCard ? (
          <div className="flex flex-col items-center">
            <PlayerCardPreview
              name={latestCard.display_name}
              position={latestCard.primary_position as PlayerPosition}
              stats={clampedStats as unknown as PlayerStats}
              photoUrl={latestCard.photo_url}
              showBoostIndicator={false}
            />
            <Link
              href={routes.groupPlayer(latestCard.group_id, latestCard.id)}
              className="mt-6 flex min-h-12 w-full items-center justify-center border border-white/20 px-6 font-headline text-sm font-bold italic uppercase text-white/70 transition-colors hover:border-white/40 hover:bg-white/5 hover:text-white active:scale-95"
            >
              Ver carta en el equipo
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4 rounded-xl border border-dashed border-white/20 bg-white/5 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white/50">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="font-headline text-lg font-bold text-white">No tenés carta base</p>
              <p className="mt-1 max-w-[240px] font-mono text-[10px] text-white/40">
                Tu carta base se creará automáticamente cuando te unas a tu primer grupo.
              </p>
            </div>
          </div>
        )}
      </FloatingPanel>
    </ImmersiveScreen>
  );
}
