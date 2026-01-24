import { create } from 'zustand';
import type { Tab, TabGroup } from '@/services/tabs';

export interface TabCacheState {
  tabs: Tab[];
  groups: TabGroup[];

  // `loading` is only meant for the *first* load.
  loading: boolean;

  // `refreshing` is for subsequent background syncs; we keep rendering the previous list.
  refreshing: boolean;

  // Once we've attempted the initial fetch (success or failure), this becomes true.
  hasLoaded: boolean;

  error: Error | null;

  setTabs: (tabs: Tab[]) => void;
  setGroups: (groups: TabGroup[]) => void;
  setLoading: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
  setHasLoaded: (hasLoaded: boolean) => void;
  setError: (error: Error | null) => void;
  setSnapshot: (snapshot: { tabs: Tab[]; groups: TabGroup[] }) => void;
}

export const useTabCache = create<TabCacheState>(set => ({
  tabs: [],
  groups: [],

  loading: true,
  refreshing: false,
  hasLoaded: false,

  error: null,

  setTabs: tabs => set({ tabs }),
  setGroups: groups => set({ groups }),
  setLoading: loading => set({ loading }),
  setRefreshing: refreshing => set({ refreshing }),
  setHasLoaded: hasLoaded => set({ hasLoaded }),
  setError: error => set({ error }),
  setSnapshot: snapshot => set({ tabs: snapshot.tabs, groups: snapshot.groups }),
}));

// When used outside React (action layer), Zustand's hook function is also the store.
export const tabCache = useTabCache;
