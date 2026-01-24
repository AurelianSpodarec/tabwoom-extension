import { describe, expect, it } from 'vitest';
import type { DisplayItem } from '@/store/selectors/buildDisplayList';
import { clampGroupHeaderPlacement } from './clampGroupHeaderPlacement';

function tabItem(tabId: number, groupId: number | null): DisplayItem {
  return {
    type: 'tab',
    key: `t:${tabId}`,
    tabId,
    tab: {
      id: tabId,
      groupId: groupId ?? -1,
      pinned: false,
      index: 0,
    } as any,
  };
}

function headerItem(groupId: number): DisplayItem {
  return {
    type: 'group-header',
    key: `h:${groupId}`,
    groupId,
    group: { id: groupId } as any,
  };
}

describe('clampGroupHeaderPlacement', () => {
  it('snaps downwards out of another group between header and first tab', () => {
    const items: DisplayItem[] = [
      headerItem(20),
      headerItem(10),
      tabItem(200, 20),
      tabItem(201, 20),
      tabItem(1, null),
    ];

    const itemByKey = new Map(items.map(i => [i.key, i] as const));
    const orderKeys = items.map(i => i.key);

    expect(
      clampGroupHeaderPlacement({
        orderKeys,
        draggedGroupId: 10,
        itemByKey,
        direction: 'down',
      }),
    ).toEqual(['h:20', 't:200', 't:201', 'h:10', 't:1']);
  });

  it('snaps upwards out of another group between two tabs', () => {
    const items: DisplayItem[] = [headerItem(20), tabItem(200, 20), headerItem(10), tabItem(201, 20), tabItem(1, null)];
    const itemByKey = new Map(items.map(i => [i.key, i] as const));
    const orderKeys = items.map(i => i.key);

    expect(
      clampGroupHeaderPlacement({
        orderKeys,
        draggedGroupId: 10,
        itemByKey,
        direction: 'up',
      }),
    ).toEqual(['h:10', 'h:20', 't:200', 't:201', 't:1']);
  });

  it('allows inserting between group blocks (after last tab / before next header)', () => {
    const items: DisplayItem[] = [
      headerItem(20),
      tabItem(200, 20),
      tabItem(201, 20),
      headerItem(10),
      headerItem(30),
      tabItem(300, 30),
    ];

    const itemByKey = new Map(items.map(i => [i.key, i] as const));
    const orderKeys = items.map(i => i.key);

    expect(
      clampGroupHeaderPlacement({
        orderKeys,
        draggedGroupId: 10,
        itemByKey,
      }),
    ).toEqual(orderKeys);
  });

  it('allows inserting between ungrouped tabs', () => {
    const items: DisplayItem[] = [tabItem(1, null), headerItem(10), tabItem(2, null)];
    const itemByKey = new Map(items.map(i => [i.key, i] as const));
    const orderKeys = items.map(i => i.key);

    expect(
      clampGroupHeaderPlacement({
        orderKeys,
        draggedGroupId: 10,
        itemByKey,
      }),
    ).toEqual(orderKeys);
  });

  it('ignores dragged group tabs when detecting other group boundaries', () => {
    // Scenario: Group 10 is being dragged. Its tabs (t:101, t:102) are anchored
    // and appear right after h:20, before group 20's actual tabs.
    // Without skipping dragged tabs, the clamper thinks group 20 has no tabs.
    const items: DisplayItem[] = [
      headerItem(20),
      tabItem(101, 10), // Dragged group's tab (anchored, wrong position)
      tabItem(102, 10), // Dragged group's tab (anchored, wrong position)
      tabItem(201, 20),
      headerItem(10),   // Dragged header inside group 20's run!
      tabItem(202, 20),
    ];

    const itemByKey = new Map(items.map(i => [i.key, i] as const));
    const orderKeys = items.map(i => i.key);
    const draggedTabKeys = new Set(['t:101', 't:102']);

    // h:10 at position 4 is between t:201 (group 20) and t:202 (group 20)
    // This is illegal - should snap out of group 20's run
    const result = clampGroupHeaderPlacement({
      orderKeys,
      draggedGroupId: 10,
      itemByKey,
      draggedTabKeys,
      direction: 'down',
    });

    // Should snap to after group 20's last tab (t:202)
    expect(result).toEqual(['h:20', 't:101', 't:102', 't:201', 't:202', 'h:10']);
  });

  it('snaps header out of group run even when dragged tabs are scattered before it', () => {
    // Dragged group 10's tabs appear before group 20, header is inside group 20
    const items: DisplayItem[] = [
      tabItem(101, 10), // Dragged tab (anchored)
      tabItem(102, 10), // Dragged tab (anchored)
      headerItem(20),
      tabItem(201, 20),
      headerItem(10),   // Illegal: inside group 20
      tabItem(202, 20),
      tabItem(1, null),
    ];

    const itemByKey = new Map(items.map(i => [i.key, i] as const));
    const orderKeys = items.map(i => i.key);
    const draggedTabKeys = new Set(['t:101', 't:102']);

    const result = clampGroupHeaderPlacement({
      orderKeys,
      draggedGroupId: 10,
      itemByKey,
      draggedTabKeys,
      direction: 'down',
    });

    // Should snap to after t:202 (end of group 20)
    expect(result).toEqual(['t:101', 't:102', 'h:20', 't:201', 't:202', 'h:10', 't:1']);
  });
});
