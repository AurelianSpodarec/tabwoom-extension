import { describe, expect, it } from 'vitest';
import type { Tab, TabGroup } from '@/services/tabs';
import { groupTabs } from './groupTabs';

function makeTab(input: { id: number; index: number; groupId?: number; title?: string }): Tab {
  return {
    id: input.id,
    index: input.index,
    groupId: input.groupId ?? -1,
    title: input.title ?? `tab-${input.id}`,
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

describe('groupTabs', () => {
  it('groups tabs by groupId and preserves tab order by index (simple case)', () => {
    const tabs = [
      makeTab({ id: 1, index: 2, groupId: -1, title: 'ungrouped-2' }),
      makeTab({ id: 2, index: 0, groupId: 10, title: 'g10-0' }),
      makeTab({ id: 3, index: 1, groupId: 10, title: 'g10-1' }),
    ];

    const groups = [makeGroup({ id: 10, title: 'Work' })];

    const result = groupTabs(tabs, groups);

    expect(result).toHaveLength(2);
    expect(result[0].group?.id).toBe(10);
    expect(result[0].tabs.map(t => t.id)).toEqual([2, 3]);

    expect(result[1].group).toBeNull();
    expect(result[1].tabs.map(t => t.id)).toEqual([1]);
  });

  it.todo('supports custom ordering callback (Chrome-independent ordering)');

  it('preserves global tab-strip order when ungrouped tabs appear between groups', () => {
    const tabs = [
      makeTab({ id: 1, index: 0, groupId: 10 }),
      makeTab({ id: 2, index: 1, groupId: 10 }),
      makeTab({ id: 3, index: 2, groupId: -1 }),
      makeTab({ id: 4, index: 3, groupId: 20 }),
      makeTab({ id: 5, index: 4, groupId: 20 }),
      makeTab({ id: 6, index: 5, groupId: -1 }),
    ];

    const groups = [makeGroup({ id: 10 }), makeGroup({ id: 20 })];

    const result = groupTabs(tabs, groups);

    expect(result.map(r => (r.group ? `g${r.group.id}` : 'u'))).toEqual(['g10', 'u', 'g20', 'u']);
    expect(result[0].tabs.map(t => t.id)).toEqual([1, 2]);
    expect(result[1].tabs.map(t => t.id)).toEqual([3]);
    expect(result[2].tabs.map(t => t.id)).toEqual([4, 5]);
    expect(result[3].tabs.map(t => t.id)).toEqual([6]);
  });

  it('can be asserted via a normalized inline snapshot for complex mixes', () => {
    const tabs = [
      makeTab({ id: 1, index: 0, groupId: 10 }),
      makeTab({ id: 2, index: 1, groupId: -1 }),
      makeTab({ id: 3, index: 2, groupId: 10 }),
      makeTab({ id: 4, index: 3, groupId: 20 }),
      makeTab({ id: 5, index: 4, groupId: -1 }),
      makeTab({ id: 6, index: 5, groupId: 20 }),
    ];

    const groups = [makeGroup({ id: 10 }), makeGroup({ id: 20 })];
    const result = groupTabs(tabs, groups);

    const normalized = result.map(r => ({
      groupId: r.group?.id ?? null,
      tabIds: r.tabs.map(t => t.id),
    }));

    expect(normalized).toMatchInlineSnapshot(`[
  {
    "groupId": 10,
    "tabIds": [
      1,
    ],
  },
  {
    "groupId": null,
    "tabIds": [
      2,
    ],
  },
  {
    "groupId": 10,
    "tabIds": [
      3,
    ],
  },
  {
    "groupId": 20,
    "tabIds": [
      4,
    ],
  },
  {
    "groupId": null,
    "tabIds": [
      5,
    ],
  },
  {
    "groupId": 20,
    "tabIds": [
      6,
    ],
  },
]`);
  });

  it('keeps ungrouped tabs after groups when their indices are after the group indices', () => {
    const tabs = [
      makeTab({ id: 1, index: 0, groupId: 10 }),
      makeTab({ id: 2, index: 1, groupId: 10 }),
      makeTab({ id: 3, index: 10, groupId: -1 }),
    ];

    const result = groupTabs(tabs, [makeGroup({ id: 10 })]);

    expect(result.map(r => (r.group ? `g${r.group.id}` : 'u'))).toEqual(['g10', 'u']);
    expect(result[1].tabs.map(t => t.id)).toEqual([3]);
  });

  it('puts ungrouped tabs before groups when their indices are before the group indices', () => {
    const tabs = [
      makeTab({ id: 1, index: 0, groupId: -1 }),
      makeTab({ id: 2, index: 1, groupId: 10 }),
      makeTab({ id: 3, index: 2, groupId: 10 }),
    ];

    const result = groupTabs(tabs, [makeGroup({ id: 10 })]);

    expect(result.map(r => (r.group ? `g${r.group.id}` : 'u'))).toEqual(['u', 'g10']);
    expect(result[0].tabs.map(t => t.id)).toEqual([1]);
  });

  it('treats tabs referencing unknown groups as ungrouped', () => {
    const tabs = [
      makeTab({ id: 1, index: 0, groupId: 999 }),
      makeTab({ id: 2, index: 1, groupId: -1 }),
      makeTab({ id: 3, index: 2, groupId: 10 }),
    ];

    const result = groupTabs(tabs, [makeGroup({ id: 10 })]);

    expect(result.map(r => (r.group ? `g${r.group.id}` : 'u'))).toEqual(['u', 'g10']);
    expect(result[0].tabs.map(t => t.id)).toEqual([1, 2]);
    expect(result[1].tabs.map(t => t.id)).toEqual([3]);
  });

  it('does not emit groups that have no tabs', () => {
    const tabs = [makeTab({ id: 1, index: 0, groupId: -1 })];
    const groups = [makeGroup({ id: 10 })];

    const result = groupTabs(tabs, groups);

    expect(result).toHaveLength(1);
    expect(result[0].group).toBeNull();
  });

  it('handles empty inputs', () => {
    expect(groupTabs([], [])).toEqual([]);
  });

  it('is insensitive to groups array order (group metadata can be out of order)', () => {
    const tabs = [
      makeTab({ id: 1, index: 0, groupId: 10 }),
      makeTab({ id: 2, index: 1, groupId: 20 }),
      makeTab({ id: 3, index: 2, groupId: 10 }),
      makeTab({ id: 4, index: 3, groupId: 20 }),
    ];

    const groupsA = [makeGroup({ id: 10, title: 'A' }), makeGroup({ id: 20, title: 'B' })];
    const groupsB = [makeGroup({ id: 20, title: 'B' }), makeGroup({ id: 10, title: 'A' })];

    const a = groupTabs(tabs, groupsA).map(r => ({ groupId: r.group?.id ?? null, tabIds: r.tabs.map(t => t.id) }));
    const b = groupTabs(tabs, groupsB).map(r => ({ groupId: r.group?.id ?? null, tabIds: r.tabs.map(t => t.id) }));

    expect(a).toEqual(b);
  });

  it('handles large tab sets (stress test: preserves order and membership)', () => {
    const groups = [makeGroup({ id: 10 }), makeGroup({ id: 20 }), makeGroup({ id: 30 })];

    const tabs: Tab[] = [];
    for (let i = 0; i < 150; i++) {
      const groupId = i % 5 === 0 ? -1 : i % 3 === 0 ? 10 : i % 3 === 1 ? 20 : 30;
      tabs.push(makeTab({ id: i + 1, index: i, groupId }));
    }

    // Feed an intentionally shuffled input order.
    const shuffled = [...tabs].sort((a, b) => (a.id! % 7) - (b.id! % 7));

    const result = groupTabs(shuffled, groups);

    const flat = result.flatMap(r => r.tabs);
    expect(flat).toHaveLength(tabs.length);

    // Membership check.
    expect(new Set(flat.map(t => t.id))).toEqual(new Set(tabs.map(t => t.id)));

    // Order check: indices should be non-decreasing across the flattened result.
    for (let i = 1; i < flat.length; i++) {
      expect((flat[i - 1].index ?? -1) <= (flat[i].index ?? -1)).toBe(true);
    }
  });

  it('does not crash with duplicate indices (stress test)', () => {
    const tabs = [
      makeTab({ id: 1, index: 0, groupId: 10 }),
      makeTab({ id: 2, index: 0, groupId: 10 }),
      makeTab({ id: 3, index: 0, groupId: -1 }),
      makeTab({ id: 4, index: 1, groupId: -1 }),
    ];

    const result = groupTabs(tabs, [makeGroup({ id: 10 })]);
    const flatIds = result.flatMap(r => r.tabs.map(t => t.id));

    expect(new Set(flatIds)).toEqual(new Set([1, 2, 3, 4]));
  });
});
