import type { MouseEventHandler } from 'react';
import { Button } from '@/components/ui/Button';
import type { Tab } from '@/services/tabs';

export interface TabItemProps {
  tab: Tab;
  selected: boolean;
  onActivate: (tabId: number) => void;
  onClose: (tabId: number) => void;
  onToggleSelect: (tabId: number, multi: boolean) => void;
}

export function TabItem({ tab, selected, onActivate, onClose, onToggleSelect }: TabItemProps) {
  if (!tab.id) return null;

  const handleClick: MouseEventHandler<HTMLDivElement> = e => {
    const multi = e.metaKey || e.ctrlKey || e.shiftKey;
    onToggleSelect(tab.id!, multi);
    if (!multi) onActivate(tab.id!);
  };

  return (
    <div
      className={`flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm transition ${
        selected ? 'bg-white/15' : 'hover:bg-white/10'
      }`}
      onClick={handleClick}
    >
      <div className="flex h-4 w-4 items-center justify-center">
        {tab.favIconUrl ? (
          <img src={tab.favIconUrl} alt="" className="h-4 w-4" />
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
    </div>
  );
}
