import type { CSSProperties, ReactNode } from 'react';

const soccerNightBackground =
  "linear-gradient(180deg, rgba(10, 10, 10, 0.4) 0%, rgba(10, 10, 10, 0.8) 60%, #0A0A0A 100%), url(\"https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2000&auto=format&fit=crop\")";

export function ImmersiveScreen({
  children,
  className = '',
  contentClassName = '',
  backgroundImage = soccerNightBackground,
  align = 'bottom',
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  backgroundImage?: string;
  align?: 'bottom' | 'center';
}) {
  const style = {
    backgroundImage,
  } satisfies CSSProperties;

  const alignmentClass =
    align === 'center'
      ? 'items-center justify-center py-10'
      : 'items-end py-6 sm:items-center sm:justify-center';

  return (
    <main
      className={`relative flex min-h-screen overflow-hidden bg-absolute-dark bg-cover bg-center px-4 ${alignmentClass} ${className}`}
      style={style}
    >
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      <div className={`relative z-10 w-full ${contentClassName}`}>{children}</div>
    </main>
  );
}

