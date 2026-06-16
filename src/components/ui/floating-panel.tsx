import type { ReactNode } from 'react';

export function FloatingPanel({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`animate-fade-slide-up border border-white/10 bg-concrete-overlay p-5 text-fulbo-text sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}
