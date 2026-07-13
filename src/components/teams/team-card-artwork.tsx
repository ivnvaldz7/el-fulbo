export type TeamCardData = {
  name: string;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  matchesPlayed: number;
  goals: number;
  assists: number;
  tackles: number;
};

type TeamCardArtworkSize = 'preview' | 'share';

const sizeClasses = {
  preview: {
    card: 'w-full max-w-[300px] min-h-[420px]',
    name: 'text-4xl',
    number: 'text-4xl',
  },
  share: {
    card: 'h-[1200px] w-[1200px]',
    name: 'text-[104px]',
    number: 'text-[88px]',
  },
};

export function TeamCardArtwork({ team, size = 'preview' }: { team: TeamCardData; size?: TeamCardArtworkSize }) {
  const scale = sizeClasses[size];
  const primary = team.primaryColor ?? '#16a34a';
  const secondary = team.secondaryColor ?? '#020617';
  const stats = [
    { label: 'PJ', value: team.matchesPlayed },
    { label: 'GOL', value: team.goals },
    { label: 'AST', value: team.assists },
    { label: 'QTS', value: team.tackles },
  ];

  return (
    <article
      aria-label={`Card del equipo ${team.name}`}
      className={`relative mx-auto overflow-hidden rounded-[2rem] p-2 text-white shadow-[0_30px_80px_rgba(0,0,0,0.46)] ${scale.card}`}
      style={{ background: `linear-gradient(145deg, ${primary}, #f7f7d9 42%, ${secondary})` }}
    >
      <div className="flex h-full flex-col rounded-[calc(2rem-0.5rem)] bg-black/82 p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.18)]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-pitch-green">El Fulbo</span>
          <span className="rounded-full bg-white px-3 py-1 font-mono text-[10px] font-black uppercase text-black">Team</span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-[2rem] bg-white/10 ring-1 ring-white/15">
            <span className="font-headline text-5xl font-black italic text-pitch-green">{team.name.slice(0, 2).toUpperCase()}</span>
          </div>
          <h2 className={`font-headline font-black italic uppercase leading-none tracking-tight text-white ${scale.name}`}>{team.name}</h2>
          <p className="mt-5 font-mono text-[10px] font-black uppercase tracking-[0.24em] text-white/45">Approved aggregate history</p>
        </div>

        <dl className="grid grid-cols-4 gap-3 border-t border-white/10 pt-6 text-center">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className={`font-headline font-black leading-none text-white ${scale.number}`}>{stat.value}</dt>
              <dd className="mt-2 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-pitch-green">{stat.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}
