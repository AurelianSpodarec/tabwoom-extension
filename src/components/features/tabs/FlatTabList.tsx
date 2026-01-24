import { useEffect, useMemo, useRef, useState } from 'react';
import { Reorder } from 'framer-motion';
import type { DisplayItem } from '@/store';
import { buildDisplayList } from '@/store';
import type { Tab, TabGroup } from '@/services/tabs';
import { moveTabAcrossGroupsOptimistic, reorderTabsOptimistic } from '@/store/actions/tab-actions';
import { computeTabDrop } from '@/lib/drag/computeDropResult';
import { GroupHeader } from './GroupHeader';
import { TabItem } from './TabItem';

function idsEqual(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function normalizeGroupId(groupId: number | undefined): number | null {
  if (typeof groupId !== 'number') return null;
  return groupId === -1 ? null : groupId;
}

function parseTabKey(key: string): number | null {
  if (!key.startsWith('t:')) return null;
  const id = Number(key.slice(2));
  return Number.isFinite(id) ? id : null;
}

function moveInList<T>(list: T[], item: T, toIndex: number): T[] {
  const from = list.indexOf(item);
  if (from === -1) return list;

  const next = [...list];
  next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, toIndex)), 0, item);
  return next;
}

function stabilizeSegmentMove(currentOrder: string[], nextOrder: string[], segmentKeys: string[]): string[] {
  const seg = new Set(segmentKeys);
  const headerKey = segmentKeys[0];
  const headerIndex = nextOrder.indexOf(headerKey);
  if (headerIndex === -1) return nextOrder;

  // Find the closest non-segment key preceding the header in the proposed order.
  let prevAnchor: string | null = null;
  for (let i = headerIndex - 1; i >= 0; i--) {
    const k = nextOrder[i];
    if (!seg.has(k)) {
      prevAnchor = k;
      break;
    }
  }

  const base = nextOrder.filter(k => !seg.has(k));
  const insertAt = prevAnchor ? base.indexOf(prevAnchor) + 1 : 0;

  const stable = [...base.slice(0, insertAt), ...segmentKeys, ...base.slice(insertAt)];

  // Preserve any local tab reorders within the segment by keeping their current-order sequence.
  // (Dragging a group header should not reshuffle the tabs in that group.)
  const stableSet = new Set(stable);
  return stable.filter(k => stableSet.has(k));
}

function getGroupSegmentKeys(order: string[], itemByKey: Map<string, DisplayItem>, groupId: number): string[] {
  const headerKey = `h:${groupId}`;
  const start = order.indexOf(headerKey);
  if (start === -1) return [];

  const keys: string[] = [headerKey];
  for (let i = start + 1; i < order.length; i++) {
    const k = order[i];
    const item = itemByKey.get(k);
    if (!item) continue;
    if (item.type === 'group-header') break;
    keys.push(k);
  }
  return keys;
}

export interface FlatTabListProps {
  tabs: Tab[];
  groups: TabGroup[];
  selectedTabIds: Set<number>;
  onActivate: (tabId: number) => void;
  onClose: (tabId: number) => void;
  onToggleSelect: (tabId: number, multi: boolean) => void;
}

