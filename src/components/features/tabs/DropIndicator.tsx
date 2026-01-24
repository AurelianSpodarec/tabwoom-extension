import { motion, AnimatePresence } from 'framer-motion';
import { quickTransition } from '@/lib/motion-config';

export interface DropIndicatorProps {
  visible: boolean;
  /**
   * If provided, shows the indicator in a group color style.
   */
  groupColor?: string;
}

const colorToTailwind: Record<string, string> = {
  grey: 'bg-neutral-400',
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-400',
  green: 'bg-green-500',
  pink: 'bg-pink-500',
  purple: 'bg-purple-500',
  cyan: 'bg-cyan-400',
  orange: 'bg-orange-500',
};

export function DropIndicator({ visible, groupColor }: DropIndicatorProps) {
  const colorClass = groupColor ? colorToTailwind[groupColor] ?? 'bg-white/60' : 'bg-white/60';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scaleX: 0.8 }}
          animate={{ opacity: 1, scaleX: 1 }}
          exit={{ opacity: 0, scaleX: 0.8 }}
          transition={quickTransition}
          className={`h-0.5 w-full rounded-full ${colorClass}`}
          style={{ transformOrigin: 'left center' }}
        />
      )}
    </AnimatePresence>
  );
}
