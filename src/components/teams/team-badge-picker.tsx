import { TeamBadge } from './team-badge';
import { teamBadges, type TeamBadgePath } from '@/lib/team-badges';

export function TeamBadgePicker({ value, onChange }: { value: TeamBadgePath; onChange: (value: TeamBadgePath) => void }) {
  return (
    <fieldset>
      <legend className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">Escudo del equipo</legend>
      <div className="grid grid-cols-4 gap-2">
        {teamBadges.map((badge) => (
          <button key={badge.path} type="button" onClick={() => onChange(badge.path)} aria-label={`Elegir escudo ${badge.label}`} aria-pressed={value === badge.path} className="flex min-h-20 flex-col items-center justify-center gap-1 border border-white/15 bg-black/40 p-2 transition-colors hover:border-pitch-green aria-pressed:border-pitch-green aria-pressed:bg-pitch-green/10">
            <TeamBadge badgeUrl={badge.path} name={badge.label} className="h-11 w-11" />
            <span className="font-mono text-[9px] font-bold uppercase text-white/65">{badge.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
