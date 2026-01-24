import type { DisplayItem } from '@/store/selectors/buildDisplayList';

function normalizeGroupId(groupId: number | undefined): number | null {
  if (typeof groupId !== 'number') return null;
  return groupId === -1 ? null : groupId;
}

function parseHeaderGroupId(key: string): number | null {
  if (!key.startsWith('h:')) return null;
  const n = Number(key.slice(2));
  return Number.isFinite(n) ? n : null;
}

export function clampGroupHeaderPlacement(input: {
  orderKeys: string[];
  draggedGroupId: number;
  itemByKey: Map<string, DisplayItem>;
  /**
   * When a header is "inside" another group run, snapping to the nearest boundary can feel sticky
   * when dragging down across large groups. Prefer snapping in the direction of travel.
   */
  direction?: 'up' | 'down';
}): string[] {
  const headerKey = `h:${input.draggedGroupId}`;
  const fromIndex = input.orderKeys.indexOf(headerKey);
  if (fromIndex === -1) return input.orderKeys;

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
      const groupId = parseHeaderGroupId(withoutHeader[i] ?? '');
      if (groupId === null) continue;
      if (groupId === input.draggedGroupId) continue;

      let lastTabIndex = i;
      for (let j = i + 1; j < withoutHeader.length; j++) {
        const k = withoutHeader[j] ?? '';
        if (k.startsWith('h:')) break;
        if (!k.startsWith('t:')) break;

        const item = input.itemByKey.get(k);
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
