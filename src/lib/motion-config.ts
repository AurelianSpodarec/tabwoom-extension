import type { Transition } from 'framer-motion';

/**
 * Shared transition config for consistent drag animations.
 * Uses a custom cubic-bezier for snappy but smooth movement.
 */
export const dragTransition: Transition = {
  duration: 0.2,
  ease: [0.25, 0.1, 0.25, 1],
};

/**
 * Faster transition for drop indicators and quick feedback.
 */
export const quickTransition: Transition = {
  duration: 0.15,
  ease: [0.25, 0.1, 0.25, 1],
};

/**
 * Spring-based transition for layout animations.
 */
export const layoutTransition: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 35,
  mass: 1,
};

/**
 * Style props for dragged items.
 */
export const draggedItemStyle = {
  scale: 1.02,
  opacity: 0.95,
  zIndex: 50,
  boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
};

/**
 * Style props for dragged group headers.
 */
export const draggedGroupStyle = {
  zIndex: 60,
  boxShadow: '0 15px 35px rgba(0,0,0,0.4)',
};
