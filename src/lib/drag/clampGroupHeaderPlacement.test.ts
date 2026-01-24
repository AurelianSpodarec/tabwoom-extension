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
});
