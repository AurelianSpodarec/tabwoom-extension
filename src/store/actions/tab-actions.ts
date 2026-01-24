import { getTabManager, type TabGroupColor } from '@/services/tabs';
import { tabCache } from '@/store/tab-cache';

const tabManager = getTabManager();

export async function refreshTabCache(): Promise<void> {
  tabCache.getState().setLoading(true);
  try {
    const [tabs, groups] = await Promise.all([
      tabManager.getCurrentWindowTabs(),
      tabManager.getCurrentWindowGroups(),
    ]);
    tabCache.getState().setSnapshot({ tabs, groups });
    tabCache.getState().setError(null);
  } catch (e) {
    tabCache.getState().setError(e instanceof Error ? e : new Error('Failed to refresh tab cache'));
  } finally {
    tabCache.getState().setLoading(false);
  }
}

export async function activateTab(tabId: number): Promise<void> {
  await tabManager.activateTab(tabId);
}

export async function closeTabOptimistic(tabId: number): Promise<void> {
  const prevTabs = tabCache.getState().tabs;
  tabCache.setState(s => ({ tabs: s.tabs.filter(t => t.id !== tabId) }));

  try {
    await tabManager.closeTab(tabId);
  } catch (e) {
    tabCache.setState({ tabs: prevTabs });
    throw e;
  }
}

export async function closeTabsOptimistic(tabIds: number[]): Promise<void> {
  if (tabIds.length === 0) return;

  const prevTabs = tabCache.getState().tabs;
  const tabIdSet = new Set(tabIds);
  tabCache.setState(s => ({ tabs: s.tabs.filter(t => !t.id || !tabIdSet.has(t.id)) }));

  try {
    await tabManager.closeTabs(tabIds);
  } catch (e) {
    tabCache.setState({ tabs: prevTabs });
    throw e;
  }
}

export async function createGroup(tabIds: number[], options?: { title?: string; color?: TabGroupColor }): Promise<number> {
  const groupId = await tabManager.groupTabs(tabIds, options);
  await refreshTabCache();
  return groupId;
}

export async function updateGroup(groupId: number, options: { title?: string; color?: TabGroupColor; collapsed?: boolean }): Promise<void> {
  await tabManager.updateGroup(groupId, options);
  await refreshTabCache();
}

export async function ungroupTabs(tabIds: number[]): Promise<void> {
  await tabManager.ungroupTabs(tabIds);
  await refreshTabCache();
}

export async function moveTabToGroup(tabId: number, groupId: number): Promise<void> {
  await tabManager.moveTabToGroup(tabId, groupId);
  await refreshTabCache();
}
