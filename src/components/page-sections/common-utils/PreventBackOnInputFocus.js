import { useEffect } from 'react';

/**
 * Hook to prevent browser back navigation when inputs are focused on mobile devices
 * This prevents the frustrating UX issue where users trying to dismiss the keyboard
 * with the back button end up navigating away from the page.
 */
const usePreventBackOnInputFocus = () => {
  useEffect(() => {
    // Add event listeners to all input, textarea and select elements
    const handleFocus = (e) => {
      // When an input gets focus, add a history state to the stack
      // This ensures that pressing back will first clear the focus without navigation
      history.pushState(null, document.title, location.href);
    };

    // Handle back button behavior
    const handlePopState = (e) => {
      // Check if any input element is currently focused
      const focusedElement = document.activeElement;
      const isFocusedInput = 
        focusedElement.tagName === 'INPUT' || 
        focusedElement.tagName === 'TEXTAREA' || 
        focusedElement.tagName === 'SELECT';
      
      if (isFocusedInput) {
        // Blur (unfocus) the input element
        focusedElement.blur();
        
        // Prevent navigation by pushing a new state (replacing the one we just popped)
        history.pushState(null, document.title, location.href);
        
        // Stop event propagation
        e.stopPropagation();
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
