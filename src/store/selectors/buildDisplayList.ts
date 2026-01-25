import type { Tab, TabGroup } from '@/services/tabs';
import { normalizeGroupId } from '@/lib/utils/group';

export type DisplayItem =
  | { type: 'group-header'; key: string; groupId: number; group: TabGroup }
  | { type: 'tab'; key: string; tabId: number; tab: Tab };

function byIndex(a: Tab, b: Tab): number {
  return (a.index ?? 0) - (b.index ?? 0);
}

/**
 * Builds a flat list suitable for a single drag context.
 *
 * We keep items flat (Chrome stores tabs in a single strip) while still rendering group headers
 * as visual separators.
 */
export function buildDisplayList(tabs: Tab[], groups: TabGroup[]): DisplayItem[] {
  const groupById = new Map<number, TabGroup>();
  for (const g of groups) groupById.set(g.id, g);

  const sorted = [...tabs].sort(byIndex);

  const items: DisplayItem[] = [];
  let lastEmittedGroupId: number | null = null;

  for (const tab of sorted) {
    if (typeof tab.id !== 'number') continue;

    const rawGroupId = normalizeGroupId(tab.groupId);
    const group = rawGroupId === null ? null : (groupById.get(rawGroupId) ?? null);

    // Treat tabs referencing unknown groups as ungrouped (aligns with existing groupTabs behavior).
    const effectiveGroupId = group ? group.id : null;

    if (effectiveGroupId !== null && effectiveGroupId !== lastEmittedGroupId) {
      items.push({
        type: 'group-header',
        key: `h:${effectiveGroupId}`,
        groupId: effectiveGroupId,
        group: group!,
      });
      lastEmittedGroupId = effectiveGroupId;
    }

    if (effectiveGroupId === null) {
      lastEmittedGroupId = null;
    }

    items.push({
      type: 'tab',
      key: `t:${tab.id}`,
      tabId: tab.id,
      tab,
    });
  }

  return items;
}
