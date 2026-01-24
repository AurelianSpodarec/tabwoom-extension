import { createProxyService, registerService, type ProxyServiceKey } from '@webext-core/proxy-service';
import { browser } from 'wxt/browser';
import type { Tab, TabGroup, TabGroupColor, GroupedTabs } from './types';

class TabManagerService {
  async getAllTabs(): Promise<Tab[]> {
    return browser.tabs.query({});
  }

  async getTabsByWindow(windowId: number): Promise<Tab[]> {
    return browser.tabs.query({ windowId });
  }

  async getCurrentWindowTabs(): Promise<Tab[]> {
    return browser.tabs.query({ currentWindow: true });
  }

  async getActiveTab(): Promise<Tab | undefined> {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  async getTab(tabId: number): Promise<Tab> {
    return browser.tabs.get(tabId);
  }

  async getAllGroups(): Promise<TabGroup[]> {
    return browser.tabGroups.query({});
  }

  async getGroupsByWindow(windowId: number): Promise<TabGroup[]> {
    return browser.tabGroups.query({ windowId });
  }

  async getGroup(groupId: number): Promise<TabGroup> {
    return browser.tabGroups.get(groupId);
  }

  async getTabsGrouped(): Promise<GroupedTabs[]> {
    const [tabs, groups] = await Promise.all([
      this.getCurrentWindowTabs(),
      this.getGroupsByWindow((await browser.windows.getCurrent()).id!),
    ]);

    const groupMap = new Map<number, TabGroup>();
    groups.forEach(g => groupMap.set(g.id, g));

    const grouped = new Map<number | null, Tab[]>();
    
    for (const tab of tabs) {
      const groupId = tab.groupId === -1 ? null : tab.groupId;
      if (!grouped.has(groupId)) {
        grouped.set(groupId, []);
      }
      grouped.get(groupId)!.push(tab);
    }

    const result: GroupedTabs[] = [];
    for (const [groupId, groupTabs] of grouped) {
      result.push({
        group: groupId !== null ? groupMap.get(groupId) ?? null : null,
        tabs: groupTabs.sort((a, b) => a.index - b.index),
      });
    }

    return result;
  }

  async groupTabs(tabIds: number[], options?: { title?: string; color?: TabGroupColor }): Promise<number> {
    if (tabIds.length === 0) return -1;
    const groupId = await browser.tabs.group({ tabIds: tabIds as [number, ...number[]] });
    
    if (options?.title || options?.color) {
      await browser.tabGroups.update(groupId, {
        title: options.title,
        color: options.color,
      });
    }
    
    return groupId;
  }

  async ungroupTabs(tabIds: number[]): Promise<void> {
    if (tabIds.length === 0) return;
    await browser.tabs.ungroup(tabIds as [number, ...number[]]);
  }

  async updateGroup(groupId: number, options: { title?: string; color?: TabGroupColor; collapsed?: boolean }): Promise<TabGroup | undefined> {
    return browser.tabGroups.update(groupId, options);
  }

  async moveTabToGroup(tabId: number, groupId: number): Promise<void> {
    await browser.tabs.group({ tabIds: [tabId], groupId });
  }

  async activateTab(tabId: number): Promise<void> {
    await browser.tabs.update(tabId, { active: true });
    const tab = await browser.tabs.get(tabId);
    if (tab.windowId) {
      await browser.windows.update(tab.windowId, { focused: true });
    }
  }

  async closeTab(tabId: number): Promise<void> {
    await browser.tabs.remove(tabId);
  }

  async closeTabs(tabIds: number[]): Promise<void> {
    await browser.tabs.remove(tabIds);
  }
}

const SERVICE_KEY = 'TabManager' as ProxyServiceKey<TabManagerService>;

export function registerTabManager() {
  return registerService(SERVICE_KEY, new TabManagerService());
}

export function getTabManager() {
  return createProxyService<TabManagerService>(SERVICE_KEY);
}
