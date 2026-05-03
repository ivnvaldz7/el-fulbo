import { calculateOverall, type PlayerPosition, type PlayerStats } from '@/lib/types';

export function PlayerCardPreview({
  name,
  position,
  stats,
  pending = false,
}: {
  name: string;
  position: PlayerPosition;
  stats: PlayerStats;
  pending?: boolean;
}) {
  const overall = calculateOverall(stats, position);
  const statEntries = Object.entries(stats);

  return (
    <article
      aria-live="polite"
      className="relative mx-auto aspect-[2/3] w-full max-w-[280px] border-2 border-[#D4AF37]/40 bg-concrete-overlay flex flex-col shadow-[0_0_20px_rgba(212,175,55,0.15)]"
    >
      {/* Card Texture/Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.1),transparent_70%)] opacity-30"></div>
      
      {pending ? (
        <span className="absolute right-2 top-2 z-20 bg-pitch-green px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-black">
          PENDIENTE
        </span>
      ) : null}

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
        {statEntries.map(([key, value]) => (
          <div key={key} className="flex flex-col items-center">
            <span className="font-mono text-base font-bold text-white">{value * 10}</span>
            <span className="font-mono text-[10px] font-bold uppercase text-white/40">{key}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
