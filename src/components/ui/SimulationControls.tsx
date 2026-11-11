/**
 * SimulationControls — Start / Pause / Reset buttons
 * Used by every experiment to drive the simulation loop.
 */

interface SimulationControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

export default function SimulationControls({
  isRunning,
  onStart,
  onPause,
  onReset,
}: SimulationControlsProps) {
  return (
    <div className="sim-controls">
      <button
        type="button"
        className="btn btn-primary"
        onClick={isRunning ? onPause : onStart}
        aria-label={isRunning ? 'Pause simulation' : 'Start simulation'}
      >
        {isRunning ? '⏸ Pause' : '▶ Start'}
      </button>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={onReset}
        aria-label="Reset simulation"
      >
        ↺ Reset
      </button>
    </div>
  );
}
