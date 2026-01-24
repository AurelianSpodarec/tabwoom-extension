import { useCallback } from 'react';
import { useGroupedTabs } from '@/hooks/useGroupedTabs';
import { useTabCache } from '@/store';
import {
  createGroup,
  moveTabToGroup,
  refreshTabCache,
  ungroupTabs,
  updateGroup,
} from '@/store/actions/tab-actions';
import type { TabGroupColor } from '@/services/tabs';

export function useTabGroups() {
  const groups = useTabCache(s => s.groups);
  const groupedTabs = useGroupedTabs();
  const loading = useTabCache(s => s.loading);
  const error = useTabCache(s => s.error);

  return {
    groups,
    groupedTabs,
    loading,
    error,
    refresh: refreshTabCache,

    createGroup: useCallback((tabIds: number[], options?: { title?: string; color?: TabGroupColor }) => createGroup(tabIds, options), []),
    updateGroup: useCallback((groupId: number, options: { title?: string; color?: TabGroupColor; collapsed?: boolean }) => updateGroup(groupId, options), []),
    ungroupTabs: useCallback((tabIds: number[]) => ungroupTabs(tabIds), []),
    moveTabToGroup: useCallback((tabId: number, groupId: number) => moveTabToGroup(tabId, groupId), []),
  };
}
