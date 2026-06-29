import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full pt-16', className)}>{children}</div>;
}
