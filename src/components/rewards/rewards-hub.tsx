import React from 'react';
import { Trophy, Star, Target, Shield, ArrowUp } from 'lucide-react';

interface MissionProgress {
  id: string;
  type: 'goal' | 'assist' | 'tackle';
  current: number;
  target: number;
  rewardStat: string;
  rewardValue: number;
}

const mockMissions: MissionProgress[] = [
  { id: '1', type: 'goal', current: 3, target: 5, rewardStat: 'Tiro', rewardValue: 1 },
  { id: '2', type: 'assist', current: 4, target: 5, rewardStat: 'Pase', rewardValue: 1 },
  { id: '3', type: 'tackle', current: 1, target: 5, rewardStat: 'Defensa', rewardValue: 1 },
];

function ProgressBar({ current, target, colorClass }: { current: number; target: number; colorClass: string }) {
  const percentage = Math.min((current / target) * 100, 100);
  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className={`h-full transition-all duration-1000 ease-out ${colorClass}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export function RewardsHub() {
  const mvpsCurrent = 3;
  const mvpsTarget = 5;
  const canClaimMvp = mvpsCurrent >= mvpsTarget;

  return (
    <div className="flex flex-col gap-8">
      {/* MVP Chest Area */}
      <section className="relative overflow-hidden rounded-[2rem] border border-pitch-green/30 bg-gradient-to-b from-pitch-green/10 to-black/80 p-6 shadow-2xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-pitch-green/20 blur-3xl" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-pitch-green bg-pitch-green/20 shadow-[0_0_30px_rgba(204,255,0,0.3)]">
            <Trophy className="h-10 w-10 text-pitch-green drop-shadow-md" />
          </div>
          <h2 className="font-headline text-2xl font-black italic uppercase text-white">Bóveda MVP</h2>
          <p className="mt-2 max-w-[280px] text-sm text-white/70">
            Acumulá 5 reconocimientos MVP oficiales para destrabar un upgrade masivo.
          </p>
          
          <div className="mt-6 flex items-center justify-center gap-2">
            {[...Array(mvpsTarget)].map((_, i) => (
              <div
                key={i}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 ${
                  i < mvpsCurrent
                    ? 'border-pitch-green bg-pitch-green/20'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <Star className={`h-5 w-5 ${i < mvpsCurrent ? 'text-pitch-green fill-pitch-green' : 'text-white/20'}`} />
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-pitch-green">
            {mvpsCurrent} / {mvpsTarget} Conseguidos
          </p>

          <button
            disabled={!canClaimMvp}
            className={`mt-6 w-full rounded-xl px-4 py-4 font-headline text-lg font-black uppercase transition-all ${
              canClaimMvp
                ? 'bg-pitch-green text-black hover:scale-105 hover:shadow-[0_0_20px_rgba(204,255,0,0.4)]'
                : 'bg-white/5 text-white/30 cursor-not-allowed'
            }`}
          >
            Reclamar +2 Aptitudes
          </button>
        </div>
      </section>

      {/* Active Missions */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-headline text-xl font-black uppercase italic text-white">Misiones Activas</h2>
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">Se renuevan</span>
        </div>
        
        <div className="grid gap-3">
          {mockMissions.map((mission) => (
            <article
              key={mission.id}
              className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10">
                {mission.type === 'goal' && <Target className="h-6 w-6 text-white" />}
                {mission.type === 'assist' && <ArrowUp className="h-6 w-6 text-white" />}
                {mission.type === 'tackle' && <Shield className="h-6 w-6 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-end mb-1">
                  <h3 className="font-headline text-base font-bold uppercase text-white">
                    {mission.type === 'goal' ? 'Goleador' : mission.type === 'assist' ? 'Playmaker' : 'El Muro'}
                  </h3>
                  <span className="font-mono text-[10px] font-bold text-pitch-green">
                    +{mission.rewardValue} {mission.rewardStat}
                  </span>
                </div>
                <p className="text-xs text-white/50 mb-2">
                  Llegá a {mission.target} {mission.type === 'goal' ? 'goles' : mission.type === 'assist' ? 'asistencias' : 'tackles'} en partidos oficiales.
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <ProgressBar current={mission.current} target={mission.target} colorClass="bg-white" />
                  </div>
                  <span className="font-mono text-[10px] font-bold text-white/70 w-8 text-right">
                    {mission.current}/{mission.target}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
