import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCurrentWindowTabs = vi.fn();
const getCurrentWindowGroups = vi.fn();

vi.mock('@/services/tabs', () => {
  return {
    getTabManager: () => ({
      getCurrentWindowTabs,
      getCurrentWindowGroups,
    }),
  };
});

describe('refreshTabCache', () => {
  beforeEach(async () => {
    vi.resetModules();
    getCurrentWindowTabs.mockReset();
    getCurrentWindowGroups.mockReset();

    const { tabCache } = await import('@/store/tab-cache');
    tabCache.setState({
      tabs: [],
      groups: [],
      loading: true,
      refreshing: false,
      hasLoaded: false,
      error: null,
    });
  });

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
