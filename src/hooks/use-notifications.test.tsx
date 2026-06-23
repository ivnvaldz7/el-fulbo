import { renderHook } from '@testing-library/react';
import { useNotifications } from './use-notifications';
import { AllTheProviders } from '@/tests/test-utils';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  createBrowserSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    })),
  })),
}));

describe('useNotifications', () => {
  it('inicializa correctamente', () => {
    const { result } = renderHook(() => useNotifications(), {
      wrapper: AllTheProviders,
    });
    
    expect(result.current.notifications).toBeDefined();
    expect(result.current.isLoading).toBeDefined();
  });
});
