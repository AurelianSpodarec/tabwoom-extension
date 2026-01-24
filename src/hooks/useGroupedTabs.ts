import { useMemo } from 'react';
import { groupTabs, useTabCache } from '@/store';

export function useGroupedTabs() {
  const tabs = useTabCache(s => s.tabs);
  const groups = useTabCache(s => s.groups);

  return useMemo(() => groupTabs(tabs, groups), [tabs, groups]);
}
