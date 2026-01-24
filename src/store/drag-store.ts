import { create } from 'zustand';

export type DragState =
  | { kind: 'idle' }
  | { kind: 'dragging-tab'; tabId: number; sourceGroupId: number | null }
  | { kind: 'dragging-group'; groupId: number; tabIds: number[] };

export interface DropIndicatorPosition {
  /** The key of the item the indicator should appear after (or null for before first item). */
  afterKey: string | null;
  /** Optional group color for styling. */
  groupColor?: string;
}

interface DragStore {
  drag: DragState;
  hoveredGroupId: number | null;
  dropIndicator: DropIndicatorPosition | null;

  startTabDrag: (tabId: number, sourceGroupId: number | null) => void;
  startGroupDrag: (groupId: number, tabIds: number[]) => void;
  endDrag: () => void;
  setHoveredGroupId: (groupId: number | null) => void;
  setDropIndicator: (position: DropIndicatorPosition | null) => void;
}

export const useDragStore = create<DragStore>(set => ({
  drag: { kind: 'idle' },
  hoveredGroupId: null,
  dropIndicator: null,

  startTabDrag: (tabId, sourceGroupId) =>
    set({ drag: { kind: 'dragging-tab', tabId, sourceGroupId }, hoveredGroupId: sourceGroupId, dropIndicator: null }),

  startGroupDrag: (groupId, tabIds) =>
    set({ drag: { kind: 'dragging-group', groupId, tabIds }, hoveredGroupId: null, dropIndicator: null }),

  endDrag: () => set({ drag: { kind: 'idle' }, hoveredGroupId: null, dropIndicator: null }),

  setHoveredGroupId: hoveredGroupId => set({ hoveredGroupId }),

  setDropIndicator: dropIndicator => set({ dropIndicator }),
}));
