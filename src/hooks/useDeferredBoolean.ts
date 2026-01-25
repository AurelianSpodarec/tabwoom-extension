import { useState, useEffect } from 'react';

/**
 * Defers a boolean going true by `delay` ms to avoid UI flashes for quick operations.
 * Returns false immediately when value becomes false (no trailing delay).
 */
export function useDeferredBoolean(value: boolean, delay = 500): boolean {
  const [deferred, setDeferred] = useState(false);

  useEffect(() => {
    if (!value) {
      setDeferred(false);
      return;
    }

    const timer = setTimeout(() => setDeferred(true), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return deferred;
}
