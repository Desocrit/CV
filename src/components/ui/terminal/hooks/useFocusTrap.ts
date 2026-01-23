import { useEffect, type RefObject } from 'react';

// Focusable element selector for focus trap
export const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Custom hook to trap focus within a container element
 * Implements WCAG 2.1 AAA focus management for modal dialogs
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLDivElement | null>,
  isActive: boolean,
  initialFocusRef?: RefObject<HTMLInputElement | null>
): void {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;

    // Focus initial element or first focusable
    const setInitialFocus = () => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else {
        const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        firstFocusable?.focus();
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(setInitialFocus, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Guard: no focusable elements found
      if (!firstElement || !lastElement) return;

      // Shift+Tab on first element -> go to last
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
      // Tab on last element -> go to first
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timeoutId);
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, containerRef, initialFocusRef]);
}
