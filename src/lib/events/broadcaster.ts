import { browser } from 'wxt/browser';
import type { EventType } from './types';

export function broadcast(type: EventType) {
  // Ignore errors if there are no listeners (e.g., sidepanel closed)
  browser.runtime.sendMessage({ type }).catch(() => {});
}
