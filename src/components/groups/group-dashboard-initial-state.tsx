import { FloatingPanel } from '@/components/ui/floating-panel';
import { ImmersiveScreen } from '@/components/ui/immersive-screen';

type GroupDashboardInitialStateProps = {
  groupName: string;
  modality: string;
  activePlayers: number;
  adminPendingTotal?: number;
};

export function GroupDashboardInitialState({
  groupName,
  modality,
  activePlayers,
  adminPendingTotal = 0,
}: GroupDashboardInitialStateProps) {
  const showInviteBanner = activePlayers < 2;
  const showAdminPendingBanner = adminPendingTotal > 0;

  return (
    <ImmersiveScreen contentClassName="mx-auto max-w-xl">
      <FloatingPanel className="w-full border-2 border-white/10">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-pitch-green">{modality}</p>
        <h1 className="mt-2 font-headline text-4xl font-black italic uppercase leading-none text-white">{groupName}</h1>

        {showAdminPendingBanner ? (
          <div className="mt-8 border border-amber-400/20 bg-amber-400/5 p-5">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Admin</p>
            <h2 className="mt-1 font-headline text-xl font-black italic uppercase text-white">Tenés {adminPendingTotal} pendientes</h2>
            <a
              href="./admin-tasks"
              className="mt-4 inline-flex min-h-12 items-center justify-center bg-amber-400 px-6 py-2 font-headline text-sm font-bold uppercase text-black transition-transform active:scale-95"
            >
              Ver ahora
            </a>
          </div>
        ) : null}

        {showInviteBanner ? (
          <div className="mt-10">
            <h2 className="font-headline text-2xl font-black italic uppercase leading-none text-white">Sumá a tus jugadores</h2>
            <p className="mt-3 font-headline text-base font-medium leading-relaxed text-white/60">
              Compartí este link en el grupo de WhatsApp y los que entren ya están adentro.
            </p>
            <button
              type="button"
              className="mt-8 flex min-h-14 w-full items-center justify-center bg-pitch-green px-6 py-3 font-headline text-lg font-bold italic uppercase text-black transition-transform active:scale-95"
            >
              Invitar jugadores
            </button>
          </div>
        ) : (
          <p className="mt-10 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">
            El grupo ya tiene jugadores para empezar el fulbito.
          </p>
        )}
      </FloatingPanel>
    </ImmersiveScreen>
  );
}
