import type { PlayedMatchSummaryItem } from '@/lib/services/events.service';

export function ShareableMatchSummary({
  groupName,
  fieldName,
  playedAtLabel,
  teamAName,
  teamBName,
  teamAScore,
  teamBScore,
  mvpName,
  boostsApplied,
}: {
  groupName: string;
  fieldName: string;
  playedAtLabel: string;
  teamAName: string;
  teamBName: string;
  teamAScore: number;
  teamBScore: number;
  mvpName: string | null;
  boostsApplied: PlayedMatchSummaryItem[];
}) {
  return (
    <div
      className="relative flex h-[1600px] w-[1200px] flex-col overflow-hidden border-[10px] border-white/15 bg-[#050505] px-16 py-16 text-white"
      style={{
        background:
          'radial-gradient(circle at top, rgba(34,197,94,0.22), transparent 28%), linear-gradient(180deg, #111111 0%, #050505 100%)',
      }}
    >
      <div className="absolute right-12 top-10 font-mono text-2xl font-bold uppercase tracking-[0.25em] text-white/55">
        El Fulbo
      </div>

      <p className="font-mono text-[28px] font-bold uppercase tracking-[0.25em] text-pitch-green">{groupName}</p>
      <h2 className="mt-4 font-headline text-[72px] font-black italic uppercase text-white">Partido del {playedAtLabel}</h2>
      <p className="mt-2 font-headline text-[38px] font-medium uppercase text-white/65">{fieldName}</p>

      <div className="mt-16 rounded-[32px] border border-white/10 bg-black/35 px-12 py-10">
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="font-headline text-[44px] font-black italic uppercase">{teamAName}</p>
            <p className="mt-2 font-headline text-[110px] font-black italic leading-none text-[#D4AF37]">{teamAScore}</p>
          </div>
          <p className="font-headline text-[96px] font-black italic text-white/35">—</p>
          <div className="text-right">
            <p className="font-headline text-[44px] font-black italic uppercase">{teamBName}</p>
            <p className="mt-2 font-headline text-[110px] font-black italic leading-none text-[#D4AF37]">{teamBScore}</p>
          </div>
        </div>
      </div>

      {mvpName ? (
        <div className="mt-10 rounded-[32px] border border-amber-300/40 bg-amber-300/10 px-10 py-8">
          <p className="font-mono text-[24px] font-bold uppercase tracking-[0.2em] text-amber-300">MVP</p>
          <p className="mt-3 font-headline text-[58px] font-black italic uppercase">{mvpName}</p>
        </div>
      ) : null}

      <div className="mt-10 rounded-[32px] border border-white/10 bg-black/35 px-10 py-8">
        <p className="font-mono text-[24px] font-bold uppercase tracking-[0.2em] text-pitch-green">Boosts aplicados</p>
        {boostsApplied.length > 0 ? (
          <ul className="mt-6 space-y-4">
            {boostsApplied.slice(0, 5).map((item) => (
              <li key={item.playerId} className="border border-white/10 bg-white/[0.03] px-5 py-4">
                <p className="font-headline text-[34px] font-black italic uppercase">{item.displayName}</p>
                <p className="mt-2 font-mono text-[24px] font-bold uppercase text-emerald-300">
                  {Object.entries(item.boostApplied ?? {})
                    .map(([stat, delta]) => `${stat.toUpperCase()} +${delta}`)
                    .join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 text-[28px] text-white/55">No hubo boosts aplicados en este partido.</p>
        )}
      </div>
    </div>
  );
}
