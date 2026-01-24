import { browser } from 'wxt/browser';
import { debounce } from '../utils/debounce';
import { broadcast } from './broadcaster';
import { EVENTS } from './types';

export function setupTabEventListeners(options?: { debounceMs?: number }) {
  const debounceMs = options?.debounceMs ?? 100;

  // onUpdated fires frequently (loading, title, favicon)
  const notifyTabs = debounce(() => broadcast(EVENTS.TABS_CHANGED), debounceMs);
  const notifyGroups = debounce(() => broadcast(EVENTS.GROUPS_CHANGED), debounceMs);

  // Tab events (debounced)
  browser.tabs.onCreated.addListener(notifyTabs);
  browser.tabs.onRemoved.addListener(notifyTabs);
  browser.tabs.onUpdated.addListener(notifyTabs);
  browser.tabs.onMoved.addListener(notifyTabs);

  // Group events (debounced)
  browser.tabGroups.onCreated.addListener(notifyGroups);
  browser.tabGroups.onRemoved.addListener(notifyGroups);
  browser.tabGroups.onUpdated.addListener(notifyGroups);
}
