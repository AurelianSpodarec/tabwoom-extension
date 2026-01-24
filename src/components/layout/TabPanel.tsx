import { useMemo } from 'react';
import { TabSearchBar } from '@/components/features/tabs/TabSearchBar';
import { GroupedTabList } from '@/components/features/tabs/GroupedTabList';
import { useGroupedTabs } from '@/hooks/useGroupedTabs';
import { useTabSelection } from '@/hooks/useTabSelection';
import { useTabSearch } from '@/hooks/useTabSearch';
import { useTabCache } from '@/store';
import { activateTab, closeTabOptimistic } from '@/store/actions/tab-actions';

export function TabPanel() {
  const loading = useTabCache(s => s.loading);
  const error = useTabCache(s => s.error);

  const groupedTabs = useGroupedTabs();
  const { searchQuery } = useTabSearch();
  const { selectedTabIds, toggleTabSelection } = useTabSelection();

  const filteredGroupedTabs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groupedTabs;

    return groupedTabs
      .map(group => ({
        ...group,
        tabs: group.tabs.filter(t => {
          const title = t.title?.toLowerCase() ?? '';
          const url = t.url?.toLowerCase() ?? '';
          return title.includes(q) || url.includes(q);
        }),
      }))
      .filter(group => group.tabs.length > 0);
  }, [groupedTabs, searchQuery]);

  if (loading) return <div className="text-sm text-white/70">Loading tabs…</div>;
  if (error) return <div className="text-sm text-red-300">{error.message}</div>;

  return (
    <div className="w-full">
      <TabSearchBar />

      <GroupedTabList
        groupedTabs={filteredGroupedTabs}
        selectedTabIds={selectedTabIds}
        onActivate={tabId => void activateTab(tabId)}
        onClose={tabId => void closeTabOptimistic(tabId)}
        onToggleSelect={(tabId, multi) => toggleTabSelection(tabId, multi)}
      />
    </div>
  );
}
