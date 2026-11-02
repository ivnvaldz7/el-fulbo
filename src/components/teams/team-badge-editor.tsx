'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { TeamBadge } from './team-badge';
import { TeamBadgePicker } from './team-badge-picker';
import { getTeamBadgePath, type TeamBadgePath } from '@/lib/team-badges';
import { TeamsService } from '@/lib/services/teams.service';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function TeamBadgeEditor({ teamId, teamName, badgeUrl, canManage }: { teamId: string; teamName: string; badgeUrl?: string | null; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<TeamBadgePath>(getTeamBadgePath(badgeUrl));
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  async function save() {
    setSaving(true);
    try {
      const result = await new TeamsService(createBrowserSupabaseClient()).updateTeamBadge({ teamId, badgeUrl: selected });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      setOpen(false);
      toast.success('Escudo actualizado');
      await queryClient.invalidateQueries({ queryKey: ['team', teamId] });
    } catch {
      toast.error('No pudimos actualizar el escudo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative shrink-0">
      <TeamBadge badgeUrl={badgeUrl} name={teamName} className="h-20 w-20 sm:h-28 sm:w-28" />
      {canManage ? (
        <button type="button" onClick={() => { setSelected(getTeamBadgePath(badgeUrl)); setOpen((value) => !value); }} aria-expanded={open} aria-label="Cambiar escudo" className="mt-2 w-full border border-white/20 bg-black/40 px-2 py-1 font-mono text-[9px] font-bold uppercase text-white transition-colors hover:border-pitch-green hover:text-pitch-green">
          <span className="sm:hidden">Cambiar</span><span className="hidden sm:inline">Cambiar escudo</span>
        </button>
      ) : null}
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-[min(19rem,85vw)] rounded-2xl border border-white/15 bg-[#101710] p-4 shadow-xl">
          <TeamBadgePicker value={selected} onChange={setSelected} />
          <button type="button" onClick={() => void save()} disabled={saving} className="mt-4 min-h-10 w-full bg-pitch-green px-4 font-headline text-xs font-black uppercase text-black disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar escudo'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
