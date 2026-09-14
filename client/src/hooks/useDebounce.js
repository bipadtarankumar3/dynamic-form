import { useCallback, useRef } from "react";

//   Custom hook to debounce a function.

export function useDebounce(func, delay) {
  const timerRef = useRef(null); // Store the timer reference

  const debouncedFn = useCallback(
    (...args) => {
      // Cancel any previous timers and set a new one
      if (timerRef.current) clearTimeout(timerRef.current);

      // Set a new timeout and store the timer reference
      timerRef.current = setTimeout(() => {
        func(...args); // Call the original function after the delay
      }, delay);
    },
    [func, delay] // Recreate debounced function only if func or delay changes
  );

  return debouncedFn;
}
