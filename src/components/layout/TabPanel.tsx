import { useMemo } from 'react';
import { TabSearchBar } from '@/components/features/tabs/TabSearchBar';
import { FlatTabList } from '@/components/features/tabs/FlatTabList';
import { useTabSelection } from '@/hooks/useTabSelection';
import { useTabSearch } from '@/hooks/useTabSearch';
import { useDeferredBoolean } from '@/hooks/useDeferredBoolean';
import { useTabCache } from '@/store';
import type { Tab } from '@/services/tabs';
import { activateTab, closeTabOptimistic } from '@/store/actions/tab-actions';

export function TabPanel() {
  const loading = useTabCache(s => s.loading);
  const refreshing = useTabCache(s => s.refreshing);
  const showSyncing = useDeferredBoolean(refreshing, 500);
  const hasLoaded = useTabCache(s => s.hasLoaded);
  const error = useTabCache(s => s.error);

  const tabs = useTabCache(s => s.tabs);
  const groups = useTabCache(s => s.groups);

  const { searchQuery } = useTabSearch();
  const { selectedTabIds, toggleTabSelection } = useTabSelection();

  const filteredTabs = useMemo((): Tab[] => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tabs;

    return tabs.filter(t => {
      const title = t.title?.toLowerCase() ?? '';
      const url = t.url?.toLowerCase() ?? '';
      return title.includes(q) || url.includes(q);
    });
  }, [tabs, searchQuery]);

  if (!hasLoaded && loading) return <div className="text-sm text-white/70">Loading tabs…</div>;
  if (!hasLoaded && error) return <div className="text-sm text-red-300">{error.message}</div>;

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <TabSearchBar />
        </div>
        {showSyncing ? <div className="ml-2 shrink-0 text-xs text-white/50">Syncing…</div> : null}
      </div>

      {error ? <div className="mb-2 text-xs text-red-300">{error.message}</div> : null}

      <FlatTabList
        tabs={filteredTabs}
        groups={groups}
        selectedTabIds={selectedTabIds}
        onActivate={tabId => void activateTab(tabId)}
        onClose={tabId => void closeTabOptimistic(tabId)}
        onToggleSelect={(tabId, multi) => toggleTabSelection(tabId, multi)}
      />
    </div>
  );
}
