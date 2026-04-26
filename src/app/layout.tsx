import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '@/lib/providers/app-providers';

export const metadata: Metadata = {
  title: 'El Fulbo',
  description: 'Organizá el fulbito sin perseguir gente por WhatsApp.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-AR">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
