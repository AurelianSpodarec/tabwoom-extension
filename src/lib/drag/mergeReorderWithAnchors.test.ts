import { describe, expect, it } from 'vitest';
import { mergeReorderWithAnchors } from './mergeReorderWithAnchors';

describe('mergeReorderWithAnchors', () => {
  it('returns next reorder values when there are no anchors', () => {
    expect(
      mergeReorderWithAnchors({
        baseOrder: ['a', 'b', 'c'],
        anchoredKeys: new Set(),
        nextReorderValues: ['c', 'a', 'b'],
      }),
    ).toEqual(['c', 'a', 'b']);
  });

  it('keeps anchored keys at their original indices', () => {
    expect(
      mergeReorderWithAnchors({
        baseOrder: ['a', 'x', 'b', 'y', 'c'],
        anchoredKeys: new Set(['x', 'y']),
        nextReorderValues: ['b', 'a', 'c'],
      }),
    ).toEqual(['b', 'x', 'a', 'y', 'c']);
  });

  it('falls back to baseOrder when nextReorderValues length mismatches', () => {
    expect(
      mergeReorderWithAnchors({
        baseOrder: ['a', 'x', 'b'],
        anchoredKeys: new Set(['x']),
        nextReorderValues: ['b', 'a', 'extra'],
      }),
    ).toEqual(['a', 'x', 'b']);
  });
});
