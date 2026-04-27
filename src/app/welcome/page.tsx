import Link from 'next/link';

export default function WelcomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-5 py-10">
      <p className="text-sm font-black uppercase text-cancha">Bienvenido</p>
      <h1 className="mt-3 text-4xl font-black text-noche">Arranca uniendote a un grupo.</h1>
      <p className="mt-3 text-neutral-700">
        Crear grupos llega en el siguiente feature. Para este flujo, usa un codigo o link de invitacion.
      </p>
      <Link
        href="/join"
        className="mt-8 inline-flex min-h-12 items-center justify-center rounded-card bg-noche px-6 py-3 text-sm font-black text-cal"
      >
        Unirme a un grupo
      </Link>
    </main>
  );
}
