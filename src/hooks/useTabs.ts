import { useCallback } from 'react';
import { useTabCache } from '@/store';
import { activateTab, closeTabOptimistic, closeTabsOptimistic, refreshTabCache } from '@/store/actions/tab-actions';

export function useTabs() {
  const tabs = useTabCache(s => s.tabs);
  const loading = useTabCache(s => s.loading);
  const error = useTabCache(s => s.error);

  return {
    tabs,
    loading,
    error,
    refresh: refreshTabCache,

    activateTab: useCallback((tabId: number) => activateTab(tabId), []),
    closeTab: useCallback((tabId: number) => closeTabOptimistic(tabId), []),
    closeTabs: useCallback((tabIds: number[]) => closeTabsOptimistic(tabIds), []),
  };
}
