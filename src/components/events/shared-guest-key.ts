'use client';

import { useCallback, useSyncExternalStore } from 'react';

function storageKey(shareToken: string) {
  return `el-fulbo:guest:${shareToken}`;
}

function changeEventName(shareToken: string) {
  return `el-fulbo:guest-change:${shareToken}`;
}

export function readSharedGuestKey(shareToken: string) {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(storageKey(shareToken));
}

export function createSharedGuestKey(shareToken: string) {
  const guestKey = crypto.randomUUID();
  window.localStorage.setItem(storageKey(shareToken), guestKey);
  window.dispatchEvent(new Event(changeEventName(shareToken)));
  return guestKey;
}

export function useSharedGuestKey(shareToken: string) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const handleStorage = (event: StorageEvent) => {
        if (event.key === storageKey(shareToken)) onStoreChange();
      };
      const handleChange = () => onStoreChange();
      window.addEventListener('storage', handleStorage);
      window.addEventListener(changeEventName(shareToken), handleChange);
      return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener(changeEventName(shareToken), handleChange);
      };
    },
    [shareToken],
  );
  const getSnapshot = useCallback(() => readSharedGuestKey(shareToken), [shareToken]);
  const getServerSnapshot = useCallback(() => null, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
