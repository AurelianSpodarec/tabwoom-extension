import type { GroupedTabs, Tab, TabGroup } from '@/services/tabs';

export function groupTabs(tabs: Tab[], groups: TabGroup[]): GroupedTabs[] {
  const groupMap = new Map<number, TabGroup>();
  for (const group of groups) {
    groupMap.set(group.id, group);
  }

  const bucketMap = new Map<number | null, Tab[]>();
  for (const tab of tabs) {
    const groupId = tab.groupId === -1 ? null : tab.groupId;
    const bucket = bucketMap.get(groupId);
    if (bucket) bucket.push(tab);
    else bucketMap.set(groupId, [tab]);
  }

  const sortable = Array.from(bucketMap.entries()).map(([groupId, bucketTabs]) => {
    const sortedTabs = [...bucketTabs].sort((a, b) => a.index - b.index);
    const firstIndex = sortedTabs[0]?.index ?? Number.MAX_SAFE_INTEGER;
    return {
      firstIndex,
      grouped: {
        group: groupId === null ? null : groupMap.get(groupId) ?? null,
        tabs: sortedTabs,
      },
    };
  });

  sortable.sort((a, b) => a.firstIndex - b.firstIndex);
  return sortable.map(x => x.grouped);
}
