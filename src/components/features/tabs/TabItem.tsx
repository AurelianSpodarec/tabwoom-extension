import type { MouseEventHandler } from 'react';
import { useRef } from 'react';
import { Reorder } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import type { Tab } from '@/services/tabs';

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
  onActivate: (tabId: number) => void;
  onClose: (tabId: number) => void;
  onToggleSelect: (tabId: number, multi: boolean) => void;
  onDragStart?: (tabId: number) => void;
  onDragEnd?: (tabId: number) => void;
}

export function TabItem({
  tab,
  selected,
  value,
  mode = 'reorder',
  ghosted,
  onActivate,
  onClose,
  onToggleSelect,
  onDragStart,
  onDragEnd,
}: TabItemProps) {
  if (!tab.id) return null;

  const draggingRef = useRef(false);

  const handleClick: MouseEventHandler<HTMLDivElement> = e => {
    if (ghosted) return;
    if (draggingRef.current) return;

    const multi = e.metaKey || e.ctrlKey || e.shiftKey;
    onToggleSelect(tab.id!, multi);
    if (!multi) onActivate(tab.id!);
  };

  const isDraggable = mode === 'reorder' && !ghosted && !tab.pinned;

  const cursorClass = ghosted ? 'cursor-default' : isDraggable ? 'cursor-grab active:cursor-grabbing' : tab.pinned ? 'cursor-default' : 'cursor-pointer';
  const hoverClass = ghosted ? '' : selected ? '' : 'hover:bg-white/10';
  const selectedClass = selected ? 'bg-white/15' : '';

  const className = `flex items-center gap-2 rounded px-2 py-2 text-sm transition-colors ${selectedClass} ${hoverClass} ${cursorClass} ${ghosted ? 'opacity-30 pointer-events-none' : ''}`;

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

  return (
    <Reorder.Item
      as="div"
      value={value ?? `t:${tab.id}`}
      drag={isDraggable ? 'y' : false}
      layout
      dragMomentum={false}
      dragElastic={0.05}
      whileDrag={{
        scale: 1.02,
        opacity: 0.9,
        zIndex: 50,
        boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
      }}
      className={className}
      onClick={handleClick}
      onDragStart={() => {
        draggingRef.current = true;
        onDragStart?.(tab.id!);
      }}
      onDragEnd={() => {
        // Click can fire after drag end; delay clearing the flag.
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
