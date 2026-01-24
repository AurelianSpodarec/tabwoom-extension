import { Input } from '@/components/ui/Input';
import { useTabSearch } from '@/hooks/useTabSearch';

export function TabSearchBar() {
  const { searchQuery, setSearchQuery } = useTabSearch();

  return (
    <div className="mb-3">
      <Input
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder="Search tabs..."
      />
    </div>
  );
}
