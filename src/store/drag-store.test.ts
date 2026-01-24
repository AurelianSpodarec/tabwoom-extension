import { describe, expect, it, beforeEach } from 'vitest';
import { useDragStore } from './drag-store';

describe('drag-store', () => {
  beforeEach(() => {
    useDragStore.setState({
      drag: { kind: 'idle' },
      hoveredGroupId: null,
      dropIndicator: null,
    });
  });

  describe('startTabDrag', () => {
    it('sets drag state to dragging-tab with tab info', () => {
      useDragStore.getState().startTabDrag(42, 10);

      const { drag, hoveredGroupId } = useDragStore.getState();
      expect(drag).toEqual({ kind: 'dragging-tab', tabId: 42, sourceGroupId: 10 });
      expect(hoveredGroupId).toBe(10);
    });

    it('sets hoveredGroupId to null when sourceGroupId is null', () => {
      useDragStore.getState().startTabDrag(42, null);

      const { hoveredGroupId } = useDragStore.getState();
      expect(hoveredGroupId).toBeNull();
    });
  });

  describe('startGroupDrag', () => {
    it('sets drag state to dragging-group with group info', () => {
      useDragStore.getState().startGroupDrag(10, [1, 2, 3]);

      const { drag } = useDragStore.getState();
      expect(drag).toEqual({ kind: 'dragging-group', groupId: 10, tabIds: [1, 2, 3] });
    });

    it('clears hoveredGroupId and dropIndicator', () => {
      useDragStore.setState({
        hoveredGroupId: 5,
        dropIndicator: { afterKey: 't:1' },
      });

      useDragStore.getState().startGroupDrag(10, [1, 2, 3]);

      const { hoveredGroupId, dropIndicator } = useDragStore.getState();
      expect(hoveredGroupId).toBeNull();
      expect(dropIndicator).toBeNull();
    });
  });

  describe('endDrag', () => {
    it('resets all drag state to idle', () => {
      useDragStore.setState({
        drag: { kind: 'dragging-tab', tabId: 42, sourceGroupId: 10 },
        hoveredGroupId: 10,
        dropIndicator: { afterKey: 't:1', groupColor: 'blue' },
      });

      useDragStore.getState().endDrag();

      const state = useDragStore.getState();
      expect(state.drag).toEqual({ kind: 'idle' });
      expect(state.hoveredGroupId).toBeNull();
      expect(state.dropIndicator).toBeNull();
    });
  });

  describe('setDropIndicator', () => {
    it('sets drop indicator position', () => {
      useDragStore.getState().setDropIndicator({ afterKey: 't:5', groupColor: 'red' });

      const { dropIndicator } = useDragStore.getState();
      expect(dropIndicator).toEqual({ afterKey: 't:5', groupColor: 'red' });
    });

    it('can set afterKey to null for first position', () => {
      useDragStore.getState().setDropIndicator({ afterKey: null });

      const { dropIndicator } = useDragStore.getState();
      expect(dropIndicator).toEqual({ afterKey: null });
    });

    it('can clear drop indicator with null', () => {
      useDragStore.setState({ dropIndicator: { afterKey: 't:1' } });

      useDragStore.getState().setDropIndicator(null);

      const { dropIndicator } = useDragStore.getState();
      expect(dropIndicator).toBeNull();
    });
  });

  describe('setHoveredGroupId', () => {
    it('updates hovered group id', () => {
      useDragStore.getState().setHoveredGroupId(20);

      const { hoveredGroupId } = useDragStore.getState();
      expect(hoveredGroupId).toBe(20);
    });
  });
});
