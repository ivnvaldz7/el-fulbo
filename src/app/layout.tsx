import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProviders } from '@/lib/providers/app-providers';
import { Toaster } from 'react-hot-toast';
import { AppUpdateBanner } from '@/components/notifications/app-update-banner';

export const metadata: Metadata = {
  title: 'El Fulbo',
  description: 'Organizá el fulbito sin perseguir gente por WhatsApp.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      {
        url: '/icons/icon-192x192-v2.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/icons/icon-512x512-v2.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/icons/apple-touch-icon-v2.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'El Fulbo',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#1f7a4d',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-AR">
      <body>
        <a href="#main-content" className="skip-link">
          Ir al contenido principal
        </a>
        <AppProviders>
          <div id="main-content" tabIndex={-1} className="outline-none">
            {children}
          </div>
          <AppUpdateBanner />
        </AppProviders>
        <Toaster />
      </body>
    </html>
  );
}
