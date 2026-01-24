import { useEffect, useMemo, useRef, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import type { GroupedTabs, TabGroup } from '@/services/tabs';
import {
  moveTabAcrossGroupsOptimistic,
  reorderTabsAtCurrentStartIndexOptimistic,
  reorderTabsOptimistic,
} from '@/store/actions/tab-actions';
import { GroupHeader } from './GroupHeader';
import { TabList } from './TabList';

type BlockId = string;

interface TabBlock {
  id: BlockId;
  group: TabGroup | null;
  tabs: GroupedTabs['tabs'];
}

function makeBlockId(group: GroupedTabs, runIndex: number): BlockId {
  if (group.group) return `g:${group.group.id}`;
  const firstTabId = group.tabs.find(t => typeof t.id === 'number')?.id;
  return `u:${firstTabId ?? runIndex}`;
}

function idsEqual(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function toTabIds(tabs: GroupedTabs['tabs']): number[] {
  return tabs.map(t => t.id).filter((id): id is number => typeof id === 'number');
}

export interface GroupedTabListProps {
  groupedTabs: GroupedTabs[];
  selectedTabIds: Set<number>;
  onActivate: (tabId: number) => void;
  onClose: (tabId: number) => void;
  onToggleSelect: (tabId: number, multi: boolean) => void;
}

function GroupBlock({
  block,
  selectedTabIds,
  onActivate,
  onClose,
  onToggleSelect,
  onGroupDragStart,
  onGroupDragEnd,
  onTabDragStart,
  onTabDragEnd,
  shouldCommitTabDrop,
}: {
  block: TabBlock;
  selectedTabIds: Set<number>;
  onActivate: (tabId: number) => void;
  onClose: (tabId: number) => void;
  onToggleSelect: (tabId: number, multi: boolean) => void;
  onGroupDragStart: (blockId: BlockId) => void;
  onGroupDragEnd: (blockId: BlockId) => void;
  onTabDragStart: (tabId: number, groupId: number | null) => void;
  onTabDragEnd: (tabId: number, groupId: number | null) => void;
  shouldCommitTabDrop: (tabId: number, groupId: number | null) => boolean;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      as="div"
      value={block.id}
      drag="y"
      dragControls={dragControls}
      dragListener={false}
      onDragStart={() => onGroupDragStart(block.id)}
      onDragEnd={() => onGroupDragEnd(block.id)}
      data-drop-group-id={block.group?.id ?? 'null'}
      className="relative rounded py-1"
    >
      {block.group ? <GroupHeader group={block.group} dragControls={dragControls} /> : null}

      <TabList
        tabs={block.tabs}
        selectedTabIds={selectedTabIds}
        onActivate={onActivate}
        onClose={onClose}
        onToggleSelect={onToggleSelect}
        onCommitReorder={orderedIds => void reorderTabsAtCurrentStartIndexOptimistic(orderedIds)}
        shouldCommitDrop={tabId => shouldCommitTabDrop(tabId, block.group?.id ?? null)}
        onTabDragStart={tabId => onTabDragStart(tabId, block.group?.id ?? null)}
        onTabDragEnd={tabId => onTabDragEnd(tabId, block.group?.id ?? null)}
      />
    </Reorder.Item>
  );
}

export function GroupedTabList({ groupedTabs, selectedTabIds, onActivate, onClose, onToggleSelect }: GroupedTabListProps) {
  const blocks: TabBlock[] = useMemo(
    () => groupedTabs.map((g, i) => ({ id: makeBlockId(g, i), group: g.group, tabs: g.tabs })),
    [groupedTabs],
  );

  const blockMap = useMemo(() => new Map(blocks.map(b => [b.id, b])), [blocks]);
  const blockIds = useMemo(() => blocks.map(b => b.id), [blocks]);

  const [order, setOrder] = useState<BlockId[]>(blockIds);
  const initialOrderRef = useRef<BlockId[]>(blockIds);

  const [hoverGroupId, setHoverGroupId] = useState<number | null>(null);
  const [draggingTabId, setDraggingTabId] = useState<number | null>(null);
  const draggingTabRef = useRef<{ tabId: number; sourceGroupId: number | null } | null>(null);

  useEffect(() => {
    if (!draggingTabId) return;

    const handler = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const host = el?.closest('[data-drop-group-id]') as HTMLElement | null;
      const raw = host?.dataset.dropGroupId;

      if (!raw) return;
      if (raw === 'null') {
        setHoverGroupId(null);
        return;
      }

      const next = Number(raw);
      if (!Number.isNaN(next)) setHoverGroupId(next);
    };

    window.addEventListener('pointermove', handler, { passive: true });
    return () => window.removeEventListener('pointermove', handler);
  }, [draggingTabId]);

  useEffect(() => {
    setOrder(blockIds);
    initialOrderRef.current = blockIds;
  }, [blockIds.join(',')]);

  const commitBlockOrderIfChanged = (nextOrder: BlockId[]) => {
    if (idsEqual(initialOrderRef.current, nextOrder)) return;

    const desiredTabIds = nextOrder.flatMap(id => toTabIds(blockMap.get(id)?.tabs ?? []));
    initialOrderRef.current = nextOrder;
    void reorderTabsOptimistic(desiredTabIds);
  };

  const shouldCommitTabDrop = (tabId: number, sourceGroupId: number | null): boolean => {
    const active = draggingTabRef.current;
    if (!active || active.tabId !== tabId) return true;

    const targetGroupId = hoverGroupId;
    if (targetGroupId === sourceGroupId) return true;

    // Basic cross-group drop: append to end of target group (or end of window for ungrouped).
    const allTabs = groupedTabs.flatMap(g => g.tabs);
    const targetTabs = groupedTabs.find(g => g.group?.id === targetGroupId)?.tabs ?? [];

    const maxIndex = Math.max(-1, ...allTabs.map(t => t.index ?? -1));
    const targetMaxIndex = Math.max(-1, ...targetTabs.map(t => t.index ?? -1));

    const toIndex = targetGroupId === null ? maxIndex + 1 : targetMaxIndex + 1;

    void moveTabAcrossGroupsOptimistic(tabId, targetGroupId, toIndex);
    return false;
  };

  return (
    <Reorder.Group axis="y" as="div" values={order} onReorder={setOrder} className="space-y-2">
      {order
        .map(id => blockMap.get(id))
        .filter((b): b is TabBlock => !!b)
        .map(block => (
          <GroupBlock
            key={block.id}
            block={block}
            selectedTabIds={selectedTabIds}
            onActivate={onActivate}
            onClose={onClose}
            onToggleSelect={onToggleSelect}
            onGroupDragStart={() => {
              initialOrderRef.current = order;
            }}
            onGroupDragEnd={() => {
              commitBlockOrderIfChanged(order);
            }}
            onTabDragStart={(tabId, groupId) => {
              draggingTabRef.current = { tabId, sourceGroupId: groupId };
              setDraggingTabId(tabId);
              setHoverGroupId(groupId);
            }}
            onTabDragEnd={() => {
              draggingTabRef.current = null;
              setDraggingTabId(null);
            }}
            shouldCommitTabDrop={shouldCommitTabDrop}
          />
        ))}
    </Reorder.Group>
  );
}
