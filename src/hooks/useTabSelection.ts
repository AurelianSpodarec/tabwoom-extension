import { useUIStore } from '@/store';

export function useTabSelection() {
  const selectedTabIds = useUIStore(s => s.selectedTabIds);
  const toggleTabSelection = useUIStore(s => s.toggleTabSelection);
  const clearSelection = useUIStore(s => s.clearSelection);

  return { selectedTabIds, toggleTabSelection, clearSelection };
}
