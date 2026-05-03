import Link from 'next/link';

export default function InviteGroupFullPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-5 py-10">
      <section className="rounded-card border border-black/10 bg-white/80 p-6 shadow-sm">
        <h1 className="text-3xl font-black text-noche">Este grupo está lleno</h1>
        <p className="mt-4 text-neutral-700">
          El grupo llegó al máximo de 50 jugadores activos. Pedile al admin que archive alguno que no esté
          jugando para sumarte.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-card bg-noche px-5 py-3 text-sm font-black text-cal"
        >
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
