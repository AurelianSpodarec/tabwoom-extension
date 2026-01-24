import { useState, useEffect, useCallback } from 'react';
import { browser } from 'wxt/browser';
import { EVENTS } from '@/lib/events';
import { getTabManager, type Tab } from '@/services/tabs';

export function useTabs() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const tabManager = getTabManager();

  const load = useCallback(async () => {
    try {
      const result = await tabManager.getCurrentWindowTabs();
      setTabs(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load tabs'));
    } finally {
      setLoading(false);
    }
  }, [tabManager]);

  useEffect(() => {
    load();

    const handler = (msg: { type: string }) => {
      if (msg.type === EVENTS.TABS_CHANGED) {
        load();
      }
    };

    browser.runtime.onMessage.addListener(handler);
    return () => browser.runtime.onMessage.removeListener(handler);
  }, [load]);

  const activateTab = useCallback(async (tabId: number) => {
    await tabManager.activateTab(tabId);
  }, [tabManager]);

  const closeTab = useCallback(async (tabId: number) => {
    await tabManager.closeTab(tabId);
  }, [tabManager]);

  const closeTabs = useCallback(async (tabIds: number[]) => {
    await tabManager.closeTabs(tabIds);
  }, [tabManager]);

  return {
    tabs,
    loading,
    error,
    refresh: load,
    activateTab,
    closeTab,
    closeTabs,
  };
}
