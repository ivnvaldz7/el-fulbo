'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, RefreshCw, X } from 'lucide-react';
import { usePushSubscription } from '@/hooks/use-push-subscription';

const APP_UPDATE_VERSION = 'card-refresh-icon-v2';
const DISMISSED_KEY = `app_update_banner_dismissed:${APP_UPDATE_VERSION}`;

export function AppUpdateBanner() {
  const { permission, isSupported, isSubscribed, isLoading, subscribe } = usePushSubscription();
  const [dismissed, setDismissed] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    try {
      const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
      setDismissed(localStorage.getItem(DISMISSED_KEY) === '1');
      setIsStandalone(
        window.matchMedia('(display-mode: standalone)').matches ||
          Boolean(navigatorWithStandalone.standalone),
      );
    } catch {
      setDismissed(false);
    }
  }, []);

  const updateHint = useMemo(() => {
    if (typeof navigator === 'undefined') return 'Abrí la app de nuevo para tomar la última versión.';
    const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isiOS) {
      return 'En iPhone, si el icono no cambia, quitá El Fulbo de la pantalla de inicio y agregalo otra vez desde Safari.';
    }

    return 'En Android, cerrá y abrí la app. Si el icono sigue viejo, reinstalá el acceso directo desde Chrome.';
  }, []);

  if (dismissed) {
    return null;
  }

  const shouldAskForNotifications = isSupported && permission !== 'granted' && !isSubscribed;
  const title = isStandalone ? 'Nueva versión instalada' : 'El Fulbo tiene nuevo icono';

  function handleDismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {}
    setDismissed(true);
  }

  async function handleSubscribe() {
    const ok = await subscribe();
    if (ok) {
      handleDismiss();
    }
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-xl border border-pitch-green/30 bg-[#06120d]/95 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.45)] ring-1 ring-white/10">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-pitch-green/30 bg-pitch-green/10 text-pitch-green">
          <RefreshCw className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-pitch-green">
            Actualización
          </p>
          <h2 className="mt-1 font-headline text-xl font-black uppercase italic leading-none text-white">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/65">
            {updateHint}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {shouldAskForNotifications ? (
              <button
                type="button"
                onClick={() => void handleSubscribe()}
                disabled={isLoading}
                className="btn-interactive inline-flex min-h-11 items-center justify-center gap-2 bg-pitch-green px-4 font-headline text-sm font-black uppercase italic text-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Bell className="h-4 w-4" />
                {isLoading ? 'Activando...' : 'Activar notificaciones'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleDismiss}
              className="btn-interactive inline-flex min-h-11 items-center justify-center border border-white/15 px-4 font-headline text-sm font-bold uppercase italic text-white/75 hover:border-white/30 hover:bg-white/5 hover:text-white"
            >
              Entendido
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="flex h-8 w-8 shrink-0 items-center justify-center text-white/40 transition hover:text-white"
          aria-label="Cerrar aviso de actualización"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
