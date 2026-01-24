import { describe, expect, it } from 'vitest';
import type { Tab, TabGroup } from '@/services/tabs';
import { groupTabs } from './groupTabs';

describe('groupTabs', () => {
  it('groups tabs by groupId and preserves tab order by index', () => {
    const tabs = [
      { id: 1, index: 2, groupId: -1, title: 'ungrouped-2' },
      { id: 2, index: 0, groupId: 10, title: 'g10-0' },
      { id: 3, index: 1, groupId: 10, title: 'g10-1' },
    ] as unknown as Tab[];

    const groups = [{ id: 10, title: 'Work', color: 'blue', collapsed: false }] as unknown as TabGroup[];

    const result = groupTabs(tabs, groups);

    expect(result).toHaveLength(2);
    expect(result[0].group?.id).toBe(10);
    expect(result[0].tabs.map(t => t.id)).toEqual([2, 3]);

    expect(result[1].group).toBeNull();
    expect(result[1].tabs.map(t => t.id)).toEqual([1]);
  });
});
