'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import type { NotificationPreferences } from '@/lib/services/notifications.service';
import { usePushSubscription } from '@/hooks/use-push-subscription';

interface Props {
  initialPrefs: NotificationPreferences;
}

async function savePrefs(prefs: Partial<NotificationPreferences>) {
  await fetch('/api/settings/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs),
  });
}

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="font-mono text-sm font-bold text-white">{label}</p>
        {description && (
          <p className="mt-0.5 font-mono text-xs text-white/40">{description}</p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-pitch-green' : 'bg-white/20',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5.5' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

export function NotificationSettingsClient({ initialPrefs }: Props) {
  const [prefs, setPrefs] = useState(initialPrefs);
  const [saved, setSaved] = useState(false);
  const { permission, isSubscribed, subscribe, unsubscribe } = usePushSubscription();

  async function handlePushToggle(enabled: boolean) {
    if (enabled) {
      const ok = await subscribe();
      if (!ok) return;
    } else {
      await unsubscribe();
    }
    const updated = { ...prefs, pushEnabled: enabled };
    setPrefs(updated);
    await savePrefs({ pushEnabled: enabled });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="min-h-screen bg-absolute-dark text-white">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-absolute-dark/90 px-4 py-4 backdrop-blur">
        <Link href="/" className="text-white/40 transition-colors hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-headline text-xl font-black italic uppercase tracking-tight text-white">
          Notificaciones
        </h1>
        {saved && (
          <span className="ml-auto font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pitch-green">
            Guardado
          </span>
        )}
      </header>

      <div className="mx-auto max-w-md px-4">
        <div className="border-b border-white/5">
          <p className="pt-6 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
            Push
          </p>

          {permission === 'denied' && (
            <div className="mt-3 flex items-start gap-2 border border-amber-400/20 bg-amber-400/5 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="font-mono text-xs text-amber-400">
                El navegador está bloqueando las notificaciones. Habilitálas en la configuración del sitio.
              </p>
            </div>
          )}

          <Toggle
            label="Notificaciones push"
            description="Recibí avisos en tu dispositivo"
            checked={prefs.pushEnabled && isSubscribed}
            onChange={handlePushToggle}
          />
        </div>
      </div>
    </div>
  );
}
