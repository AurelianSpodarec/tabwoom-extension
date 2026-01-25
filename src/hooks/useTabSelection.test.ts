/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTabSelection } from './useTabSelection';
import { useUIStore } from '@/store';

describe('useTabSelection', () => {
  beforeEach(() => {
    useUIStore.setState({ selectedTabIds: new Set<number>() });
  });

  it('returns current selection from store', () => {
    useUIStore.setState({ selectedTabIds: new Set([1, 2, 3]) });

    const { result } = renderHook(() => useTabSelection());

    expect(result.current.selectedTabIds).toEqual(new Set([1, 2, 3]));
  });

  it('toggleTabSelection adds tab when not selected (single mode)', () => {
    const { result } = renderHook(() => useTabSelection());

    act(() => {
      result.current.toggleTabSelection(5, false);
    });

    expect(result.current.selectedTabIds).toEqual(new Set([5]));
  });

  it('toggleTabSelection in single mode replaces with toggled tab (even if already selected)', () => {
    useUIStore.setState({ selectedTabIds: new Set([5]) });

    const { result } = renderHook(() => useTabSelection());

    act(() => {
      // In single mode, we always get a fresh set with just the toggled tab
      result.current.toggleTabSelection(5, false);
    });

    // Single mode doesn't toggle off - it selects that single tab
    expect(result.current.selectedTabIds).toEqual(new Set([5]));
  });

  it('toggleTabSelection in multi mode preserves existing selection', () => {
    useUIStore.setState({ selectedTabIds: new Set([1, 2]) });

    const { result } = renderHook(() => useTabSelection());

    act(() => {
      result.current.toggleTabSelection(3, true);
    });

    expect(result.current.selectedTabIds).toEqual(new Set([1, 2, 3]));
  });

  it('toggleTabSelection in single mode replaces selection', () => {
    useUIStore.setState({ selectedTabIds: new Set([1, 2]) });

    const { result } = renderHook(() => useTabSelection());

    act(() => {
      result.current.toggleTabSelection(3, false);
    });

    expect(result.current.selectedTabIds).toEqual(new Set([3]));
  });

  it('clearSelection empties the set', () => {
    useUIStore.setState({ selectedTabIds: new Set([1, 2, 3]) });

    const { result } = renderHook(() => useTabSelection());

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedTabIds).toEqual(new Set());
  });
});
