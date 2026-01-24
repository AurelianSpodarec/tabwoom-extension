import { describe, expect, it } from 'vitest';
import type { DisplayItem } from '@/store/selectors/buildDisplayList';
import { computeGroupDrop, computeTabDrop } from './computeDropResult';

function h(groupId: number): DisplayItem {
  return {
    type: 'group-header',
    key: `h:${groupId}`,
    groupId,
    group: { id: groupId, title: `g${groupId}`, color: 'blue', collapsed: false } as any,
  };
}

function t(tabId: number, groupId: number | null = null): DisplayItem {
  return {
    type: 'tab',
    key: `t:${tabId}`,
    tabId,
    tab: { id: tabId, index: tabId, groupId: groupId ?? -1 } as any,
  };
}

describe('computeTabDrop', () => {
  it('reorder within same group', () => {
    // Final display order indicates tab 2 moved after tab 3 inside group 10.
    const items = [h(10), t(1, 10), t(3, 10), t(2, 10)];
    const dropIndex = items.findIndex(i => i.type === 'tab' && i.tabId === 2);

    const res = computeTabDrop(items, 2, dropIndex, 10);
    expect(res).toEqual({ newIndex: 2, newGroupId: 10, type: 'reorder' });
  });

  it('between groups (tab becomes ungrouped at boundary)', () => {
    // Tab 99 is between the end of group 10 and the header for group 20.
    const items = [h(10), t(1, 10), t(99, null), h(20), t(2, 20)];
    const dropIndex = items.findIndex(i => i.type === 'tab' && i.tabId === 99);

    const res = computeTabDrop(items, 99, dropIndex, 10);
    expect(res).toEqual({ newIndex: 1, newGroupId: null, type: 'leave-group' });
  });

  it('enter group', () => {
    const items = [t(1, null), h(10), t(2, 10)];
    const dropIndex = items.findIndex(i => i.type === 'tab' && i.tabId === 2);

    const res = computeTabDrop(items, 2, dropIndex, null);
    expect(res).toEqual({ newIndex: 1, newGroupId: 10, type: 'enter-group' });
  });

  it('cross-group', () => {
    const items = [h(10), t(1, 10), h(20), t(2, 20)];
    const dropIndex = items.findIndex(i => i.type === 'tab' && i.tabId === 2);

    const res = computeTabDrop(items, 2, dropIndex, 10);
    expect(res).toEqual({ newIndex: 1, newGroupId: 20, type: 'cross-group' });
  });

  it('tab dropped on group header (resolved via hovered header id)', () => {
    // Tab 99 ended up right before the header for group 10.
    // Without hover context, this is ambiguous (it could be "between groups").
    const items = [t(1, null), t(99, null), h(10), t(2, 10), t(3, 10)];
    const dropIndex = items.findIndex(i => i.type === 'tab' && i.tabId === 99);

    const res = computeTabDrop(items, 99, dropIndex, null, { hoveredHeaderGroupId: 10 });

    // Becomes first tab in group 10.
    expect(res).toEqual({ newIndex: 1, newGroupId: 10, type: 'enter-group' });
  });
});

describe('computeGroupDrop', () => {
  it('computes tabIds in group and newStartIndex', () => {
    const items = [t(1, null), h(10), t(2, 10), t(3, 10), h(20), t(4, 20)];
    const headerIndex = items.findIndex(i => i.type === 'group-header' && i.groupId === 10);

    const res = computeGroupDrop(items, 10, headerIndex);
    expect(res.tabIds).toEqual([2, 3]);
    expect(res.newStartIndex).toBe(1);
  });
});
