import { useEffect } from 'react';
import { browser } from 'wxt/browser';
import { EVENTS } from '@/lib/events';
import { refreshTabCache } from '@/store/actions/tab-actions';

export function useTabSync() {
  useEffect(() => {
    void refreshTabCache();

    const handler = (msg: { type: string }) => {
      if (msg.type === EVENTS.TABS_CHANGED || msg.type === EVENTS.GROUPS_CHANGED) {
        void refreshTabCache();
      }
    };

    browser.runtime.onMessage.addListener(handler);
    return () => browser.runtime.onMessage.removeListener(handler);
  }, []);
}