export function FlatTabList({ tabs, groups, selectedTabIds, onActivate, onClose, onToggleSelect }: FlatTabListProps) {
  const displayItems = useMemo(() => buildDisplayList(tabs, groups), [tabs, groups]);
  const itemByKey = useMemo(() => new Map(displayItems.map(i => [i.key, i])), [displayItems]);
  const keys = useMemo(() => displayItems.map(i => i.key), [displayItems]);

  const [order, setOrder] = useState<string[]>(keys);
  const initialOrderRef = useRef<string[]>(keys);

  const dragRef = useRef<
    | { kind: 'tab'; tabId: number; sourceGroupId: number | null }
    | { kind: 'group'; groupId: number; segmentKeys: string[] }
    | null
  >(null);

  const hoveredHeaderGroupIdRef = useRef<number | null>(null);
  const headerHoverCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setOrder(keys);
    initialOrderRef.current = keys;
  }, [keys.join(',')]);

  const commitIfChanged = (finalOrder: string[]) => {
    if (idsEqual(initialOrderRef.current, finalOrder)) return;

    const desiredTabIds = finalOrder.map(parseTabKey).filter((id): id is number => typeof id === 'number');
    initialOrderRef.current = finalOrder;

    void reorderTabsOptimistic(desiredTabIds);
  };

  const onReorder = (nextOrder: string[]) => {
    const active = dragRef.current;
    if (active?.kind === 'group') {
      const stable = stabilizeSegmentMove(order, nextOrder, active.segmentKeys);
      setOrder(stable);
      return;
    }

    setOrder(nextOrder);
  };

  const orderedItems = useMemo(() => order.map(k => itemByKey.get(k)).filter((i): i is DisplayItem => !!i), [order, itemByKey]);

  return (
    <Reorder.Group axis="y" as="div" values={order} onReorder={onReorder} layoutScroll className="space-y-1">
      {orderedItems.map(item => {
        if (item.type === 'group-header') {
          return (
            <Reorder.Item
              key={item.key}
              value={item.key}
              drag="y"
              dragMomentum={false}
              dragElastic={0.05}
              className="relative rounded py-1"
              data-group-header-id={item.groupId}
              onDragStart={() => {
                const segmentKeys = getGroupSegmentKeys(order, itemByKey, item.groupId);
                dragRef.current = { kind: 'group', groupId: item.groupId, segmentKeys };
                initialOrderRef.current = order;
              }}
              onDragEnd={() => {
                dragRef.current = null;
                commitIfChanged(order);
              }}
            >
              <GroupHeader group={item.group} />
            </Reorder.Item>
          );
        }

        const tab = item.tab;
        const tabId = item.tabId;
        const sourceGroupId = normalizeGroupId(tab.groupId);

        return (
          <TabItem
            key={item.key}
            value={item.key}
            tab={tab}
            selected={selectedTabIds.has(tabId)}
            onActivate={onActivate}
            onClose={onClose}
            onToggleSelect={onToggleSelect}
            onDragStart={() => {
              dragRef.current = { kind: 'tab', tabId, sourceGroupId };
              initialOrderRef.current = order;

              hoveredHeaderGroupIdRef.current = null;
              headerHoverCleanupRef.current?.();

              const handler = (e: PointerEvent) => {
                const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
                const host = el?.closest('[data-group-header-id]') as HTMLElement | null;
                const raw = host?.dataset.groupHeaderId;
                const next = raw ? Number(raw) : null;
                hoveredHeaderGroupIdRef.current = next !== null && Number.isFinite(next) ? next : null;
              };

              window.addEventListener('pointermove', handler, { passive: true });
              headerHoverCleanupRef.current = () => window.removeEventListener('pointermove', handler);
            }}
            onDragEnd={() => {
              const active = dragRef.current;
              dragRef.current = null;

              headerHoverCleanupRef.current?.();
              headerHoverCleanupRef.current = null;

              if (!active || active.kind !== 'tab' || active.tabId !== tabId) {
                // Fall back to a generic commit if something got out of sync.
                commitIfChanged(order);
                return;
              }

              if (idsEqual(initialOrderRef.current, order)) return;

              const finalItems = order.map(k => itemByKey.get(k)).filter((i): i is DisplayItem => !!i);
              const dropIndex = finalItems.findIndex(i => i.type === 'tab' && i.tabId === tabId);
              if (dropIndex === -1) return;

              const drop = computeTabDrop(finalItems, tabId, dropIndex, active.sourceGroupId, {
                hoveredHeaderGroupId: hoveredHeaderGroupIdRef.current,
              });

              const rawTabOrder = finalItems
                .filter((i): i is Extract<DisplayItem, { type: 'tab' }> => i.type === 'tab')
                .map(i => i.tabId);

              const desiredTabOrder = moveInList(rawTabOrder, tabId, drop.newIndex);

              if (drop.type === 'reorder') {
                void reorderTabsOptimistic(desiredTabOrder);
                return;
              }

              void moveTabAcrossGroupsOptimistic(tabId, drop.newGroupId, drop.newIndex);
            }}
          />
        );
      })}
    </Reorder.Group>
  );
}
