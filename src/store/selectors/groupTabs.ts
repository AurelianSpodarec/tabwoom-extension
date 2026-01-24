import type { GroupedTabs, Tab, TabGroup } from '@/services/tabs';

/**
 * Groups tabs while preserving the global order of the tab strip.
 *
 * Note: ungrouped tabs can appear in multiple "runs" between groups.
 */
export function groupTabs(tabs: Tab[], groups: TabGroup[]): GroupedTabs[] {
  const groupMap = new Map<number, TabGroup>();
  for (const group of groups) {
    groupMap.set(group.id, group);
  }

  const sortedTabs = [...tabs].sort((a, b) => a.index - b.index);

  const result: GroupedTabs[] = [];

  for (const tab of sortedTabs) {
    const rawGroupId = tab.groupId === -1 ? null : tab.groupId;
    const group = rawGroupId === null ? null : groupMap.get(rawGroupId) ?? null;
    const last = result[result.length - 1];

    // Extend an existing run if possible.
    // If we can't resolve group metadata, treat the tab as ungrouped.
    if (rawGroupId === null || group === null) {
      if (last && last.group === null) {
        last.tabs.push(tab);
        continue;
      }

      result.push({ group: null, tabs: [tab] });
      continue;
    }

    if (last && last.group?.id === rawGroupId) {
      last.tabs.push(tab);
      continue;
    }

    result.push({ group, tabs: [tab] });
  }

  return result;
}
