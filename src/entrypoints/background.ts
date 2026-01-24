import { registerTabManager } from '@/services/tabs';

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number) {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
}

const notifyTabsChanged = debounce(() => {
  browser.runtime.sendMessage({ type: 'TABS_CHANGED' }).catch(() => {});
}, 100);

const notifyGroupsChanged = debounce(() => {
  browser.runtime.sendMessage({ type: 'GROUPS_CHANGED' }).catch(() => {});
}, 100);

export default defineBackground(() => {
  registerTabManager();
  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  // Tab events (debounced)
  browser.tabs.onCreated.addListener(notifyTabsChanged);
  browser.tabs.onRemoved.addListener(notifyTabsChanged);
  browser.tabs.onUpdated.addListener(notifyTabsChanged);
  browser.tabs.onMoved.addListener(notifyTabsChanged);

  // Group events (debounced)
  browser.tabGroups.onCreated.addListener(notifyGroupsChanged);
  browser.tabGroups.onRemoved.addListener(notifyGroupsChanged);
  browser.tabGroups.onUpdated.addListener(notifyGroupsChanged);
});
