import { applyBoostToStats, calculateBoostedOverall, getActiveBoost, getBoostRemainingLabel, isMvpBoost } from '@/lib/boost';
import type { CurrentBoost, PlayerPosition, PlayerStats } from '@/lib/types';

export function ShareableCard({
  name,
  position,
  stats,
  currentBoost,
  groupName,
}: {
  name: string;
  position: PlayerPosition;
  stats: PlayerStats;
  currentBoost?: CurrentBoost | null;
  groupName: string;
}) {
  const activeBoost = getActiveBoost(currentBoost);
  const boostedStats = applyBoostToStats(stats, activeBoost);
  const overall = calculateBoostedOverall(stats, position, activeBoost);
  const remainingLabel = getBoostRemainingLabel(activeBoost);
  const mvp = isMvpBoost(activeBoost);

  return (
    <div
      className={`relative flex h-[1800px] w-[1200px] flex-col overflow-hidden border-[10px] bg-[#080808] text-white ${
        mvp ? 'border-amber-300' : 'border-[#D4AF37]'
      }`}
      style={{
        background:
          'radial-gradient(circle at top, rgba(34,197,94,0.24), transparent 30%), linear-gradient(180deg, #111111 0%, #050505 100%)',
      }}
    >
      <div className="absolute right-12 top-10 font-mono text-2xl font-bold uppercase tracking-[0.25em] text-white/55">
        El Fulbo
      </div>

      <div className="flex px-16 pt-20">
        <div>
          <p className="font-headline text-[160px] font-black italic leading-none text-[#D4AF37]">{overall}</p>
          <p className="font-mono text-[42px] font-bold uppercase tracking-[0.3em] text-white/75">{position}</p>
        </div>
      </div>

      <div className="mt-12 flex flex-1 flex-col items-center px-16 text-center">
        <div
          className={`flex h-[420px] w-[420px] items-center justify-center rounded-full border text-[180px] font-black uppercase ${
            mvp ? 'border-amber-300/70 bg-amber-300/10 text-amber-200' : 'border-white/10 bg-white/5 text-white/30'
          }`}
        >
          {name.slice(0, 1).toUpperCase()}
        </div>

        <p className="mt-14 font-headline text-[96px] font-black italic uppercase leading-none tracking-[0.08em] text-white">
          {name}
        </p>
        <p className="mt-6 border border-pitch-green/40 bg-pitch-green/10 px-8 py-3 font-mono text-[28px] font-bold uppercase tracking-[0.25em] text-pitch-green">
          {groupName}
        </p>
        {remainingLabel ? (
          <p className="mt-5 font-mono text-[28px] font-bold uppercase tracking-[0.18em] text-emerald-300">{remainingLabel}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-x-8 gap-y-10 border-t border-white/10 bg-black/35 px-16 py-16">
        {Object.entries(stats).map(([key, value]) => {
          const boostDelta = activeBoost?.modifiers?.[key as keyof CurrentBoost['modifiers']] ?? 0;
          const boostedValue = boostedStats[key as keyof PlayerStats];

          return (
            <div key={key} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-7 text-center">
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono text-[56px] font-black text-white">{Math.round(Number(boostedValue ?? value) * 10)}</span>
                {boostDelta > 0 ? (
                  <span className={`font-mono text-[28px] font-bold ${boostDelta >= 3 ? 'text-amber-300' : 'text-emerald-300'}`}>
                    +{boostDelta}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 font-mono text-[24px] font-bold uppercase tracking-[0.18em] text-white/45">{key}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
