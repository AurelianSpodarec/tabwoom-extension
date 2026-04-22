import type { DisplayItem } from '@/store/selectors/buildDisplayList';

export type TabDropResult = {
  newIndex: number;
  newGroupId: number | null;
  type: 'reorder' | 'enter-group' | 'leave-group' | 'cross-group';
};

export type GroupDropResult = {
  tabIds: number[];
  newStartIndex: number;
};

function findPrevHeader(items: DisplayItem[], fromIndex: number): DisplayItem | null {
  for (let i = fromIndex; i >= 0; i--) {
    const item = items[i];
    if (item?.type === 'group-header') return item;
  }
  return null;
}

function countTabsBefore(items: DisplayItem[], displayIndexExclusive: number): number {
  let count = 0;
  for (let i = 0; i < displayIndexExclusive; i++) {
    if (items[i]?.type === 'tab') count++;
  }
  return count;
}

function deriveDropType(sourceGroupId: number | null, newGroupId: number | null): TabDropResult['type'] {
  if (sourceGroupId === newGroupId) return 'reorder';
  if (sourceGroupId === null && newGroupId !== null) return 'enter-group';
  if (sourceGroupId !== null && newGroupId === null) return 'leave-group';
  return 'cross-group';
}

/**
 * Given a final display ordering, computes the intent of a single-tab drop.
 *
 * `dropIndex` should be the index of the dragged tab item within `displayItems`.
 */
export function computeTabDrop(
  displayItems: DisplayItem[],
  draggedTabId: number,
  dropIndex: number,
  sourceGroupId: number | null,
  options?: { hoveredHeaderGroupId?: number | null },
): TabDropResult {
  const prevItem = displayItems[dropIndex - 1];
  const nextItem = displayItems[dropIndex + 1];

  const prevGroupId =
    prevItem?.type === 'group-header'
      ? prevItem.groupId
      : prevItem?.type === 'tab'
        ? prevItem.tab.groupId === -1
          ? null
          : prevItem.tab.groupId
        : null;

  const nextHeaderGroupId = nextItem?.type === 'group-header' ? nextItem.groupId : null;
  const nextTabGroupId =
    nextItem?.type === 'tab' ? (nextItem.tab.groupId === -1 ? null : nextItem.tab.groupId) : null;

  const draggedIndexInTabsOnly = countTabsBefore(displayItems, dropIndex);

  // "Drop on header" is only resolved if the pointer was actually hovering the header.
  // Otherwise, a position right before a header should be treated as "between groups" (ungrouped).
  const hoveredHeaderGroupId = options?.hoveredHeaderGroupId ?? null;

  let newGroupId: number | null = prevGroupId;
  let newIndex: number = draggedIndexInTabsOnly;

  if (hoveredHeaderGroupId !== null) {
    // Only treat as a header-drop if the tab landed adjacent to that header.
    const landedBeforeHeader = nextHeaderGroupId === hoveredHeaderGroupId;
    const landedAfterHeader = prevItem?.type === 'group-header' && prevItem.groupId === hoveredHeaderGroupId;

    if (landedBeforeHeader || landedAfterHeader) {
      newGroupId = hoveredHeaderGroupId;

      // Insert as the first tab in that group (first tab slot after the header).
      const headerIndex = landedBeforeHeader ? dropIndex + 1 : dropIndex - 1;

      // Count tabs before the header, excluding the dragged tab (since it's moving into the group).
      let beforeHeader = 0;
      for (let i = 0; i < headerIndex + 1; i++) {
        const item = displayItems[i];
        if (item.type !== 'tab') continue;
        if (item.tabId === draggedTabId) continue;
        beforeHeader++;
      }

      newIndex = beforeHeader;
    }
  }

  // Boundary detection: prevent accidentally joining a group when not intended.
  if (hoveredHeaderGroupId === null) {
    // Case 1: Landing between two different groups (next item is a different group's header).
    if (nextHeaderGroupId !== null && prevGroupId !== null && prevGroupId !== nextHeaderGroupId) {
      newGroupId = null;
    }

    // Case 2: Landing after a group's last tab at a boundary (end of list or before ungrouped tab).
    // Only applies when trying to JOIN a group (not reordering within own group).
    // To join a group, must drop BETWEEN two tabs of the same group, or hover the header.
    const prevIsGroupedTab = prevItem?.type === 'tab' && prevGroupId !== null;
    if (prevIsGroupedTab && prevGroupId !== sourceGroupId) {
      const nextIsOutsideGroup = nextItem === undefined || (nextItem?.type === 'tab' && nextTabGroupId === null);
      if (nextIsOutsideGroup) {
        newGroupId = null;
      }
    }
  }

  return {
    newIndex,
    newGroupId,
    type: deriveDropType(sourceGroupId, newGroupId),
  };
}

/**
 * Computes where a group (header + tabs) should land based on the final display ordering.
 *
 * `dropIndex` should be the index of the dragged group header item within `displayItems`.
 */
export function computeGroupDrop(displayItems: DisplayItem[], groupId: number, dropIndex: number): GroupDropResult {
  const header = displayItems[dropIndex];
  if (!header || header.type !== 'group-header' || header.groupId !== groupId) {
    return { tabIds: [], newStartIndex: 0 };
  }

  const tabIds: number[] = [];
  for (let i = dropIndex + 1; i < displayItems.length; i++) {
    const item = displayItems[i];
    if (item.type === 'group-header') break;
    if (item.type === 'tab') tabIds.push(item.tabId);
  }

  // The group starts at the first tab slot after the header.
  const newStartIndex = countTabsBefore(displayItems, dropIndex + 1);

  return { tabIds, newStartIndex };
}
