import type { MouseEventHandler, PointerEventHandler } from 'react';
import { useRef, useEffect, useCallback } from 'react';
import { Reorder } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import type { Tab } from '@/services/tabs';
import { draggedItemStyle, layoutTransition } from '@/lib/motion-config';

export interface TabItemProps {
  tab: Tab;
  selected: boolean;
  /**
   * `Reorder.Item` value. Use a prefixed string to avoid collisions with other draggable types.
   * Defaults to `t:${tab.id}`.
   */
  value?: string;
  /**
   * Some interactions (like dragging a group) want the tab to remain visible but not participate in
   * Reorder physics. In that case we render a plain div instead of a `Reorder.Item`.
   */
  mode?: 'reorder' | 'static';
  /**
   * Visually de-emphasize the row and disable pointer interaction.
   */
  ghosted?: boolean;
  /**
   * Whether any drag is currently active (used to disable pointer events on non-dragged items).
   */
  isDragActive?: boolean;
  onActivate: (tabId: number) => void;
  onClose: (tabId: number) => void;
  onToggleSelect: (tabId: number, multi: boolean) => void;
  onDragStart?: (tabId: number) => void;
  onDragEnd?: (tabId: number) => void;
  /**
   * Called when the pointer moves over a group header during drag.
   */
  onHoverGroupChange?: (groupId: number | null) => void;
}

export function TabItem({
  tab,
  selected,
  value,
  mode = 'reorder',
  ghosted,
  isDragActive,
  onActivate,
  onClose,
  onToggleSelect,
  onDragStart,
  onDragEnd,
  onHoverGroupChange,
}: TabItemProps) {
  if (!tab.id) return null;

  const draggingRef = useRef(false);
  const hoverCleanupRef = useRef<(() => void) | null>(null);

  const handleClick: MouseEventHandler<HTMLDivElement> = e => {
    if (ghosted) return;
    if (draggingRef.current) return;

    const multi = e.metaKey || e.ctrlKey || e.shiftKey;
    onToggleSelect(tab.id!, multi);
    if (!multi) onActivate(tab.id!);
  };

  const isDraggable = mode === 'reorder' && !ghosted && !tab.pinned;
  const isThisDragging = draggingRef.current;
  const shouldDisablePointer = isDragActive && !isThisDragging;

  const cursorClass = ghosted ? 'cursor-default' : isDraggable ? 'cursor-grab active:cursor-grabbing' : tab.pinned ? 'cursor-default' : 'cursor-pointer';
  const hoverClass = ghosted || shouldDisablePointer ? '' : selected ? '' : 'hover:bg-white/10';
  const selectedClass = selected ? 'bg-white/15' : '';
  const pointerClass = ghosted ? 'opacity-30 pointer-events-none' : shouldDisablePointer ? 'pointer-events-none' : '';

  const className = `flex items-center gap-2 rounded px-2 py-2 text-sm transition-colors ${selectedClass} ${hoverClass} ${cursorClass} ${pointerClass}`;

  const contents = (
    <>
      <div className="flex h-4 w-4 items-center justify-center">
        {tab.favIconUrl ? (
          <img src={tab.favIconUrl} alt="" className="h-4 w-4" draggable={false} />
        ) : (
          <div className="h-2 w-2 rounded-full bg-white/40" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate">
          {tab.pinned ? <span className="mr-1 text-xs text-white/60">PIN</span> : null}
          {tab.title || tab.url || 'Untitled'}
        </div>
      </div>

      <Button
        variant="ghost"
        className="h-7 px-2 py-0 text-white/80 hover:text-white"
        disabled={ghosted}
        onClick={e => {
          if (ghosted) return;
          e.stopPropagation();
          onClose(tab.id!);
        }}
        aria-label="Close tab"
        title="Close"
      >
        ×
      </Button>
    </>
  );

  if (mode === 'static') {
    return (
      <div className={className} onClick={handleClick} aria-disabled={ghosted}>
        {contents}
      </div>
    );
  }

  const setupHoverTracking = useCallback(() => {
    if (!onHoverGroupChange) return;

    let lastGroupId: number | null = null;
    let rafId: number | null = null;

    const handler = (e: PointerEvent) => {
      if (rafId !== null) return;

      rafId = requestAnimationFrame(() => {
        rafId = null;
        const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        const host = el?.closest?.('[data-group-header-id]') as HTMLElement | null;
        const raw = host?.dataset.groupHeaderId;

        const nextGroupId = raw ? Number(raw) : null;
        const validGroupId = nextGroupId !== null && Number.isFinite(nextGroupId) ? nextGroupId : null;

        if (validGroupId !== lastGroupId) {
          lastGroupId = validGroupId;
          onHoverGroupChange(validGroupId);
        }
      });
    };

    window.addEventListener('pointermove', handler, { passive: true });
    hoverCleanupRef.current = () => {
      window.removeEventListener('pointermove', handler);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [onHoverGroupChange]);

  return (
    <Reorder.Item
      as="div"
      value={value ?? `t:${tab.id}`}
      drag={isDraggable ? 'y' : false}
      layout
      layoutTransition={layoutTransition}
      dragMomentum={false}
      dragElastic={0.05}
      whileDrag={draggedItemStyle}
      className={className}
      onClick={handleClick}
      onDragStart={() => {
        draggingRef.current = true;
        setupHoverTracking();
        onDragStart?.(tab.id!);
      }}
      onDragEnd={() => {
        hoverCleanupRef.current?.();
        hoverCleanupRef.current = null;
        setTimeout(() => {
          draggingRef.current = false;
        }, 0);
        onDragEnd?.(tab.id!);
      }}
      aria-grabbed={draggingRef.current}
    >
      {contents}
    </Reorder.Item>
  );
}
