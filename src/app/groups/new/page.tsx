import { CreateGroupForm } from '@/components/groups/create-group-form';

const backgroundImage =
  "linear-gradient(rgba(5, 16, 12, 0.2), rgba(5, 16, 12, 0.2)), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 1600'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%23116b45'/%3E%3Cstop offset='1' stop-color='%23091713'/%3E%3C/linearGradient%3E%3Cpattern id='p' width='120' height='120' patternUnits='userSpaceOnUse'%3E%3Cpath d='M0 60h120M60 0v120' stroke='%23ffffff' stroke-opacity='.13' stroke-width='3'/%3E%3Ccircle cx='60' cy='60' r='18' fill='none' stroke='%23ffffff' stroke-opacity='.16' stroke-width='3'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='1200' height='1600' fill='url(%23g)'/%3E%3Crect width='1200' height='1600' fill='url(%23p)'/%3E%3Cpath d='M160 250c260 130 560-170 880 30 180 112 160 356-42 442-270 116-514-138-774 12-196 113-160 390 90 456 214 57 430-72 645 32' fill='none' stroke='%23d9ff72' stroke-opacity='.2' stroke-width='42' stroke-linecap='round'/%3E%3C/svg%3E\")";

export default function NewGroupPage() {
  return (
    <main
      className="relative flex min-h-screen items-end overflow-hidden bg-cover bg-center px-4 pb-4 pt-16"
      style={{ backgroundImage }}
    >
      <div className="absolute inset-0 bg-black/55" aria-hidden="true" />

      <section className="relative z-10 mx-auto w-full max-w-xl rounded-card bg-cal p-6 shadow-2xl">
        <p className="text-sm font-black uppercase tracking-wide text-cancha">El Fulbo</p>
        <h1 className="mt-3 text-4xl font-black text-noche">Nuevo grupo</h1>
        <p className="mt-2 text-sm font-semibold text-neutral-700">
          Es rapido. Podes agregar mas cosas despues.
        </p>

        <div className="mt-7">
          <CreateGroupForm />
        </div>
      </section>
    </main>
  );
}
