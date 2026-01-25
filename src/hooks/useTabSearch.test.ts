/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTabSearch } from './useTabSearch';
import { useUIStore } from '@/store';

describe('useTabSearch', () => {
  beforeEach(() => {
    useUIStore.setState({ searchQuery: '' });
  });

  it('returns current search query from store', () => {
    useUIStore.setState({ searchQuery: 'test query' });

    const { result } = renderHook(() => useTabSearch());

    expect(result.current.searchQuery).toBe('test query');
  });

  it('setSearchQuery updates the store', () => {
    const { result } = renderHook(() => useTabSearch());

    act(() => {
      result.current.setSearchQuery('new query');
    });

    expect(useUIStore.getState().searchQuery).toBe('new query');
    expect(result.current.searchQuery).toBe('new query');
  });

  it('reflects external store changes', () => {
    const { result } = renderHook(() => useTabSearch());

    expect(result.current.searchQuery).toBe('');

    act(() => {
      useUIStore.setState({ searchQuery: 'external update' });
    });

    expect(result.current.searchQuery).toBe('external update');
  });
});
