import React from 'react';

type ReliabilityBadgeProps = {
  attendanceRate: number | null;
  lateDropouts: number;
  showLabel?: boolean;
};

export function ReliabilityBadge({ attendanceRate, lateDropouts, showLabel = true }: ReliabilityBadgeProps) {
  if (attendanceRate === null) {
    return (
      <div className="flex items-center gap-1.5 rounded bg-white/5 px-2 py-1" title="Sin datos suficientes">
        <div className="h-2 w-2 rounded-full bg-white/20" />
        {showLabel && <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-white/50">Nuevo</span>}
      </div>
    );
  }

  let level: 'high' | 'medium' | 'low' = 'medium';
  let label = 'Normal';
  let colorClass = 'bg-zinc-500/20 text-zinc-300';
  let dotClass = 'bg-zinc-400';

  if (attendanceRate >= 85 && lateDropouts <= 1) {
    level = 'high';
    label = 'Fierro';
    colorClass = 'bg-emerald-500/20 text-emerald-300';
    dotClass = 'bg-emerald-400';
  } else if (attendanceRate < 60 || lateDropouts > 3) {
    level = 'low';
    label = 'Peligro';
    colorClass = 'bg-red-500/20 text-red-300';
    dotClass = 'bg-red-500';
  } else {
    level = 'medium';
    label = 'Regular';
    colorClass = 'bg-amber-500/20 text-amber-300';
    dotClass = 'bg-amber-400';
  }

  const tooltip = `Asistencia: ${Math.round(attendanceRate)}% | Bajas tardías: ${lateDropouts}`;

  return (
    <div className={`flex items-center gap-1.5 rounded px-2 py-1 ${colorClass}`} title={tooltip}>
      <div className={`h-2 w-2 rounded-full ${dotClass} shadow-[0_0_8px_currentColor]`} />
      {showLabel && <span className="font-mono text-[10px] font-bold uppercase tracking-widest">{label}</span>}
    </div>
  );
}
