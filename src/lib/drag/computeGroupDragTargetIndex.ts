export function computeGroupDragTargetIndex(input: {
  finalOrderKeys: string[];
  draggedGroupId: number;
  draggedTabIds: number[];
  pinnedCount: number;
}): number {
  const headerKey = `h:${input.draggedGroupId}`;
  const headerIndex = input.finalOrderKeys.indexOf(headerKey);
  if (headerIndex === -1) return input.pinnedCount;

  const draggedTabKeySet = new Set(input.draggedTabIds.map(id => `t:${id}`));

  // Compute "how many tabs are before the header" in the final UI ordering,
  // excluding the dragged group's own tabs (they still exist elsewhere in the list during drag).
  let before = 0;
  for (let i = 0; i < headerIndex; i++) {
    const k = input.finalOrderKeys[i];
    if (!k.startsWith('t:')) continue;
    if (draggedTabKeySet.has(k)) continue;
    before++;
  }

  // Never allow placing anything before pinned tabs.
  return Math.max(input.pinnedCount, before);
}
