'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { usePushSubscription } from '@/hooks/use-push-subscription';

interface Props {
  variant?: 'match' | 'admin';
}

const COPY = {
  match: {
    question: '¿Te avisamos cuando arranque el partido?',
    confirm: 'Sí, activar',
  },
  admin: {
    question: 'Te avisamos cuando haya cartas nuevas para aprobar.',
    confirm: 'Activar notifs',
  },
};

const DISMISSED_KEY = 'push_optin_dismissed_at';
const DISMISS_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

export function PushOptinBanner({ variant = 'match' }: Props) {
  const { permission, isSubscribed, isLoading, subscribe } = usePushSubscription();
  const [dismissed, setDismissed] = useState(() => {
    try {
      const ts = localStorage.getItem(DISMISSED_KEY);
      if (!ts) return false;
      return Date.now() - parseInt(ts, 10) < DISMISS_COOLDOWN_MS;
    } catch {
      return false;
    }
  });

  if (permission === 'unsupported' || permission === 'granted' || isSubscribed || dismissed) {
    return null;
  }

  const copy = COPY[variant];

  function handleDismiss() {
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch {}
    setDismissed(true);
  }

  async function handleConfirm() {
    const ok = await subscribe();
    if (ok) {
      try { localStorage.removeItem(DISMISSED_KEY); } catch {}
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
      <p className="text-sm text-white">{copy.question}</p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={handleConfirm}
          disabled={isLoading}
          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
        >
          {copy.confirm}
        </button>
        <button
          onClick={handleDismiss}
          className="rounded-lg px-2 py-1.5 text-xs text-white/50 hover:text-white"
          aria-label="Ahora no"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
