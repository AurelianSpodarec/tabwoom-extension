import type { DisplayItem } from '@/store/selectors/buildDisplayList';
import { normalizeGroupId, parseHeaderKey } from '@/lib/utils/group';

export function clampGroupHeaderPlacement(input: {
  orderKeys: string[];
  draggedGroupId: number;
  itemByKey: Map<string, DisplayItem>;
  /**
   * When a header is "inside" another group run, snapping to the nearest boundary can feel sticky
   * when dragging down across large groups. Prefer snapping in the direction of travel.
   */
  direction?: 'up' | 'down';
  /**
   * Tab keys belonging to the dragged group. These are anchored during drag and may appear
   * at unexpected positions. Skip them when detecting other groups' boundaries.
   */
  draggedTabKeys?: Set<string>;
}): string[] {
  const headerKey = `h:${input.draggedGroupId}`;
  const fromIndex = input.orderKeys.indexOf(headerKey);
  if (fromIndex === -1) return input.orderKeys;

  const draggedTabKeys = input.draggedTabKeys ?? new Set<string>();

  // Remove the header so we can reason about the insertion point.
  const withoutHeader = [...input.orderKeys];
  withoutHeader.splice(fromIndex, 1);

  let insertAt = Math.min(fromIndex, withoutHeader.length);

  // If the intended insertion point is inside another group's run (header -> consecutive tabs),
  // snap to the nearest boundary (before that header or after that group's last tab).
  //
  // We iterate defensively in case snapping moves us into another illegal segment.
  for (let pass = 0; pass < 3; pass++) {
    let adjusted = false;

    for (let i = 0; i < withoutHeader.length; i++) {
      const k = withoutHeader[i] ?? '';
      
      // Skip dragged group's anchored tabs when scanning for group headers
      if (draggedTabKeys.has(k)) continue;
      
      const groupId = parseHeaderKey(k);
      if (groupId === null) continue;
      if (groupId === input.draggedGroupId) continue;

      // Find the extent of this group's tab run, skipping dragged group's tabs
      let lastTabIndex = i;
      for (let j = i + 1; j < withoutHeader.length; j++) {
        const tabKey = withoutHeader[j] ?? '';
        
        // Skip dragged group's anchored tabs - they don't belong to this group
        if (draggedTabKeys.has(tabKey)) continue;
        
        if (tabKey.startsWith('h:')) break;
        if (!tabKey.startsWith('t:')) break;

        const item = input.itemByKey.get(tabKey);
        if (!item || item.type !== 'tab') break;
        if (normalizeGroupId(item.tab.groupId) !== groupId) break;

        lastTabIndex = j;
      }

      // Illegal insertion positions are between the group's header and its last tab, inclusive.
      if (insertAt > i && insertAt <= lastTabIndex) {
        const before = i;
        const after = lastTabIndex + 1;

        const distUp = insertAt - before;
        const distDown = after - insertAt;

        if (input.direction === 'down') {
          insertAt = after;
        } else if (input.direction === 'up') {
          insertAt = before;
        } else {
          insertAt = distUp <= distDown ? before : after;
        }
        adjusted = true;
        break;
      }

      // Skip scanning inside the run we just evaluated.
      i = Math.max(i, lastTabIndex);
    }

    if (!adjusted) break;
  }

  return [...withoutHeader.slice(0, insertAt), headerKey, ...withoutHeader.slice(insertAt)];
}
