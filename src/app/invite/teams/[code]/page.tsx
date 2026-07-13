import Link from 'next/link';
import { redirect } from 'next/navigation';
import { UsersRound } from 'lucide-react';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';
import { FloatingPanel } from '@/components/ui/floating-panel';
import { TeamsService } from '@/lib/services/teams.service';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { routes } from '@/lib/routes';
import { AcceptTeamInviteButton } from './accept-team-invite-button';

export default async function TeamInvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const inviteCode = decodeURIComponent(code).toUpperCase();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const service = new TeamsService(supabase);
  const validation = await service.validateTeamInvite(inviteCode);

  if (!validation.ok || !validation.data.valid) {
    redirect('/join?error=invalid');
  }

  const { teamId, teamName, alreadyMember } = validation.data;

  if (alreadyMember && teamId) {
    redirect(routes.teamDetail(teamId));
  }

  const backgroundUrl = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlNS1eDv_IzL2vGpHKRro1Le2YdbLxFnMGcdG1awPpsfkVLA-RaRKpJ_c1QxaWJUyq-OM0ycjWV2GfvZbo9jWllP2RKDnMVW_nI7Gaex2TMRcjodIwx5tWRyQBccpSDqTehFArtzbVpcicOGrlq5l9GChuqI1gmXvlbybrqAMb77Euld3_aaXTnQTYYrCYPtlWWt438IlAq5-VPPGfzEdHuWXtqFC9SGXuZF28ykdTLeyI7aAJ4RtsgcgrWqNxayMg1uwvFg9KUX0';

  return (
    <ImmersiveScreen
      align="center"
      backgroundImage={`linear-gradient(to bottom, rgba(10,10,10,0.35) 0%, rgba(10,10,10,0.96) 100%), url("${backgroundUrl}")`}
    >
      <FloatingPanel className="w-full border-2 border-pitch-green/20">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pitch-green/20">
            <UsersRound className="h-8 w-8 text-pitch-green" />
          </div>

          <p className="mt-6 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-pitch-green">
            Te invitaron a un equipo
          </p>

          <h1 className="mt-4 font-headline text-4xl font-black italic uppercase leading-none text-white drop-shadow-[4px_4px_0_rgba(0,0,0,0.45)]">
            {teamName ?? 'Equipo'}
          </h1>

          <p className="mx-auto mt-5 max-w-[300px] text-sm font-semibold leading-6 text-white/70">
            Roster fijo, partidos del equipo, stats aprobadas y card compartible.
          </p>

          <div className="mt-8 w-full">
            {user ? (
              <AcceptTeamInviteButton inviteCode={inviteCode} teamId={teamId ?? ''} />
            ) : (
              <div className="space-y-4">
                <GoogleSignInButton nextPath={`/invite/teams/${inviteCode}`} />
                <Link
                  href={`/login?redirect=${encodeURIComponent(`/invite/teams/${inviteCode}`)}`}
                  className="btn-interactive flex h-14 w-full items-center justify-center border border-white/10 bg-black/30 font-headline text-sm font-bold italic uppercase text-white/75 hover:border-white/30 hover:text-white"
                >
                  Ya tengo cuenta
                </Link>
              </div>
            )}
          </div>
        </div>
      </FloatingPanel>
    </ImmersiveScreen>
  );
}
