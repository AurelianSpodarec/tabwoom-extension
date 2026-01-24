import type { Browser } from 'wxt/browser';

export type Tab = Browser.tabs.Tab;
export type TabGroup = Browser.tabGroups.TabGroup;
export type TabGroupColor = Browser.tabGroups.Color;

export interface TabWithGroup extends Tab {
  group?: TabGroup;
}

export interface GroupedTabs {
  group: TabGroup | null;
  tabs: Tab[];
}
