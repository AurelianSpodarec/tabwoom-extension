import { getTabManager, type Tab, type TabGroupColor } from '@/services/tabs';
import { tabCache } from '@/store/tab-cache';

const tabManager = getTabManager();

let refreshInFlight: Promise<void> | null = null;
let pendingRefresh = false;

let refreshSuppressedDepth = 0;
let refreshRequestedWhileSuppressed = false;

async function withRefreshSuppressed<T>(fn: () => Promise<T>): Promise<T> {
  refreshSuppressedDepth++;

  try {
    return await fn();
  } finally {
    refreshSuppressedDepth--;

    if (refreshSuppressedDepth === 0 && refreshRequestedWhileSuppressed) {
      refreshRequestedWhileSuppressed = false;
      void refreshTabCache();
    }
  }
}

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
  if (refreshSuppressedDepth > 0) {
    refreshRequestedWhileSuppressed = true;
    return refreshInFlight ?? Promise.resolve();
  }

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

function byIndex(a: Tab, b: Tab): number {
  return (a.index ?? 0) - (b.index ?? 0);
}

function setTabsAtomically(tabs: Tab[]): void {
  tabCache.setState({ tabs });
}

function normalizeDesiredOrder(prevTabs: Tab[], desiredTabIds: number[]): { pinned: Tab[]; unpinnedIds: number[]; nextTabs: Tab[] } {
  const pinned = prevTabs.filter(t => !!t.pinned).sort(byIndex);
  const pinnedIdSet = new Set(pinned.map(t => t.id).filter((id): id is number => typeof id === 'number'));

  const tabById = new Map<number, Tab>();
  for (const t of prevTabs) {
    if (typeof t.id === 'number') tabById.set(t.id, t);
  }

  const desiredUnpinnedIds: number[] = [];
  for (const id of desiredTabIds) {
    if (pinnedIdSet.has(id)) continue;
    if (tabById.has(id)) desiredUnpinnedIds.push(id);
  }

  // Preserve any missing/unaccounted unpinned tabs at the end to avoid dropping them.
  const desiredSet = new Set(desiredUnpinnedIds);
  for (const t of prevTabs.filter(t => !t.pinned).sort(byIndex)) {
    if (typeof t.id !== 'number') continue;
    if (!desiredSet.has(t.id)) desiredUnpinnedIds.push(t.id);
  }

  const nextTabs: Tab[] = [];
  for (const t of pinned) nextTabs.push({ ...t, index: nextTabs.length } as Tab);
  for (const id of desiredUnpinnedIds) {
    const t = tabById.get(id);
    if (!t) continue;
    nextTabs.push({ ...t, index: nextTabs.length } as Tab);
  }

  return { pinned, unpinnedIds: desiredUnpinnedIds, nextTabs };
}

export async function reorderTabsOptimistic(desiredTabIdsInOrder: number[]): Promise<void> {
  const prevTabs = tabCache.getState().tabs;
  const { pinned, unpinnedIds, nextTabs } = normalizeDesiredOrder(prevTabs, desiredTabIdsInOrder);

  // Atomic store update to prevent intermediate flicker.
  setTabsAtomically(nextTabs);

  try {
    await withRefreshSuppressed(async () => {
      // Pinned tabs are not movable relative to unpinned tabs, so we only move the unpinned set.
      await tabManager.moveTabs(unpinnedIds, pinned.length);
    });

    await refreshTabCache();
  } catch (e) {
    setTabsAtomically(prevTabs);
    throw e;
  }
}

export async function reorderTabsAtCurrentStartIndexOptimistic(orderedTabIds: number[]): Promise<void> {
  const prevTabs = tabCache.getState().tabs;

  const tabById = new Map<number, Tab>();
  for (const t of prevTabs) {
    if (typeof t.id === 'number') tabById.set(t.id, t);
  }

  const tabs = orderedTabIds.map(id => tabById.get(id)).filter((t): t is Tab => !!t);
  if (tabs.length === 0) return;

  const startIndex = Math.min(...tabs.map(t => t.index ?? 0));

  // Compute a new global desired ordering by replacing the segment starting at startIndex.
  const sortedIds = [...prevTabs]
    .sort(byIndex)
    .map(t => t.id)
    .filter((id): id is number => typeof id === 'number');

  const idSet = new Set(orderedTabIds);
  const withoutSegment = sortedIds.filter(id => !idSet.has(id));
  const desired = [...withoutSegment.slice(0, startIndex), ...orderedTabIds, ...withoutSegment.slice(startIndex)];

  // Important: persist by asserting the *entire* unpinned ordering, not only the moved subset.
  const { pinned, unpinnedIds, nextTabs } = normalizeDesiredOrder(prevTabs, desired);
  setTabsAtomically(nextTabs);

  try {
    await withRefreshSuppressed(async () => {
      await tabManager.moveTabs(unpinnedIds, pinned.length);
    });
    await refreshTabCache();
  } catch (e) {
    setTabsAtomically(prevTabs);
    throw e;
  }
}

