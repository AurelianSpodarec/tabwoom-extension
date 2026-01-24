import type { Tab } from '@/services/tabs';
import { TabItem } from './TabItem';

export interface TabListProps {
  tabs: Tab[];
  selectedTabIds: Set<number>;
  onActivate: (tabId: number) => void;
  onClose: (tabId: number) => void;
  onToggleSelect: (tabId: number, multi: boolean) => void;
}

export function TabList({ tabs, selectedTabIds, onActivate, onClose, onToggleSelect }: TabListProps) {
  return (
    <div className="flex flex-col gap-1">
      {tabs.map(tab => (
        <TabItem
          key={tab.id}
          tab={tab}
          selected={!!tab.id && selectedTabIds.has(tab.id)}
          onActivate={onActivate}
          onClose={onClose}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}
