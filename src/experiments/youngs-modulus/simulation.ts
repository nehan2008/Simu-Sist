/**
 * Young's Modulus by Non-Uniform Bending — Physics Engine
 *
 * Formula: E = (W × l³) / (4 × b × d³ × y)
 *
 * Where:
 *   W = mg          — load at centre (N)
 *   l = distance between knife-edge supports (m)
 *   b = beam breadth (m)
 *   d = beam thickness (m)
 *   y = central depression (m)
 *   E = Young's modulus (Pa)
 *
 * Theoretical depression (from known E_ref):
 *   y = (W × l³) / (4 × b × d³ × E_ref)
 *
 * Assumptions:
 *   - Beam is homogeneous and isotropic
 *   - Small deflection (Euler-Bernoulli beam theory)
 *   - Load applied at mid-span only
 *   - Self-weight of beam is neglected
 *   - Knife edges are ideal (frictionless, point contacts)
 */

export const GRAVITY = 9.81; // m/s²

export type MaterialKey = 'steel' | 'aluminium' | 'brass' | 'copper' | 'glass';

export interface Material {
  label: string;
  E_ref: number; // Pa
}

export const MATERIALS: Record<MaterialKey, Material> = {
  steel:     { label: 'Steel',     E_ref: 200e9 },
  aluminium: { label: 'Aluminium', E_ref: 70e9  },
  brass:     { label: 'Brass',     E_ref: 100e9 },
  copper:    { label: 'Copper',    E_ref: 120e9 },
  glass:     { label: 'Glass',     E_ref: 70e9  },
};

export interface Params {
  mass: number;        // kg  (0.05 – 1.0)
  l: number;           // m   (0.40 – 1.00) — distance between knife edges
  b: number;           // m   (0.010 – 0.050) — beam breadth
  d: number;           // m   (0.001 – 0.010) — beam thickness
  material: MaterialKey;
}

export const DEFAULT_PARAMS: Params = {
  mass: 0.3,
  l: 0.70,
  b: 0.025,
  d: 0.004,
  material: 'steel',
};

export interface State {
  W: number;           // N — applied load
  yTheoretical: number;// m — theoretical central depression
  E_ref: number;       // Pa — reference Young's modulus for selected material
  materialLabel: string;
}

export interface Reading {
  no: number;
  source: 'Microscope' | 'Manual';
  material: MaterialKey;
  mass: number;        // kg
  W: number;           // N
  l: number;            // m
  b: number;            // m
  d: number;            // m
  zeroReading: number; // mm
  microscopeReading: number; // mm
  y: number;           // m — |reading - zero| / 1000
  E_calculated: number;// Pa
  E_ref: number;       // Pa — reference value for this observation's material
}

export interface ExperimentResult {
  readings: Reading[];
  meanE: number;       // Pa
  percentError: number;// %
  E_ref: number;       // Pa
}

/**
 * Compute load in Newtons.
 */
export function computeLoad(mass: number): number {
  return mass * GRAVITY;
}

/**
 * Compute Young's modulus from measured depression.
 * Returns 0 if y ≤ 0 (prevents division by zero).
 */
export function computeE(
  W: number,
  l: number,
  b: number,
  d: number,
  y: number,
): number {
  if (y <= 0 || b <= 0 || d <= 0 || l <= 0) return 0;
  return (W * Math.pow(l, 3)) / (4 * b * Math.pow(d, 3) * y);
}

/**
 * Compute theoretical central depression from reference E.
 * Returns 0 for invalid inputs.
 */
export function computeTheoreticalY(
  W: number,
  l: number,
  b: number,
  d: number,
  E_ref: number,
): number {
  if (E_ref <= 0 || b <= 0 || d <= 0 || l <= 0) return 0;
  return (W * Math.pow(l, 3)) / (4 * b * Math.pow(d, 3) * E_ref);
}

/**
 * Derive all display-ready computed values from current params.
 */
export function computeState(params: Params): State {
  const mat = MATERIALS[params.material];
  const W = computeLoad(params.mass);
  const yTheoretical = computeTheoreticalY(W, params.l, params.b, params.d, mat.E_ref);
  return {
    W,
    yTheoretical,
    E_ref: mat.E_ref,
    materialLabel: mat.label,
  };
}

/**
 * Compute final experiment result from a set of readings.
 */
export function computeResult(readings: Reading[], E_ref: number): ExperimentResult {
  const valid = readings.filter((r) => r.E_calculated > 0);
  const meanE = valid.length > 0
    ? valid.reduce((sum, r) => sum + r.E_calculated, 0) / valid.length
    : 0;
  const meanObservationReferenceE = valid.length > 0
    ? valid.reduce((sum, r) => sum + r.E_ref, 0) / valid.length
    : E_ref;
  const referenceE = readings.some((r) => r.source === 'Manual')
    ? meanObservationReferenceE
    : E_ref;
  const percentError = referenceE > 0 && meanE > 0
    ? Math.abs((meanE - referenceE) / referenceE) * 100
    : 0;
  return { readings, meanE, percentError, E_ref: referenceE };
}
