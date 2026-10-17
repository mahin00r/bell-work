import { useReducedMotion } from 'motion/react';
export { useReducedMotion };
export const snappy = { type: 'spring' as const, stiffness: 420, damping: 34 };
export const gentle = { type: 'spring' as const, stiffness: 260, damping: 30 };
export const fadeRise = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' as const } },
};
export function useEntrance() {
  const reduced = useReducedMotion();
  return {
    initial: { opacity: 0, y: reduced ? 0 : 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reduced ? 0 : 8 },
    transition: { duration: reduced ? 0.08 : 0.2 },
  };
}
