import { useState, useEffect, useRef, useCallback } from 'react';
import LZString from 'lz-string';

/**
 * useToolState - A hook for managing persistent tool state.
 * Optimized by Bolt:
 * - Moved expensive LZString compression out of the render/effect loop.
 * - Compression only happens on-demand when "Share" is clicked.
 * - Added debounced localStorage sync to reduce I/O during rapid typing.
 */
export function useToolState<T>(toolId: string, initialState: T): [T, (state: T | ((val: T) => T)) => void, string, () => void] {
  const [state, setState] = useState<T>(() => {
    // 0. Check for injected example state
    if ((window as any).__CYBER_EXAMPLE_STATE) {
       const override = (window as any).__CYBER_EXAMPLE_STATE;
       delete (window as any).__CYBER_EXAMPLE_STATE;
       return override as T;
    }
    // 1. Check URL hash
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(hash);
        if (decompressed) {
          return JSON.parse(decompressed) as T;
        }
      } catch (e) {
        console.warn('Failed to parse URL hash', e);
      }
    }
    // 2. Check localStorage
    const local = localStorage.getItem(`cyberscryb_tool_${toolId}`);
    if (local) {
      try {
        return JSON.parse(local) as T;
      } catch (e) {
        console.warn('Failed to parse localStorage', e);
      }
    }
    return initialState;
  });

  // Keep a ref to the latest state for the on-demand share link generation
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    // Sync state changes to localStorage
    // Optimization: Using a timeout to debounce localStorage writes during rapid typing
    const timeoutId = setTimeout(() => {
      localStorage.setItem(`cyberscryb_tool_${toolId}`, JSON.stringify(state));
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [state, toolId]);

  const copyShareLink = useCallback(async () => {
    // Optimization: Calculate the compressed URL only when explicitly requested
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(stateRef.current));
    const url = new URL(window.location.href);
    url.hash = compressed;
    const finalUrl = url.toString();
    
    await navigator.clipboard.writeText(finalUrl);
  }, []);

  // shareUrl is now always an empty string as it's no longer used by the UI components directly.
  // They call copyShareLink which handles the generation and copying internally.
  return [state, setState, '', copyShareLink];
}
