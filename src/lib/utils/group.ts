/**
 * Normalizes Chrome's groupId (-1 means ungrouped) to null for ungrouped tabs.
 */
export function normalizeGroupId(groupId: number | undefined): number | null {
  if (typeof groupId !== 'number') return null;
  return groupId === -1 ? null : groupId;
}

/**
 * Parses a tab key (e.g., "t:123") and returns the tab ID, or null if invalid.
 */
export function parseTabKey(key: string): number | null {
  if (!key.startsWith('t:')) return null;
  const id = Number(key.slice(2));
  return Number.isFinite(id) ? id : null;
}

/**
 * Parses a header key (e.g., "h:10") and returns the group ID, or null if invalid.
 */
export function parseHeaderKey(key: string): number | null {
  if (!key.startsWith('h:')) return null;
  const id = Number(key.slice(2));
  return Number.isFinite(id) ? id : null;
}
