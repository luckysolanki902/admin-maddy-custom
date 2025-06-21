import { useEffect, useRef } from 'react';

/**
 * Hook to prevent browser back navigation when inputs are focused on mobile devices
 * This prevents the frustrating UX issue where users trying to dismiss the keyboard
 * with the back button end up navigating away from the page.
 * 
 * FIXED: Now only adds history entry once per session and prevents multiple
 * back button presses from being required.
 */
const usePreventBackOnInputFocus = () => {
  // Use a ref to track if we've already added a history entry in this session
  const historyEntryAdded = useRef(false);
  
  useEffect(() => {
    // Track if we're currently handling a popstate event
    let isHandlingPopState = false;
    
    // Add event listeners to all input, textarea and select elements
    const handleFocus = (e) => {
      // Only add to history if we haven't already done so
      if (!historyEntryAdded.current && isMobileDevice()) {
        // When an input gets focus, add a history state to the stack
        // This ensures that pressing back will first clear the focus without navigation
        history.pushState({inputFocusEntry: true}, document.title, location.href);
        historyEntryAdded.current = true;
      }
    };

    // Simple mobile device detection
    const isMobileDevice = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };

    // Handle back button behavior
    const handlePopState = (e) => {
      // Prevent recursive handling
      if (isHandlingPopState) return;
      
      // Check if any input element is currently focused
      const focusedElement = document.activeElement;
      const isFocusedInput = 
        focusedElement.tagName === 'INPUT' || 
        focusedElement.tagName === 'TEXTAREA' || 
        focusedElement.tagName === 'SELECT';
      
      if (isFocusedInput) {
        isHandlingPopState = true;
        
        // Blur (unfocus) the input element
        focusedElement.blur();
          // Reset the flag so future focus events can add a history entry again
        historyEntryAdded.current = false;
        
        // No need to push state again as this would create the exact issue we're fixing
        
        isHandlingPopState = false;
        
        // Stop default behavior only if truly needed
        if (isMobileDevice()) {
          e.stopPropagation();
        }
      }
    };

    // Add global event listeners
    document.addEventListener('focusin', handleFocus);
    window.addEventListener('popstate', handlePopState);
    
    // Clean up event listeners on component unmount
    return () => {
      document.removeEventListener('focusin', handleFocus);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return null;
};

export default usePreventBackOnInputFocus;
