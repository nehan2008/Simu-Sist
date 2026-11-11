import { useState, useRef, useCallback, useEffect } from 'react';
import type { SimulationState, DataPoint } from '../types';

export interface UseSimulationOptions {
  /** Called each tick with elapsed seconds and delta seconds. Return updated measurements. */
  onTick: (elapsed: number, delta: number) => Record<string, number>;
  /** Target updates per second (default: 60) */
  fps?: number;
}

export interface UseSimulationReturn {
  state: SimulationState;
  data: DataPoint[];
  start: () => void;
  pause: () => void;
  reset: () => void;
}

/**
 * Generic simulation loop hook.
 * Drives a requestAnimationFrame loop, calls onTick each frame,
 * accumulates DataPoints, and exposes start/pause/reset controls.
 *
 * Physics and measurement logic stays in onTick — this hook only
 * manages timing and state.
 */
export function useSimulation({
  onTick,
  fps = 60,
}: UseSimulationOptions): UseSimulationReturn {
  const [state, setState] = useState<SimulationState>({
    isRunning: false,
    elapsedTime: 0,
    measurements: {},
  });
  const [data, setData] = useState<DataPoint[]>([]);

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const minDelta = 1000 / fps;

  const tick = useCallback(
    (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }

      const rawDelta = timestamp - lastTimeRef.current;

      if (rawDelta >= minDelta) {
        const delta = rawDelta / 1000; // convert to seconds
        elapsedRef.current += delta;
        lastTimeRef.current = timestamp;

        const measurements = onTick(elapsedRef.current, delta);

        const point: DataPoint = { time: elapsedRef.current, ...measurements };

        setState({ isRunning: true, elapsedTime: elapsedRef.current, measurements });
        setData((prev) => [...prev, point]);
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [onTick, minDelta],
  );

  const start = useCallback(() => {
    if (rafRef.current !== null) return;
    lastTimeRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
    setState((prev) => ({ ...prev, isRunning: true }));
  }, [tick]);

  const pause = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setState((prev) => ({ ...prev, isRunning: false }));
  }, []);

  const reset = useCallback(() => {
    pause();
    elapsedRef.current = 0;
    lastTimeRef.current = null;
    setState({ isRunning: false, elapsedTime: 0, measurements: {} });
    setData([]);
  }, [pause]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { state, data, start, pause, reset };
}
