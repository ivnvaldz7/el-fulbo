import Link from 'next/link';

export default function InviteArchivedPage({
  searchParams,
}: {
  searchParams?: { groupName?: string };
}) {
  const groupName = searchParams?.groupName ? decodeURIComponent(searchParams.groupName) : 'este grupo';
  const subject = encodeURIComponent(`Recuperar grupo ${groupName}`);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-5 py-10">
      <section className="rounded-card border border-black/10 bg-white/80 p-6 shadow-sm">
        <h1 className="text-3xl font-black text-noche">Este grupo está archivado</h1>
        <p className="mt-4 text-neutral-700">
          El admin se fue y nadie tomó el rol todavía. Contactá al admin anterior si querés que lo active de
          nuevo, o escribí a soporte para recuperarlo.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <a
            href={`mailto:ivnvldz7@gmail.com?subject=${subject}`}
            className="inline-flex min-h-12 items-center justify-center rounded-card bg-noche px-5 py-3 text-sm font-black text-cal"
          >
            Escribir a soporte
          </a>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-card border border-black/15 px-5 py-3 text-sm font-black text-noche"
          >
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
