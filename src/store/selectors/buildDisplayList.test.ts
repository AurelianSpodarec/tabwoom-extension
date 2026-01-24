import { describe, expect, it } from 'vitest';
import type { Tab, TabGroup } from '@/services/tabs';
import { buildDisplayList } from './buildDisplayList';

function makeTab(input: { id: number; index: number; groupId?: number; pinned?: boolean }): Tab {
  return {
    id: input.id,
    index: input.index,
    groupId: input.groupId ?? -1,
    pinned: input.pinned ?? false,
    title: `tab-${input.id}`,
  } as unknown as Tab;
}

function makeGroup(input: { id: number; title?: string }): TabGroup {
  return {
    id: input.id,
    title: input.title ?? `group-${input.id}`,
    color: 'blue',
    collapsed: false,
  } as unknown as TabGroup;
}

describe('buildDisplayList', () => {
  it('inserts group headers and preserves tab order by index', () => {
    const tabs = [
      makeTab({ id: 1, index: 0, groupId: 10 }),
      makeTab({ id: 2, index: 1, groupId: 10 }),
      makeTab({ id: 3, index: 2, groupId: -1 }),
      makeTab({ id: 4, index: 3, groupId: 20 }),
    ];

    const groups = [makeGroup({ id: 10, title: 'Work' }), makeGroup({ id: 20, title: 'Later' })];

    const items = buildDisplayList(tabs, groups);

    expect(items.map(i => i.key)).toEqual(['h:10', 't:1', 't:2', 't:3', 'h:20', 't:4']);
  });

  it('treats tabs referencing unknown groups as ungrouped', () => {
    const tabs = [makeTab({ id: 1, index: 0, groupId: 999 }), makeTab({ id: 2, index: 1, groupId: -1 })];

    const items = buildDisplayList(tabs, [makeGroup({ id: 10 })]);

    expect(items.map(i => i.key)).toEqual(['t:1', 't:2']);
  });

  it('does not emit headers for groups without tabs', () => {
    const tabs = [makeTab({ id: 1, index: 0, groupId: -1 })];
    const items = buildDisplayList(tabs, [makeGroup({ id: 10 })]);
    expect(items.map(i => i.key)).toEqual(['t:1']);
  });

  it('handles empty inputs', () => {
    expect(buildDisplayList([], [])).toEqual([]);
  });
});
