import { create } from 'zustand';

export interface UIState {
  selectedTabIds: Set<number>;
  searchQuery: string;
  expandedGroupIds: Set<number>;

  setSearchQuery: (query: string) => void;
  clearSelection: () => void;
  toggleTabSelection: (tabId: number, multi?: boolean) => void;
  toggleGroupExpanded: (groupId: number) => void;
}

export const useUIStore = create<UIState>(set => ({
  selectedTabIds: new Set<number>(),
  searchQuery: '',
  expandedGroupIds: new Set<number>(),

  setSearchQuery: searchQuery => set({ searchQuery }),

  clearSelection: () => set({ selectedTabIds: new Set<number>() }),

  toggleTabSelection: (tabId, multi = false) =>
    set(state => {
      const next = multi ? new Set(state.selectedTabIds) : new Set<number>();
      if (next.has(tabId)) next.delete(tabId);
      else next.add(tabId);
      return { selectedTabIds: next };
    }),

  toggleGroupExpanded: groupId =>
    set(state => {
      const next = new Set(state.expandedGroupIds);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return { expandedGroupIds: next };
    }),
}));
