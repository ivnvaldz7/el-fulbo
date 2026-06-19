import { renderHook } from '@testing-library/react';
import { usePushSubscription } from './use-push-subscription';
import { AllTheProviders } from '@/tests/test-utils';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  createBrowserSupabaseClient: vi.fn(() => ({})),
}));

describe('usePushSubscription', () => {
  it('inicializa correctamente', () => {
    const { result } = renderHook(() => usePushSubscription(), {
      wrapper: AllTheProviders,
    });
    
    expect(result.current.isSupported).toBeDefined();
    expect(result.current.isSubscribed).toBeDefined();
  });
});
