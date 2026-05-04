import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '@/lib/providers/app-providers';
import { Toaster } from 'react-hot-toast';

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
        <Toaster />
      </body>
    </html>
  );
}
