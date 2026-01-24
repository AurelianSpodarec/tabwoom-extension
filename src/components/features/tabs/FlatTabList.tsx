import { useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { flushSync } from 'react-dom';
import { Reorder, useDragControls } from 'framer-motion';
import type { DisplayItem } from '@/store';
import { buildDisplayList } from '@/store';
import type { Tab, TabGroup } from '@/services/tabs';
import { moveGroupOptimistic, moveTabAcrossGroupsOptimistic, reorderTabsOptimistic } from '@/store/actions/tab-actions';
import { computeTabDrop } from '@/lib/drag/computeDropResult';
import { computeGroupDragTargetIndex } from '@/lib/drag/computeGroupDragTargetIndex';
import { clampGroupHeaderPlacement } from '@/lib/drag/clampGroupHeaderPlacement';
import { mergeReorderWithAnchors } from '@/lib/drag/mergeReorderWithAnchors';
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

function byIndex(a: Tab, b: Tab): number {
  return (a.index ?? 0) - (b.index ?? 0);
}


type DragState =
  | { kind: 'tab'; tabId: number; sourceGroupId: number | null }
  | { kind: 'group'; groupId: number; tabIds: number[] }
  | null;

function GroupHeaderItem({
  item,
  tabs,
  orderRef,
  dragRef,
  initialOrderRef,
  tabCount,
  isDragging,
  onGroupDragStart,
  onGroupDragEnd,
  onFallbackCommit,
  onMoveGroup,
}: {
  item: Extract<DisplayItem, { type: 'group-header' }>;
  tabs: Tab[];
  orderRef: MutableRefObject<string[]>;
  dragRef: MutableRefObject<DragState>;
  initialOrderRef: MutableRefObject<string[]>;
  tabCount: number;
  isDragging: boolean;
  onGroupDragStart: () => void;
  onGroupDragEnd: () => void;
  onFallbackCommit: () => void;
  onMoveGroup: (tabIds: number[], groupId: number) => void;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={item.key}
      drag="y"
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0.05}
      className="relative rounded py-1 touch-none"
      data-group-header-id={item.groupId}
      whileDrag={{
        zIndex: 60,
      }}
      onDragStart={() => {
        onGroupDragStart();

        const groupTabIds = tabs
          .filter(t => typeof t.id === 'number' && !t.pinned && normalizeGroupId(t.groupId) === item.groupId)
          .sort(byIndex)
          .map(t => t.id as number);

        dragRef.current = { kind: 'group', groupId: item.groupId, tabIds: groupTabIds };
        initialOrderRef.current = orderRef.current;
      }}
      onDragEnd={() => {
        onGroupDragEnd();

        const active = dragRef.current;
        dragRef.current = null;

        if (!active || active.kind !== 'group' || active.groupId !== item.groupId) {
          onFallbackCommit();
          return;
        }

        if (active.tabIds.length === 0) {
          onFallbackCommit();
          return;
        }

        onMoveGroup(active.tabIds, active.groupId);
      }}
    >
      <GroupHeader
        group={item.group}
        dragControls={dragControls}
        isDragging={isDragging}
        tabCount={tabCount}
        onDragHandlePointerDown={onGroupDragStart}
      />
    </Reorder.Item>
  );
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
  const orderRef = useRef<string[]>(keys);
  const initialOrderRef = useRef<string[]>(keys);

  const [draggingGroupId, setDraggingGroupId] = useState<number | null>(null);

  const groupTabCountById = useMemo(() => {
    const counts = new Map<number, number>();

    for (const tab of tabs) {
      if (!tab || tab.pinned) continue;
      const gid = normalizeGroupId(tab.groupId);
      if (gid === null) continue;
      counts.set(gid, (counts.get(gid) ?? 0) + 1);
    }

    return counts;
  }, [tabs]);

  const ghostedTabKeySet = useMemo(() => {
    if (draggingGroupId === null) return new Set<string>();

    const set = new Set<string>();
    for (const item of displayItems) {
      if (item.type !== 'tab') continue;
      if (normalizeGroupId(item.tab.groupId) !== draggingGroupId) continue;
      set.add(item.key);
    }

    return set;
  }, [displayItems, draggingGroupId]);

  const reorderValues = useMemo(() => {
    if (ghostedTabKeySet.size === 0) return order;
    return order.filter(k => !ghostedTabKeySet.has(k));
  }, [order, ghostedTabKeySet]);

  const setOrderState = (next: string[]) => {
    orderRef.current = next;
    setOrder(next);
  };

  const dragRef = useRef<DragState>(null);

  const hoveredHeaderGroupIdRef = useRef<number | null>(null);
  const headerHoverCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setOrderState(keys);
    initialOrderRef.current = keys;
  }, [keys.join(',')]);

  const commitIfChanged = (finalOrder: string[]) => {
    if (idsEqual(initialOrderRef.current, finalOrder)) return;

    const desiredTabIds = finalOrder.map(parseTabKey).filter((id): id is number => typeof id === 'number');
    initialOrderRef.current = finalOrder;

    void reorderTabsOptimistic(desiredTabIds);
  };

  const onReorder = (nextReorderValues: string[]) => {
    const active = dragRef.current;

    const merged =
      ghostedTabKeySet.size === 0
        ? nextReorderValues
        : mergeReorderWithAnchors({
            baseOrder: orderRef.current,
            anchoredKeys: ghostedTabKeySet,
            nextReorderValues,
          });

    if (active?.kind !== 'group') {
      setOrderState(merged);
      return;
    }

    const headerKey = `h:${active.groupId}`;
    const prevHeaderIndex = orderRef.current.indexOf(headerKey);
    const nextHeaderIndex = merged.indexOf(headerKey);

    const direction =
      nextHeaderIndex > prevHeaderIndex ? 'down' : nextHeaderIndex < prevHeaderIndex ? 'up' : undefined;

    setOrderState(
      clampGroupHeaderPlacement({
        orderKeys: merged,
        draggedGroupId: active.groupId,
        itemByKey,
        direction,
      }),
    );
  };

  const orderedItems = useMemo(() => order.map(k => itemByKey.get(k)).filter((i): i is DisplayItem => !!i), [order, itemByKey]);

  return (
    <Reorder.Group axis="y" as="div" values={reorderValues} onReorder={onReorder} layoutScroll className="space-y-1">
      {orderedItems.map(item => {
        if (item.type === 'group-header') {
          return (
            <GroupHeaderItem
              key={item.key}
              item={item}
              tabs={tabs}
              orderRef={orderRef}
              dragRef={dragRef}
              initialOrderRef={initialOrderRef}
              tabCount={groupTabCountById.get(item.groupId) ?? 0}
              isDragging={draggingGroupId === item.groupId}
              onGroupDragStart={() => {
                // We change the `Reorder.Group` values set when a group drag starts.
                // Flush synchronously so Framer starts the drag against the right list.
                flushSync(() => setDraggingGroupId(item.groupId));
              }}
              onGroupDragEnd={() => setDraggingGroupId(null)}
              onFallbackCommit={() => commitIfChanged(orderRef.current)}
              onMoveGroup={(tabIds, groupId) => {
                const pinnedCount = tabs.filter(t => !!t.pinned).length;
                const toIndex = computeGroupDragTargetIndex({
                  finalOrderKeys: orderRef.current,
                  draggedGroupId: groupId,
                  draggedTabIds: tabIds,
                  pinnedCount,
                });
                void moveGroupOptimistic(groupId, toIndex);
              }}
            />
          );
        }

        const tab = item.tab;
        const tabId = item.tabId;
        const sourceGroupId = normalizeGroupId(tab.groupId);

        const ghosted = draggingGroupId !== null && sourceGroupId === draggingGroupId;

        if (ghosted) {
          return (
            <TabItem
              key={item.key}
              mode="static"
              ghosted
              value={item.key}
              tab={tab}
              selected={selectedTabIds.has(tabId)}
              onActivate={onActivate}
              onClose={onClose}
              onToggleSelect={onToggleSelect}
            />
          );
        }

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
              initialOrderRef.current = orderRef.current;

              hoveredHeaderGroupIdRef.current = null;
              headerHoverCleanupRef.current?.();

              const handler = (e: PointerEvent) => {
                const els = document.elementsFromPoint(e.clientX, e.clientY) as HTMLElement[];
                let raw: string | undefined;

                for (const el of els) {
                  const host = el?.closest?.('[data-group-header-id]') as HTMLElement | null;
                  if (host?.dataset.groupHeaderId) {
                    raw = host.dataset.groupHeaderId;
                    break;
                  }
                }

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
                commitIfChanged(orderRef.current);
                return;
              }

              if (idsEqual(initialOrderRef.current, orderRef.current)) return;

              const finalItems = orderRef.current.map(k => itemByKey.get(k)).filter((i): i is DisplayItem => !!i);
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
