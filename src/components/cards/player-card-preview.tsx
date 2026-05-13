import { applyBoostToStats, calculateBoostedOverall, getActiveBoost, getBoostRemainingLabel, isMvpBoost } from '@/lib/boost';
import type { CurrentBoost, PlayerPosition, PlayerStats } from '@/lib/types';

export function PlayerCardPreview({
  name,
  position,
  stats,
  currentBoost = null,
  pending = false,
  showBoostIndicator = true,
}: {
  name: string;
  position: PlayerPosition;
  stats: PlayerStats;
  currentBoost?: CurrentBoost | null;
  pending?: boolean;
  showBoostIndicator?: boolean;
}) {
  const activeBoost = getActiveBoost(currentBoost);
  const boostedStats = applyBoostToStats(stats, activeBoost);
  const overall = calculateBoostedOverall(stats, position, activeBoost);
  const statEntries = Object.entries(stats);
  const remainingLabel = getBoostRemainingLabel(activeBoost);
  const highlightMvp = isMvpBoost(activeBoost);

  return (
    <article
      aria-live="polite"
      className={`relative mx-auto flex aspect-[2/3] w-full max-w-[280px] flex-col border-2 bg-concrete-overlay shadow-[0_0_20px_rgba(212,175,55,0.15)] ${
        highlightMvp
          ? 'border-amber-300/70 shadow-[0_0_28px_rgba(251,191,36,0.28)]'
          : 'border-[#D4AF37]/40'
      }`}
    >
      {/* Card Texture/Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.1),transparent_70%)] opacity-30"></div>
      
      <div className="absolute right-2 top-2 z-20 flex flex-col items-end gap-1">
        {pending ? (
          <span className="bg-pitch-green px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-black">
            PENDIENTE
          </span>
        ) : null}
        {highlightMvp ? (
          <span className="bg-amber-300 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-black">
            MVP BOOST
          </span>
        ) : null}
      </div>

      {/* Card Header */}
      <div className="relative z-10 flex p-5 pb-0">
        <div className="flex flex-col items-center border-r border-white/20 pr-4">
          <span className="font-headline text-5xl font-black leading-none text-[#D4AF37]">{overall}</span>
          <span className="mt-1 font-mono text-sm font-bold text-white/60">{position}</span>
        </div>
        <div className="flex flex-grow items-center justify-center pt-2">
          <div className="flex h-24 w-24 items-center justify-center bg-white/5 text-5xl font-black text-white/20 grayscale">
            {name.slice(0, 1).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="relative z-10 mt-4 flex flex-col items-center px-2 text-center">
        <h2 className="w-full truncate font-headline text-2xl font-black italic tracking-widest uppercase text-white">
          {name}
        </h2>
        <div className="mt-1 border border-pitch-green/40 bg-pitch-green/10 px-2 py-0.5">
          <span className="font-mono text-[10px] font-bold text-pitch-green uppercase">
            ESTILO STREET
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="relative z-10 mt-auto grid grid-cols-3 gap-x-4 gap-y-2 border-t border-white/10 bg-black/40 px-4 py-5">
        {statEntries.map(([key, value]) => {
          const boostDelta = activeBoost?.modifiers?.[key as keyof CurrentBoost['modifiers']] ?? 0;
          const boostedValue = boostedStats[key as keyof PlayerStats];

          return (
          <div key={key} className="flex flex-col items-center">
            <div className="flex items-center gap-1">
              <span className="font-mono text-base font-bold text-white">{Math.round(Number(boostedValue ?? value) * 10)}</span>
              {showBoostIndicator && boostDelta > 0 ? (
                <span
                  className={`font-mono text-[10px] font-bold ${
                    boostDelta >= 3 ? 'text-amber-300' : 'text-emerald-300'
                  }`}
                >
                  +{boostDelta}
                </span>
              ) : null}
            </div>
            <span className="font-mono text-[10px] font-bold uppercase text-white/40">{key}</span>
          </div>
          );
        })}
      </div>

      {remainingLabel ? (
        <div className="relative z-10 border-t border-white/10 bg-black/50 px-4 py-2 text-center">
          <span className={`font-mono text-[10px] font-bold uppercase ${activeBoost?.partidos_remaining === 1 || activeBoost?.partidosRemaining === 1 ? 'text-amber-300' : 'text-emerald-300'}`}>
            {remainingLabel}
          </span>
        </div>
      ) : null}
    </article>
  );
}
