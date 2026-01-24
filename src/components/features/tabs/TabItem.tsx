import type { MouseEventHandler } from 'react';
import { useRef } from 'react';
import { Reorder } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import type { Tab } from '@/services/tabs';

export interface TabItemProps {
  tab: Tab;
  selected: boolean;
  onActivate: (tabId: number) => void;
  onClose: (tabId: number) => void;
  onToggleSelect: (tabId: number, multi: boolean) => void;
  onDragStart?: (tabId: number) => void;
  onDragEnd?: (tabId: number) => void;
}

export function TabItem({ tab, selected, onActivate, onClose, onToggleSelect, onDragStart, onDragEnd }: TabItemProps) {
  if (!tab.id) return null;

  const draggingRef = useRef(false);

  const handleClick: MouseEventHandler<HTMLDivElement> = e => {
    if (draggingRef.current) return;

    const multi = e.metaKey || e.ctrlKey || e.shiftKey;
    onToggleSelect(tab.id!, multi);
    if (!multi) onActivate(tab.id!);
  };

  return (
    <Reorder.Item
      as="div"
      value={tab.id}
      drag={tab.pinned ? false : 'y'}
      layout
      dragMomentum={false}
      dragElastic={0.05}
      whileDrag={{
        scale: 1.02,
        opacity: 0.9,
        zIndex: 50,
        boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
      }}
      className={`flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm transition-colors ${
        selected ? 'bg-white/15' : 'hover:bg-white/10'
      } ${tab.pinned ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
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
        onClick={e => {
          e.stopPropagation();
          onClose(tab.id!);
        }}
        aria-label="Close tab"
        title="Close"
      >
        ×
      </Button>
    </Reorder.Item>
  );
}
