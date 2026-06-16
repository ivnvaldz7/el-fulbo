import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function PageHeader({ title, backHref }: { title: string; backHref: string }) {
  return (
    <header className="fixed top-0 z-30 flex h-16 w-full max-w-[390px] items-center justify-center border-b-2 border-white/10 bg-absolute-dark px-4">
      <Link
        href={backHref}
        className="absolute left-4 text-pitch-green transition-transform active:scale-95"
      >
        <ArrowLeft className="h-6 w-6" />
      </Link>
      <h1 className="font-headline text-xl font-black italic uppercase tracking-tighter text-white">
        {title}
      </h1>
    </header>
  );
}
