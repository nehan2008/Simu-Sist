/**
 * TEMPLATE: Experiment page
 *
 * Wires together controls, canvas, simulation loop, and measurement
 * display. Copy this folder to src/experiments/<id>/ and replace
 * the template logic with your experiment's implementation.
 *
 * Steps:
 *   1. Define params and state in simulation.ts
 *   2. Build the tick() function in simulation.ts
 *   3. Add controls in controls.tsx
 *   4. Draw the visualization in canvas.tsx
 *   5. Register the experiment in src/registry/experiments.ts
 */

import { useState, useCallback } from 'react';
import { useSimulation } from '../../hooks';
import SimulationControls from '../../components/ui/SimulationControls';
import Controls from './controls';
import ExperimentCanvas from './canvas';
import { DEFAULT_PARAMS, initialState, tick } from './simulation';
import type { TemplateParams } from './simulation';

export default function TemplateExperiment() {
  const [params, setParams] = useState<TemplateParams>(DEFAULT_PARAMS);
  const [simState, setSimState] = useState(initialState(params));

  const handleTick = useCallback(
    (_elapsed: number, delta: number) => {
      const next = tick(params, simState, delta);
      setSimState(next);
      // Return measurements to be recorded as DataPoints
      return {} as Record<string, number>;
    },
    [params, simState],
  );

  const { state, start, pause, reset } = useSimulation({ onTick: handleTick });

  const handleParamChange = (updated: Partial<TemplateParams>) => {
    if (state.isRunning) return; // lock params while running
    setParams((prev) => ({ ...prev, ...updated }));
    setSimState(initialState({ ...params, ...updated }));
  };

  return (
    <div className="experiment-layout">
      <div className="experiment-canvas-area">
        <ExperimentCanvas state={simState} />
      </div>

      <aside className="experiment-sidebar">
        <Controls
          params={params}
          disabled={state.isRunning}
          onChange={handleParamChange}
        />

        <SimulationControls
          isRunning={state.isRunning}
          onStart={start}
          onPause={pause}
          onReset={reset}
        />

        <div className="measurements-panel">
          <h3>Measurements</h3>
          <p className="text-muted">
            Values recorded during the simulation will appear here.
          </p>
        </div>
      </aside>
    </div>
  );
}
