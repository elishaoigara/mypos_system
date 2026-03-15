import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Hook for reading weight from a local serial weighing scale agent.
 *
 * The scale agent runs on http://localhost:9101 and returns { weight: number }
 * via GET request. See docs/HARDWARE_GUIDE.md for setup instructions.
 */

const SCALE_AGENT_URL = "http://localhost:9101";

export function useScale(pollIntervalMs = 1000) {
  const [weight, setWeight] = useState<number>(0);
  const [connected, setConnected] = useState(false);
  const [polling, setPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Read weight once from the scale agent */
  const readWeight = useCallback(async (): Promise<number> => {
    try {
      const res = await fetch(SCALE_AGENT_URL, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        const w = parseFloat(data.weight) || 0;
        setWeight(w);
        setConnected(true);
        return w;
      }
      setConnected(false);
      return 0;
    } catch {
      setConnected(false);
      return 0;
    }
  }, []);

  /** Start continuous polling */
  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    setPolling(true);
    intervalRef.current = setInterval(readWeight, pollIntervalMs);
    readWeight(); // immediate first read
  }, [readWeight, pollIntervalMs]);

  /** Stop continuous polling */
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPolling(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { weight, connected, polling, readWeight, startPolling, stopPolling };
}
