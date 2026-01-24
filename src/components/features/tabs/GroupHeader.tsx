import type { PointerEventHandler } from 'react';
import type { DragControls } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import type { TabGroup } from '@/services/tabs';
import { updateGroup } from '@/store/actions/tab-actions';

const colorToClass: Record<string, string> = {
  grey: 'bg-neutral-400',
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-400',
  green: 'bg-green-500',
  pink: 'bg-pink-500',
  purple: 'bg-purple-500',
  cyan: 'bg-cyan-400',
  orange: 'bg-orange-500',
};

export interface GroupHeaderProps {
  group: TabGroup;
  dragControls?: DragControls;
  isDragging?: boolean;
  tabCount?: number;
  /**
   * Lets the parent update state before the drag session starts (avoids mid-drag remount issues).
   */
  onDragHandlePointerDown?: () => void;
}

export function GroupHeader({ group, dragControls, isDragging, tabCount, onDragHandlePointerDown }: GroupHeaderProps) {
  const title = group.title?.trim() || 'Group';
  const colorClass = colorToClass[group.color] ?? 'bg-white/40';

  const handlePointerDown: PointerEventHandler<HTMLDivElement> | undefined = dragControls
    ? e => {
        onDragHandlePointerDown?.();

        // Prevent triggering any nested click handlers during drag.
        e.stopPropagation();
        dragControls.start(e);
      }
    : undefined;

  const badge = typeof tabCount === 'number' ? `${tabCount} ${tabCount === 1 ? 'tab' : 'tabs'}` : null;

  return (
    <div className="mb-1 mt-3 flex items-center justify-between gap-2 px-2">
      <div
        className={`flex min-w-0 items-center gap-2 select-none ${dragControls ? 'cursor-grab active:cursor-grabbing' : ''}`}
        onPointerDown={handlePointerDown}
      >
        <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${colorClass}`} />
        <div className="truncate text-xs font-semibold uppercase tracking-wide text-white/70">{title}</div>

        {isDragging && badge ? (
          <div className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/60">{badge}</div>
        ) : null}
      </div>

      <Button
        variant="ghost"
        className="h-7 px-2 py-0 text-xs text-white/70"
        onClick={() => void updateGroup(group.id, { collapsed: !group.collapsed })}
        title={group.collapsed ? 'Expand group' : 'Collapse group'}
      >
        {group.collapsed ? 'Expand' : 'Collapse'}
      </Button>
    </div>
  );
}
