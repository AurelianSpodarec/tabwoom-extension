import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { MutableRefObject } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import type { DisplayItem } from '@/store';
import { buildDisplayList, useDragStore } from '@/store';
import type { Tab, TabGroup } from '@/services/tabs';
import { moveGroupOptimistic, moveTabAcrossGroupsOptimistic, reorderTabsOptimistic } from '@/store/actions/tab-actions';
import { computeTabDrop } from '@/lib/drag/computeDropResult';
import { computeGroupDragTargetIndex } from '@/lib/drag/computeGroupDragTargetIndex';
import { clampGroupHeaderPlacement } from '@/lib/drag/clampGroupHeaderPlacement';
import { mergeReorderWithAnchors } from '@/lib/drag/mergeReorderWithAnchors';
import { GroupHeader } from './GroupHeader';
import { TabItem } from './TabItem';
import { DropIndicator } from './DropIndicator';
import { draggedGroupStyle } from '@/lib/motion-config';

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



function GroupHeaderItem({
  item,
  tabs,
  orderRef,
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
  initialOrderRef: MutableRefObject<string[]>;
  tabCount: number;
  isDragging: boolean;
  onGroupDragStart: (groupId: number, tabIds: number[]) => void;
  onGroupDragEnd: () => void;
  onFallbackCommit: () => void;
  onMoveGroup: (tabIds: number[], groupId: number) => void;
}) {
  const dragControls = useDragControls();
  const dragStore = useDragStore();
  const dragTabIdsRef = useRef<number[]>([]);

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
      whileDrag={draggedGroupStyle}
      onDragStart={() => {
        const groupTabIds = tabs
          .filter(t => typeof t.id === 'number' && !t.pinned && normalizeGroupId(t.groupId) === item.groupId)
          .sort(byIndex)
          .map(t => t.id as number);

        dragTabIdsRef.current = groupTabIds;
        initialOrderRef.current = orderRef.current;
        onGroupDragStart(item.groupId, groupTabIds);
      }}
      onDragEnd={() => {
        onGroupDragEnd();

        const drag = dragStore.drag;
        if (drag.kind !== 'dragging-group' || drag.groupId !== item.groupId) {
          onFallbackCommit();
          return;
        }

        const tabIds = dragTabIdsRef.current;
        if (tabIds.length === 0) {
          onFallbackCommit();
          return;
        }

        onMoveGroup(tabIds, item.groupId);
      }}
    >
      <GroupHeader
        group={item.group}
        dragControls={dragControls}
        isDragging={isDragging}
        tabCount={tabCount}
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
  
  // Separate pinned tabs from the main list (pinned tabs are always at the start)
  const { pinnedItems, unpinnedItems } = useMemo(() => {
    const pinned: DisplayItem[] = [];
    const unpinned: DisplayItem[] = [];
    
    for (const item of displayItems) {
      if (item.type === 'tab' && item.tab.pinned) {
        pinned.push(item);
      } else {
        unpinned.push(item);
      }
    }
    
    return { pinnedItems: pinned, unpinnedItems: unpinned };
  }, [displayItems]);
  
  const itemByKey = useMemo(() => new Map(displayItems.map(i => [i.key, i])), [displayItems]);
  const keys = useMemo(() => unpinnedItems.map(i => i.key), [unpinnedItems]);

  const [order, setOrder] = useState<string[]>(keys);
  const orderRef = useRef<string[]>(keys);
  const initialOrderRef = useRef<string[]>(keys);

  const dragStore = useDragStore();
  const drag = dragStore.drag;
  const draggingGroupId = drag.kind === 'dragging-group' ? drag.groupId : null;

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

  const setOrderState = useCallback((next: string[]) => {
    orderRef.current = next;
    setOrder(next);
  }, []);

  const hoveredHeaderGroupIdRef = useRef<number | null>(null);

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
    const merged =
      ghostedTabKeySet.size === 0
        ? nextReorderValues
        : mergeReorderWithAnchors({
            baseOrder: orderRef.current,
            anchoredKeys: ghostedTabKeySet,
            nextReorderValues,
          });

    if (drag.kind === 'dragging-tab') {
      const draggedKey = `t:${drag.tabId}`;
      const idx = merged.indexOf(draggedKey);
      const afterKey = idx > 0 ? merged[idx - 1] : null;
      const afterItem = afterKey ? itemByKey.get(afterKey) : null;
      const groupColor = afterItem?.type === 'group-header' ? afterItem.group.color : undefined;
      dragStore.setDropIndicator({ afterKey, groupColor });
    }

    if (drag.kind !== 'dragging-group') {
      setOrderState(merged);
      return;
    }

    const headerKey = `h:${drag.groupId}`;
    const prevHeaderIndex = orderRef.current.indexOf(headerKey);
    const nextHeaderIndex = merged.indexOf(headerKey);

    const direction =
      nextHeaderIndex > prevHeaderIndex ? 'down' : nextHeaderIndex < prevHeaderIndex ? 'up' : undefined;

    const clamped = clampGroupHeaderPlacement({
      orderKeys: merged,
      draggedGroupId: drag.groupId,
      itemByKey,
      direction,
      draggedTabKeys: ghostedTabKeySet,
    });

    const clampedIdx = clamped.indexOf(headerKey);
    const afterKey = clampedIdx > 0 ? clamped[clampedIdx - 1] : null;
    dragStore.setDropIndicator({ afterKey });

    setOrderState(clamped);
  };

  const orderedUnpinnedItems = useMemo(() => order.map(k => itemByKey.get(k)).filter((i): i is DisplayItem => !!i), [order, itemByKey]);
  const dropIndicator = dragStore.dropIndicator;

  const renderDropIndicator = (afterKey: string | null) => {
    if (!dropIndicator || dropIndicator.afterKey !== afterKey) return null;
    if (drag.kind === 'idle') return null;
    return <DropIndicator visible groupColor={dropIndicator.groupColor} />;
  };

  const hasPinnedTabs = pinnedItems.length > 0;

  return (
    <div className="space-y-1">
      {/* Pinned tabs section - not draggable */}
      {hasPinnedTabs && (
        <div className="space-y-1">
          {pinnedItems.map(item => {
            if (item.type !== 'tab') return null;
            const tab = item.tab;
            const tabId = item.tabId;
            return (
              <TabItem
                key={item.key}
                mode="static"
                tab={tab}
                selected={selectedTabIds.has(tabId)}
                onActivate={onActivate}
                onClose={onClose}
                onToggleSelect={onToggleSelect}
              />
            );
          })}
          {/* Divider between pinned and unpinned */}
          <div className="mx-2 my-2 h-px bg-white/20" />
        </div>
      )}
      
      {/* Unpinned tabs - draggable */}
      <Reorder.Group axis="y" as="div" values={reorderValues} onReorder={onReorder} layoutScroll className="space-y-1">
        {renderDropIndicator(null)}
        {orderedUnpinnedItems.map(item => {
        if (item.type === 'group-header') {
          return (
            <React.Fragment key={item.key}>
              <GroupHeaderItem
                item={item}
                tabs={tabs}
                orderRef={orderRef}
                initialOrderRef={initialOrderRef}
                tabCount={groupTabCountById.get(item.groupId) ?? 0}
                isDragging={draggingGroupId === item.groupId}
                onGroupDragStart={(groupId, tabIds) => {
                  dragStore.startGroupDrag(groupId, tabIds);
                }}
                onGroupDragEnd={() => dragStore.endDrag()}
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
              {renderDropIndicator(item.key)}
            </React.Fragment>
          );
        }

        const tab = item.tab;
        const tabId = item.tabId;
        const sourceGroupId = normalizeGroupId(tab.groupId);

        // Skip rendering tabs from the dragging group entirely for performance.
        // This avoids DOM overhead with large groups (200+ tabs).
        const isInDraggingGroup = draggingGroupId !== null && sourceGroupId === draggingGroupId;
        if (isInDraggingGroup) {
          return null;
        }

        return (
          <React.Fragment key={item.key}>
            <TabItem
              value={item.key}
              tab={tab}
              selected={selectedTabIds.has(tabId)}
              isDragActive={drag.kind !== 'idle'}
              onActivate={onActivate}
              onClose={onClose}
              onToggleSelect={onToggleSelect}
              onDragStart={() => {
                dragStore.startTabDrag(tabId, sourceGroupId);
                initialOrderRef.current = orderRef.current;
                hoveredHeaderGroupIdRef.current = sourceGroupId;
              }}
              onDragEnd={() => {
                const currentDrag = dragStore.drag;
                dragStore.endDrag();

                if (currentDrag.kind !== 'dragging-tab' || currentDrag.tabId !== tabId) {
                  commitIfChanged(orderRef.current);
                  return;
                }

                if (idsEqual(initialOrderRef.current, orderRef.current)) return;

                const finalItems = orderRef.current.map(k => itemByKey.get(k)).filter((i): i is DisplayItem => !!i);
                const dropIndex = finalItems.findIndex(i => i.type === 'tab' && i.tabId === tabId);
                if (dropIndex === -1) return;

                const drop = computeTabDrop(finalItems, tabId, dropIndex, currentDrag.sourceGroupId, {
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
              onHoverGroupChange={groupId => {
                hoveredHeaderGroupIdRef.current = groupId;
              }}
            />
            {renderDropIndicator(item.key)}
          </React.Fragment>
        );
      })}
      </Reorder.Group>
    </div>
  );
}
