import { describe, expect, it } from 'vitest';
import { computeGroupDragTargetIndex } from './computeGroupDragTargetIndex';

describe('computeGroupDragTargetIndex', () => {
  it('clamps above pinned tabs', () => {
    const idx = computeGroupDragTargetIndex({
      pinnedCount: 2,
      draggedGroupId: 10,
      draggedTabIds: [3, 4],
      finalOrderKeys: ['h:10', 't:3', 't:4', 't:1', 't:2'],
    });

    expect(idx).toBe(2);
  });

  it('can move group between ungrouped tabs (counts tabs before header, excluding dragged tabs)', () => {
    // Ungrouped: t:1, t:2
    // Group 10 tabs are t:3, t:4 (still elsewhere during drag)
    // Header moved after t:2.
    const idx = computeGroupDragTargetIndex({
      pinnedCount: 0,
      draggedGroupId: 10,
      draggedTabIds: [3, 4],
      finalOrderKeys: ['t:1', 't:2', 'h:10', 't:5', 'h:20', 't:6', 't:3', 't:4'],
    });

    expect(idx).toBe(2);
  });

  it('moves group before another group header', () => {
    const idx = computeGroupDragTargetIndex({
      pinnedCount: 0,
      draggedGroupId: 20,
      draggedTabIds: [6, 7],
      finalOrderKeys: ['t:1', 'h:20', 'h:10', 't:2', 't:3', 't:6', 't:7'],
    });

    expect(idx).toBe(1);
  });
});
