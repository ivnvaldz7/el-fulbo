import { calculateOverall, getTier, type PlayerPosition, type PlayerStats } from '@/lib/types';

const tierLabels = {
  bronze: 'Bronce',
  silver: 'Plata',
  gold_matte: 'Oro simple',
  gold: 'Oro',
  mvp: 'MVP',
};

const tierClasses = {
  bronze: 'from-amber-800 via-yellow-700 to-stone-800 text-yellow-50',
  silver: 'from-slate-200 via-zinc-100 to-slate-400 text-zinc-950',
  gold_matte: 'from-yellow-500 via-amber-200 to-yellow-700 text-zinc-950',
  gold: 'from-yellow-300 via-amber-100 to-yellow-600 text-zinc-950',
  mvp: 'from-yellow-200 via-amber-300 to-orange-500 text-zinc-950',
};

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
  const tier = getTier(overall);
  const statEntries = Object.entries(stats);

  return (
    <article
      aria-live="polite"
      className={`relative mx-auto aspect-[5/7] w-full max-w-72 overflow-hidden rounded-card bg-gradient-to-br p-5 shadow-2xl ${tierClasses[tier]}`}
    >
      {pending ? (
        <span className="absolute right-3 top-3 rounded-card bg-noche px-2 py-1 text-xs font-black uppercase text-cal">
          Pendiente
        </span>
      ) : null}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-5xl font-black leading-none">{overall}</p>
          <p className="mt-1 text-sm font-black">{position}</p>
        </div>
        <p className="rounded-card border border-current/30 px-2 py-1 text-xs font-black">
          {tierLabels[tier]}
        </p>
      </div>

      <div className="mt-12 flex h-24 items-center justify-center rounded-card border border-current/20 bg-white/20 text-4xl font-black">
        {name.slice(0, 1).toUpperCase()}
      </div>

      <h2 className="mt-5 truncate text-center text-xl font-black">{name}</h2>

      <dl className="mt-5 grid grid-cols-2 gap-2 text-sm font-black">
        {statEntries.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between border-t border-current/20 pt-1">
            <dt className="uppercase">{key}</dt>
            <dd>{value * 10}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
