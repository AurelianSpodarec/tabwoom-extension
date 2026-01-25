import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCurrentWindowTabs = vi.fn();
const getCurrentWindowGroups = vi.fn();
const closeTab = vi.fn();
const closeTabs = vi.fn();
const moveTabs = vi.fn();

vi.mock('@/services/tabs', () => {
  return {
    getTabManager: () => ({
      getCurrentWindowTabs,
      getCurrentWindowGroups,
      closeTab,
      closeTabs,
      moveTabs,
    }),
  };
});

function makeTab(id: number, index: number, opts: { pinned?: boolean; groupId?: number } = {}) {
  return { id, index, pinned: opts.pinned ?? false, groupId: opts.groupId ?? -1 } as any;
}

async function resetStore() {
  vi.resetModules();
  getCurrentWindowTabs.mockReset();
  getCurrentWindowGroups.mockReset();
  closeTab.mockReset();
  closeTabs.mockReset();
  moveTabs.mockReset();

  const { tabCache } = await import('@/store/tab-cache');
  tabCache.setState({
    tabs: [],
    groups: [],
    loading: true,
    refreshing: false,
    hasLoaded: false,
    error: null,
  });
}

describe('refreshTabCache', () => {
  beforeEach(resetStore);

  it('uses loading for first refresh and refreshing for subsequent refreshes', async () => {
    getCurrentWindowTabs.mockResolvedValueOnce([]);
    getCurrentWindowGroups.mockResolvedValueOnce([]);

    const { tabCache } = await import('@/store/tab-cache');
    const { refreshTabCache } = await import('./tab-actions');

    const p1 = refreshTabCache();
    expect(tabCache.getState().loading).toBe(true);
    expect(tabCache.getState().refreshing).toBe(false);

    await p1;
    expect(tabCache.getState().hasLoaded).toBe(true);
    expect(tabCache.getState().loading).toBe(false);

    getCurrentWindowTabs.mockResolvedValueOnce([]);
    getCurrentWindowGroups.mockResolvedValueOnce([]);

    const p2 = refreshTabCache();
    expect(tabCache.getState().refreshing).toBe(true);
    await p2;
    expect(tabCache.getState().refreshing).toBe(false);
  });

  it('coalesces overlapping refresh calls (no concurrent fetches)', async () => {
    const gate: { resolve?: () => void } = {};

    getCurrentWindowTabs
      .mockImplementationOnce(
        () =>
          new Promise<unknown[]>(r => {
            gate.resolve = () => r([]);
          }),
      )
      // If a pending refresh runs after the first completes, let it finish.
      .mockResolvedValueOnce([]);

    getCurrentWindowGroups.mockResolvedValue([]);

    const { refreshTabCache } = await import('./tab-actions');

    const p1 = refreshTabCache();
    const p2 = refreshTabCache();

    // Note: async functions do not preserve promise identity, so we verify behavior instead.
    expect(getCurrentWindowTabs).toHaveBeenCalledTimes(1);

    gate.resolve?.();
    await Promise.all([p1, p2]);

    // The second refresh should not have started until the first completed.
    expect(getCurrentWindowTabs).toHaveBeenCalledTimes(2);
  });
});

describe('closeTabOptimistic', () => {
  beforeEach(resetStore);

  it('removes tab from cache immediately and calls closeTab', async () => {
    const tabs = [makeTab(1, 0), makeTab(2, 1), makeTab(3, 2)];

    const { tabCache } = await import('@/store/tab-cache');
    tabCache.setState({ tabs, hasLoaded: true, loading: false });

    closeTab.mockResolvedValueOnce(undefined);

    const { closeTabOptimistic } = await import('./tab-actions');
    await closeTabOptimistic(2);

    expect(closeTab).toHaveBeenCalledWith(2);
    expect(tabCache.getState().tabs.map(t => t.id)).toEqual([1, 3]);
  });

  it('rolls back on error', async () => {
    const tabs = [makeTab(1, 0), makeTab(2, 1)];

    const { tabCache } = await import('@/store/tab-cache');
    tabCache.setState({ tabs, hasLoaded: true, loading: false });

    closeTab.mockRejectedValueOnce(new Error('fail'));

    const { closeTabOptimistic } = await import('./tab-actions');

    await expect(closeTabOptimistic(2)).rejects.toThrow('fail');
    expect(tabCache.getState().tabs.map(t => t.id)).toEqual([1, 2]);
  });
});

