import { useUIStore } from '@/store';

export function useTabSearch() {
  const searchQuery = useUIStore(s => s.searchQuery);
  const setSearchQuery = useUIStore(s => s.setSearchQuery);

  return { searchQuery, setSearchQuery };
}
