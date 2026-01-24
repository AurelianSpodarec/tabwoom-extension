import { getTabManager, type TabGroupColor } from '@/services/tabs';
import { tabCache } from '@/store/tab-cache';

const tabManager = getTabManager();

let refreshInFlight: Promise<void> | null = null;
let pendingRefresh = false;

async function doRefresh(): Promise<void> {
  const state = tabCache.getState();

  // Only show full-page loading on the first ever load.
  if (!state.hasLoaded) state.setLoading(true);
  else state.setRefreshing(true);

  try {
    const [tabs, groups] = await Promise.all([
      tabManager.getCurrentWindowTabs(),
      tabManager.getCurrentWindowGroups(),
    ]);

    state.setSnapshot({ tabs, groups });
    state.setError(null);
  } catch (e) {
    state.setError(e instanceof Error ? e : new Error('Failed to refresh tab cache'));
  } finally {
    state.setHasLoaded(true);
    state.setLoading(false);
    state.setRefreshing(false);
  }
}

export async function refreshTabCache(): Promise<void> {
  if (refreshInFlight) {
    pendingRefresh = true;
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    await doRefresh();

    // If more events came in while we were refreshing, do one more pass.
    if (pendingRefresh) {
      pendingRefresh = false;
      await doRefresh();
    }
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
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