describe('closeTabsOptimistic', () => {
  beforeEach(resetStore);

  it('removes multiple tabs from cache immediately', async () => {
    const tabs = [makeTab(1, 0), makeTab(2, 1), makeTab(3, 2), makeTab(4, 3)];

    const { tabCache } = await import('@/store/tab-cache');
    tabCache.setState({ tabs, hasLoaded: true, loading: false });

    closeTabs.mockResolvedValueOnce(undefined);

    const { closeTabsOptimistic } = await import('./tab-actions');
    await closeTabsOptimistic([2, 4]);

    expect(closeTabs).toHaveBeenCalledWith([2, 4]);
    expect(tabCache.getState().tabs.map(t => t.id)).toEqual([1, 3]);
  });

  it('does nothing for empty array', async () => {
    const tabs = [makeTab(1, 0)];

    const { tabCache } = await import('@/store/tab-cache');
    tabCache.setState({ tabs, hasLoaded: true, loading: false });

    const { closeTabsOptimistic } = await import('./tab-actions');
    await closeTabsOptimistic([]);

    expect(closeTabs).not.toHaveBeenCalled();
    expect(tabCache.getState().tabs.map(t => t.id)).toEqual([1]);
  });

  it('rolls back on error', async () => {
    const tabs = [makeTab(1, 0), makeTab(2, 1), makeTab(3, 2)];

    const { tabCache } = await import('@/store/tab-cache');
    tabCache.setState({ tabs, hasLoaded: true, loading: false });

    closeTabs.mockRejectedValueOnce(new Error('fail'));

    const { closeTabsOptimistic } = await import('./tab-actions');

    await expect(closeTabsOptimistic([1, 3])).rejects.toThrow('fail');
    expect(tabCache.getState().tabs.map(t => t.id)).toEqual([1, 2, 3]);
  });
});

describe('reorderTabsOptimistic', () => {
  beforeEach(resetStore);

  it('reorders unpinned tabs optimistically', async () => {
    const tabs = [makeTab(1, 0), makeTab(2, 1), makeTab(3, 2)];

    const { tabCache } = await import('@/store/tab-cache');
    tabCache.setState({ tabs, hasLoaded: true, loading: false });

    moveTabs.mockResolvedValueOnce(undefined);
    getCurrentWindowTabs.mockResolvedValueOnce([makeTab(3, 0), makeTab(1, 1), makeTab(2, 2)]);
    getCurrentWindowGroups.mockResolvedValueOnce([]);

    const { reorderTabsOptimistic } = await import('./tab-actions');
    await reorderTabsOptimistic([3, 1, 2]);

    expect(moveTabs).toHaveBeenCalledWith([3, 1, 2], 0);
  });

  it('preserves pinned tabs at start', async () => {
    const tabs = [makeTab(1, 0, { pinned: true }), makeTab(2, 1), makeTab(3, 2)];

    const { tabCache } = await import('@/store/tab-cache');
    tabCache.setState({ tabs, hasLoaded: true, loading: false });

    moveTabs.mockResolvedValueOnce(undefined);
    getCurrentWindowTabs.mockResolvedValueOnce(tabs);
    getCurrentWindowGroups.mockResolvedValueOnce([]);

    const { reorderTabsOptimistic } = await import('./tab-actions');
    await reorderTabsOptimistic([3, 2]);

    // Pinned tabs stay, unpinned get reordered after pinned count (1)
    expect(moveTabs).toHaveBeenCalledWith([3, 2], 1);
  });

  it('rolls back on error', async () => {
    const tabs = [makeTab(1, 0), makeTab(2, 1), makeTab(3, 2)];

    const { tabCache } = await import('@/store/tab-cache');
    tabCache.setState({ tabs, hasLoaded: true, loading: false });

    moveTabs.mockRejectedValueOnce(new Error('move failed'));

    const { reorderTabsOptimistic } = await import('./tab-actions');

    await expect(reorderTabsOptimistic([3, 2, 1])).rejects.toThrow('move failed');
    expect(tabCache.getState().tabs.map(t => t.id)).toEqual([1, 2, 3]);
  });
});
