/**
 * TEMPLATE: Simulation logic
 *
 * Keep this file free of React imports. It contains only pure functions
 * and types that describe the physics or behaviour of the experiment.
 *
 * The simulation hook (useSimulation) in src/hooks/ will call these
 * functions each frame and pass the results to the UI layer.
 */

export interface TemplateParams {
  // Define the user-controllable parameters here.
  // Example: initialVelocity: number;
}

export interface TemplateState {
  // Define the computed simulation state here.
  // Example: positionX: number; positionY: number;
}

export const DEFAULT_PARAMS: TemplateParams = {
  // Example: initialVelocity: 10,
};

/**
 * Advance the simulation by one time step.
 * @param params  Current user-set parameters
 * @param state   Current simulation state
 * @param delta   Elapsed time since last tick (seconds)
 * @returns       Updated simulation state
 */
export function tick(
  _params: TemplateParams,
  state: TemplateState,
  _delta: number,
): TemplateState {
  // Replace with actual physics calculations.
  return state;
}

/**
 * Return the initial simulation state for given parameters.
 */
export function initialState(_params: TemplateParams): TemplateState {
  return {
    // Example: positionX: 0, positionY: 0,
  };
}
