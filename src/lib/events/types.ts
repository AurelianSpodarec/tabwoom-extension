export const EVENTS = {
  TABS_CHANGED: 'TABS_CHANGED',
  GROUPS_CHANGED: 'GROUPS_CHANGED',
} as const;

export type EventType = (typeof EVENTS)[keyof typeof EVENTS];
