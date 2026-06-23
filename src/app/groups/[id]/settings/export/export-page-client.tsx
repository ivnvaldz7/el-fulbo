'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  groupId: string;
  groupName: string;
}

const CONTENTS = [
  'Roster completo — nombres, posiciones, stats actuales',
  'Historia de partidos — fechas, resultados, MVPs',
  'Participaciones por partido — quién jugó en qué equipo',
  'Log de cambios de stats',
];

export function ExportPageClient({ groupId, groupName }: Props) {
  const [loading, setLoading] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setFallbackUrl(null);

    try {
      const res = await fetch(`/api/groups/${groupId}/export`);

      if (!res.ok) {
        const json = await res.json() as { error?: { message: string } };
        toast.error(json.error?.message ?? 'No pudimos generar el export. Reintentá.');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? `${groupId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      toast.success('Descarga iniciada');
      setFallbackUrl(url);
    } catch {
      toast.error('No pudimos generar el export. Reintentá.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-absolute-dark text-white">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-absolute-dark/90 px-4 py-4 backdrop-blur">
        <Link
          href={`/groups/${groupId}/dashboard`}
          className="text-white/40 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-headline text-xl font-black italic uppercase tracking-tight text-white">
          Exportar datos
        </h1>
      </header>

      <div className="mx-auto max-w-md px-4 py-8 space-y-6">
        <div>
          <p className="font-mono text-sm text-white/60">
            Descargá todos los datos de{' '}
            <span className="font-bold text-white">{groupName}</span> en un ZIP.
          </p>
        </div>

        <div className="border border-white/10 bg-white/5 p-4 space-y-3">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
            Qué incluye
          </p>
          {CONTENTS.map((item) => (
            <div key={item} className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 font-mono text-xs text-pitch-green">→</span>
              <p className="font-mono text-xs text-white/70">{item}</p>
            </div>
          ))}
        </div>

        <p className="font-mono text-[10px] text-white/30">
          Por privacidad, los emails de los jugadores no se incluyen salvo el tuyo.
        </p>

        <button
          onClick={handleExport}
          disabled={loading}
          className="flex h-14 w-full items-center justify-center gap-2 bg-pitch-green font-headline text-lg font-bold italic uppercase tracking-tight text-black transition-transform active:scale-95 disabled:opacity-50"
        >
          <Download className="h-5 w-5" />
          {loading ? 'Generando...' : 'Generar y descargar'}
        </button>

        {fallbackUrl && (
          <div className="border border-white/10 bg-white/5 p-4">
            <p className="font-mono text-xs text-white/50">
              Si la descarga no arrancó automáticamente,{' '}
              <a
                href={fallbackUrl}
                download
                className="font-bold text-[#D4AF37] underline"
              >
                tocá acá
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
