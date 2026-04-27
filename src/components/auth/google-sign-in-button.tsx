'use client';

import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { signInWithGoogle } from '@/lib/services/auth.service';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function GoogleSignInButton({ nextPath }: { nextPath: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    setError(null);

    const result = await signInWithGoogle(createBrowserSupabaseClient(), nextPath);
    if (!result.ok) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    window.location.href = result.data.url;
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-card bg-noche px-5 py-3 text-sm font-black text-cal shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogIn className="h-4 w-4" aria-hidden="true" />
        {loading ? 'Abriendo Google...' : 'Entrar con Google para unirme'}
      </button>
      {error ? <p className="text-sm font-semibold text-derrota">{error}</p> : null}
    </div>
  );
}
