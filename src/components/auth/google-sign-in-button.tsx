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
        className="btn-interactive flex min-h-14 w-full items-center justify-center gap-2 border-2 border-white/10 bg-black/30 px-5 font-headline text-sm font-bold italic uppercase text-white hover:bg-white/10 hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <LogIn className="h-4 w-4" aria-hidden="true" />
        {loading ? 'Abriendo Google...' : 'Entrar con Google para unirme'}
      </button>
      {error ? <p className="text-sm font-semibold text-pitch-green">{error}</p> : null}
    </div>
  );
}
