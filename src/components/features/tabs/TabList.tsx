import { useEffect, useMemo, useRef, useState } from 'react';
import { Reorder } from 'framer-motion';
import type { Tab } from '@/services/tabs';
import { TabItem } from './TabItem';

export interface TabListProps {
  tabs: Tab[];
  selectedTabIds: Set<number>;
  onActivate: (tabId: number) => void;
  onClose: (tabId: number) => void;
  onToggleSelect: (tabId: number, multi: boolean) => void;

  /** Called once on drop (not on every reorder tick). */
  onCommitReorder?: (orderedTabIds: number[]) => void;

  /** Allows parent to intercept the drop; return false to skip the commit. */
  shouldCommitDrop?: (tabId: number) => boolean;

  onTabDragStart?: (tabId: number) => void;
  onTabDragEnd?: (tabId: number) => void;
}

export function TabList({
  tabs,
  selectedTabIds,
  onActivate,
  onClose,
  onToggleSelect,
  onCommitReorder,
  shouldCommitDrop,
  onTabDragStart,
  onTabDragEnd,
}: TabListProps) {
  const tabIds = useMemo(() => tabs.map(t => t.id).filter((id): id is number => typeof id === 'number'), [tabs]);

  const tabById = useMemo(() => {
    const map = new Map<number, Tab>();
    for (const t of tabs) {
      if (typeof t.id === 'number') map.set(t.id, t);
    }
    return map;
  }, [tabs]);

  const keys = useMemo(() => tabIds.map(id => `t:${id}`), [tabIds]);

  const [order, setOrder] = useState<string[]>(keys);
  const initialOrderRef = useRef<string[]>(keys);

  useEffect(() => {
    setOrder(keys);
    initialOrderRef.current = keys;
  }, [keys.join(',')]);

  const orderedTabs = useMemo(
    () =>
      order
        .map(k => {
          const id = Number(k.slice(2));
          return Number.isFinite(id) ? tabById.get(id) : undefined;
        })
        .filter((t): t is Tab => !!t),
    [order, tabById],
  );

  const hasChanged = (a: string[], b: string[]) => a.length !== b.length || a.some((v, i) => v !== b[i]);

  return (
    <Reorder.Group axis="y" as="div" values={order} onReorder={setOrder} layoutScroll className="flex flex-col gap-1">
      {orderedTabs.map(tab => (
        <TabItem
          key={tab.id}
          value={`t:${tab.id}`}
          tab={tab}
          selected={!!tab.id && selectedTabIds.has(tab.id)}
          onActivate={onActivate}
          onClose={onClose}
          onToggleSelect={onToggleSelect}
          onDragStart={tabId => {
            initialOrderRef.current = order;
            onTabDragStart?.(tabId);
          }}
          onDragEnd={tabId => {
            onTabDragEnd?.(tabId);

            const allowCommit = shouldCommitDrop?.(tabId) ?? true;
            if (!allowCommit) return;

            if (onCommitReorder && hasChanged(initialOrderRef.current, order)) {
              const orderedIds = order.map(k => Number(k.slice(2))).filter(id => Number.isFinite(id));
              onCommitReorder(orderedIds);
            }
          }}
        />
      ))}
    </Reorder.Group>
  );
}
