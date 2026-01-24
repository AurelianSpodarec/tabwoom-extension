import { create } from 'zustand';
import type { Tab, TabGroup } from '@/services/tabs';

export interface TabCacheState {
  tabs: Tab[];
  groups: TabGroup[];
  loading: boolean;
  error: Error | null;

  setTabs: (tabs: Tab[]) => void;
  setGroups: (groups: TabGroup[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  setSnapshot: (snapshot: { tabs: Tab[]; groups: TabGroup[] }) => void;
}

export const useTabCache = create<TabCacheState>(set => ({
  tabs: [],
  groups: [],
  loading: true,
  error: null,

  setTabs: tabs => set({ tabs }),
  setGroups: groups => set({ groups }),
  setLoading: loading => set({ loading }),
  setError: error => set({ error }),
  setSnapshot: snapshot => set({ tabs: snapshot.tabs, groups: snapshot.groups }),
}));

// When used outside React (action layer), Zustand's hook function is also the store.
export const tabCache = useTabCache;
