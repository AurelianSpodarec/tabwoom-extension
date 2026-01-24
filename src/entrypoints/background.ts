import { registerTabManager } from '@/services/tabs';
import { setupTabEventListeners } from '@/lib/events';

export default defineBackground(() => {
  registerTabManager();
  setupTabEventListeners({ debounceMs: 100 });

  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