export async function moveTabAcrossGroupsOptimistic(tabId: number, targetGroupId: number | null, toIndex: number): Promise<void> {
  const prevTabs = tabCache.getState().tabs;

  const sorted = [...prevTabs].sort(byIndex);
  const pinnedCount = sorted.filter(t => t.pinned).length;

  // Build desired order: move tabId to toIndex position.
  const unpinnedIds = sorted.filter(t => !t.pinned && typeof t.id === 'number').map(t => t.id as number);
  const remaining = unpinnedIds.filter(id => id !== tabId);
  const desiredPos = Math.max(0, Math.min(remaining.length, toIndex - pinnedCount));
  remaining.splice(desiredPos, 0, tabId);

  const desiredGlobalIds = sorted
    .filter(t => t.pinned && typeof t.id === 'number')
    .map(t => t.id as number)
    .concat(remaining);

  // Update both index (via normalizeDesiredOrder) and groupId.
  const { nextTabs: reorderedTabs } = normalizeDesiredOrder(prevTabs, desiredGlobalIds);
  const nextTabs = reorderedTabs.map(t => (t.id === tabId ? ({ ...t, groupId: targetGroupId ?? -1 } as Tab) : t));
  setTabsAtomically(nextTabs);

  try {
    await withRefreshSuppressed(async () => {
      if (targetGroupId === null) {
        // Ungroup the tab, then move it to the desired position.
        await tabManager.ungroupTabs([tabId]);
        await tabManager.moveTab(tabId, Math.max(pinnedCount, toIndex));
      } else {
        // Add tab to group. Chrome positions it at the end of the group.
        // Then move it within the group to the desired position.
        await tabManager.moveTabToGroup(tabId, targetGroupId);
        await tabManager.moveTab(tabId, Math.max(pinnedCount, toIndex));
      }
      // NOTE: We intentionally do NOT call bulk moveTabs() here.
      // Chrome's tabs.move can implicitly ungroup tabs when they cross group boundaries.
      // The group/ungroup + single tab move is sufficient.
    });

    await refreshTabCache();
  } catch (e) {
    setTabsAtomically(prevTabs);
    throw e;
  }
}

/**
 * Moves a set of tabs as a contiguous block to the requested index.
 *
 * This is the operation needed for group drags: move the group's tab range in a single `tabs.move`
 * call to preserve membership and relative ordering.
 */
export async function moveTabsAsBlockOptimistic(tabIds: number[], toIndex: number): Promise<void> {
  if (tabIds.length === 0) return;

  const prevTabs = tabCache.getState().tabs;
  const sorted = [...prevTabs].sort(byIndex);

  const pinnedCount = sorted.filter(t => t.pinned).length;

  const unpinnedIds = sorted.filter(t => !t.pinned && typeof t.id === 'number').map(t => t.id as number);
  const idSet = new Set(tabIds);

  const moving = unpinnedIds.filter(id => idSet.has(id));
  if (moving.length === 0) return;

  const remaining = unpinnedIds.filter(id => !idSet.has(id));

  const desiredPos = Math.max(0, Math.min(remaining.length, toIndex - pinnedCount));
  remaining.splice(desiredPos, 0, ...moving);

  const desiredGlobalIds = sorted
    .filter(t => t.pinned && typeof t.id === 'number')
    .map(t => t.id as number)
    .concat(remaining);

  const { pinned, unpinnedIds: finalUnpinnedIds, nextTabs } = normalizeDesiredOrder(prevTabs, desiredGlobalIds);
  setTabsAtomically(nextTabs);

  try {
    await withRefreshSuppressed(async () => {
      // Move just the dragged block.
      await tabManager.moveTabs(moving, toIndex);
      // Re-assert full unpinned ordering to avoid any implicit Chrome adjustments.
      await tabManager.moveTabs(finalUnpinnedIds, pinned.length);
    });

    await refreshTabCache();
  } catch (e) {
    setTabsAtomically(prevTabs);
    throw e;
  }
}

/**
 * Moves an entire group as a unit.
 *
 * `tabs.move` can implicitly change group membership when moved tabs cross other groups.
 * `tabGroups.move` preserves the group and all its tabs.
 */
export async function moveGroupOptimistic(groupId: number, toIndex: number): Promise<void> {
  const prevTabs = tabCache.getState().tabs;
  const sorted = [...prevTabs].sort(byIndex);

  const pinnedCount = sorted.filter(t => t.pinned).length;

  const groupTabIds = sorted
    .filter(t => !t.pinned && typeof t.id === 'number' && t.groupId === groupId)
    .map(t => t.id as number);

  if (groupTabIds.length === 0) return;

  // Optimistic local reorder: treat the group's tabs as a block.
  const unpinnedIds = sorted.filter(t => !t.pinned && typeof t.id === 'number').map(t => t.id as number);
  const idSet = new Set(groupTabIds);
  const moving = unpinnedIds.filter(id => idSet.has(id));
  const remaining = unpinnedIds.filter(id => !idSet.has(id));

  const desiredPos = Math.max(0, Math.min(remaining.length, toIndex - pinnedCount));
  remaining.splice(desiredPos, 0, ...moving);

  const desiredGlobalIds = sorted
    .filter(t => t.pinned && typeof t.id === 'number')
    .map(t => t.id as number)
    .concat(remaining);

  const { nextTabs } = normalizeDesiredOrder(prevTabs, desiredGlobalIds);
  setTabsAtomically(nextTabs);

  try {
    await withRefreshSuppressed(async () => {
      await tabManager.moveGroup(groupId, Math.max(pinnedCount, toIndex));
    });

    await refreshTabCache();
  } catch (e) {
    setTabsAtomically(prevTabs);
    throw e;
  }
}
