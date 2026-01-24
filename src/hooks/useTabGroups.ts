import { useState, useEffect, useCallback } from 'react';
import { browser } from 'wxt/browser';
import { EVENTS } from '@/lib/events';
import { getTabManager, type TabGroup, type TabGroupColor, type GroupedTabs } from '@/services/tabs';

export function useTabGroups() {
  const [groups, setGroups] = useState<TabGroup[]>([]);
  const [groupedTabs, setGroupedTabs] = useState<GroupedTabs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const tabManager = getTabManager();

  const load = useCallback(async () => {
    try {
      const [groupsResult, groupedResult] = await Promise.all([
        tabManager.getAllGroups(),
        tabManager.getTabsGrouped(),
      ]);
      setGroups(groupsResult);
      setGroupedTabs(groupedResult);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load groups'));
    } finally {
      setLoading(false);
    }
  }, [tabManager]);

  useEffect(() => {
    load();

    const handler = (msg: { type: string }) => {
      if (msg.type === EVENTS.TABS_CHANGED || msg.type === EVENTS.GROUPS_CHANGED) {
        load();
      }
    };

    browser.runtime.onMessage.addListener(handler);
    return () => browser.runtime.onMessage.removeListener(handler);
  }, [load]);

  const createGroup = useCallback(async (tabIds: number[], options?: { title?: string; color?: TabGroupColor }) => {
    return tabManager.groupTabs(tabIds, options);
  }, [tabManager]);

  const updateGroup = useCallback(async (groupId: number, options: { title?: string; color?: TabGroupColor; collapsed?: boolean }) => {
    return await tabManager.updateGroup(groupId, options);
  }, [tabManager]);

  const ungroupTabs = useCallback(async (tabIds: number[]) => {
    await tabManager.ungroupTabs(tabIds);
  }, [tabManager]);

  const moveTabToGroup = useCallback(async (tabId: number, groupId: number) => {
    await tabManager.moveTabToGroup(tabId, groupId);
  }, [tabManager]);

  return {
    groups,
    groupedTabs,
    loading,
    error,
    refresh: load,
    createGroup,
    updateGroup,
    ungroupTabs,
    moveTabToGroup,
  };
}
