import { useRef } from 'react';
import type { MutableRefObject } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import type { DisplayItem } from '@/store';
import { useDragStore } from '@/store';
import type { Tab } from '@/services/tabs';
import { normalizeGroupId } from '@/lib/utils/group';
import { draggedGroupStyle } from '@/lib/motion-config';
import { GroupHeader } from './GroupHeader';

function byIndex(a: Tab, b: Tab): number {
  return (a.index ?? 0) - (b.index ?? 0);
}

export interface GroupHeaderItemProps {
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
}

export function GroupHeaderItem({
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
}: GroupHeaderItemProps) {
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
