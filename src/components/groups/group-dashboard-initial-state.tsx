const backgroundImage =
  "linear-gradient(rgba(5, 16, 12, 0.15), rgba(5, 16, 12, 0.15)), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='900' viewBox='0 0 1200 900'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%2307130e'/%3E%3Cstop offset='.55' stop-color='%231d4d2c'/%3E%3Cstop offset='1' stop-color='%23040705'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1200' height='900' fill='url(%23g)'/%3E%3Cg fill='none' stroke='%23f3efe0' stroke-opacity='.22' stroke-width='8'%3E%3Crect x='110' y='95' width='980' height='710' rx='28'/%3E%3Cpath d='M600 95v710M110 450h980'/%3E%3Ccircle cx='600' cy='450' r='105'/%3E%3C/g%3E%3Cg fill='%23f3efe0' fill-opacity='.08'%3E%3Ccircle cx='980' cy='165' r='90'/%3E%3Ccircle cx='205' cy='720' r='130'/%3E%3C/g%3E%3C/svg%3E\")";

type GroupDashboardInitialStateProps = {
  groupName: string;
  modality: string;
  activePlayers: number;
};

export function GroupDashboardInitialState({
  groupName,
  modality,
  activePlayers,
}: GroupDashboardInitialStateProps) {
  const showInviteBanner = activePlayers < 2;

  return (
    <main
      className="relative flex min-h-screen items-end overflow-hidden bg-cover bg-center px-4 pb-4 pt-16 sm:items-center sm:justify-center"
      style={{ backgroundImage }}
    >
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />

      <section className="relative z-10 w-full max-w-xl rounded-card bg-noche/95 p-6 text-cal shadow-2xl">
        <p className="text-sm font-black uppercase tracking-wide text-cancha">{modality}</p>
        <h1 className="mt-3 text-4xl font-black">{groupName}</h1>

        {showInviteBanner ? (
          <div className="mt-8">
            <h2 className="text-3xl font-black">Sumá a tus jugadores</h2>
            <p className="mt-3 text-base font-bold leading-relaxed text-cal/80">
              Compartí este link en el grupo de WhatsApp y los que entren ya están
            </p>
            <button
              type="button"
              className="mt-7 min-h-12 w-full rounded-card bg-cancha px-6 py-3 text-sm font-black text-white"
            >
              Invitar jugadores
            </button>
          </div>
        ) : (
          <p className="mt-8 text-base font-bold text-cal/80">
            El grupo ya tiene jugadores para empezar.
          </p>
        )}
      </section>
    </main>
  );
}
