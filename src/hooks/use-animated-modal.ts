import { useState, useCallback } from 'react';

/**
 * Hook to manage modal open/close with exit animations.
 * Returns { isOpen, isClosing, open, close, afterClose }
 * - Use `isOpen` to conditionally render the modal
 * - Use `isClosing` to toggle between enter/exit animation classes
 * - Call `close()` to start the closing animation
 * - Attach `afterClose` to `onAnimationEnd` on the sheet element
 */
export function useAnimatedModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const open = useCallback(() => {
    setIsClosing(false);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsClosing(true);
  }, []);

  const afterClose = useCallback(() => {
    if (isClosing) {
      setIsOpen(false);
      setIsClosing(false);
    }
  }, [isClosing]);

  return { isOpen, isClosing, open, close, afterClose };
}
