import { memo } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PageHeader = memo(function PageHeader({
  title,
  backHref,
  className,
}: {
  title: string;
  backHref: string;
  className?: string;
}) {
  return (
    <header className="fixed left-0 right-0 top-0 z-30 h-16 border-b-2 border-white/10 bg-absolute-dark">
      <div
        className={cn(
          'relative mx-auto flex h-full w-full max-w-[480px] items-center justify-center px-4',
          className,
        )}
      >
        <Link
          href={backHref}
          className="absolute left-4 text-pitch-green transition-transform active:scale-95"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="font-headline text-xl font-black italic uppercase tracking-tighter text-white">
          {title}
        </h1>
      </div>
    </header>
  );
});
