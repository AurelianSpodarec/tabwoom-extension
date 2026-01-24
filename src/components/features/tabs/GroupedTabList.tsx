import type { GroupedTabs } from '@/services/tabs';
import { GroupHeader } from './GroupHeader';
import { TabList } from './TabList';

export interface GroupedTabListProps {
  groupedTabs: GroupedTabs[];
  selectedTabIds: Set<number>;
  onActivate: (tabId: number) => void;
  onClose: (tabId: number) => void;
  onToggleSelect: (tabId: number, multi: boolean) => void;
}

export function GroupedTabList({ groupedTabs, selectedTabIds, onActivate, onClose, onToggleSelect }: GroupedTabListProps) {
  return (
    <div>
      {groupedTabs.map((group, i) => (
        <div key={group.group?.id ?? `ungrouped-${i}`}>
          {group.group ? <GroupHeader group={group.group} /> : null}
          <TabList
            tabs={group.tabs}
            selectedTabIds={selectedTabIds}
            onActivate={onActivate}
            onClose={onClose}
            onToggleSelect={onToggleSelect}
          />
        </div>
      ))}
    </div>
  );
}
