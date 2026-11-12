/**
 * Rigidity modulus measurement with a torsional pendulum.
 *
 * SI units are used throughout the physics calculations:
 *   C = πηr⁴ / (2l)
 *   T = 2π√(I/C)
 *   η = 8πIl / (r⁴T²)
 *   I = ½MR² + 2md²
 */

export type MaterialKey = 'steel' | 'aluminium' | 'brass' | 'copper' | 'glass';

export interface Material {
  label: string;
  rigidityModulusPa: number;
}

export const MATERIALS: Record<MaterialKey, Material> = {
  steel: { label: 'Steel', rigidityModulusPa: 79.3e9 },
  aluminium: { label: 'Aluminium', rigidityModulusPa: 26e9 },
  brass: { label: 'Brass', rigidityModulusPa: 37e9 },
  copper: { label: 'Copper', rigidityModulusPa: 44e9 },
  glass: { label: 'Glass', rigidityModulusPa: 30e9 },
};

export interface Params {
  material: MaterialKey;
  l: number; // suspension-wire length (m)
  r: number; // suspension-wire radius (m)
  M: number; // platform mass (kg)
  R: number; // platform radius (m)
  m: number; // mass of each attached mass (kg)
  d: number; // radial position of each attached mass (m)
  theta0: number; // initial angular displacement (rad)
}

export const DEFAULT_PARAMS: Params = {
  material: 'steel',
  l: 0.5,
  r: 0.0005,
  M: 0.5,
  R: 0.1,
  m: 0.15,
  d: 0.06,
  theta0: 0.14,
};

export const MIN_MEASURED_TIME_S = 0.1;
export const MAX_MEASURED_TIME_S = 3600;

export interface State {
  isValid: boolean;
  torsionalConstant: number; // N·m/rad
  platformMomentOfInertia: number; // kg·m²
  momentOfInertia: number; // kg·m²
  theoreticalPeriodS: number; // s; visual/reference value only
  referenceRigidityPa: number;
  materialLabel: string;
}

export interface Reading {
  trial: number;
  d: number; // m
  momentOfInertia: number; // kg·m²
  oscillations: number;
  totalTimeS: number; // measured total duration
  periodS: number; // totalTimeS / oscillations
  periodSquaredS2: number;
  rigidityModulusPa: number; // calculated from the measured period
  referenceRigidityPa: number;
  l: number; // m
  r: number; // m
}

export interface ExperimentResult {
  meanRigidityModulusPa: number;
  meanReferenceRigidityPa: number;
  slopeS2PerKgM2: number;
  rigidityFromSlopePa: number;
  percentError: number;
  canFitGraph: boolean;
}

export function isValidParams(params: Params): boolean {
  const values = [params.l, params.r, params.M, params.R, params.m, params.d, params.theta0];
  return (
    values.every(Number.isFinite) &&
    params.l > 0 &&
    params.r > 0 &&
    params.M > 0 &&
    params.R > 0 &&
    params.m > 0 &&
    params.d > 0 &&
    params.d <= params.R &&
    params.theta0 > 0 &&
    params.theta0 < Math.PI / 2 &&
    Object.prototype.hasOwnProperty.call(MATERIALS, params.material)
  );
}

export function computeMomentOfInertia(
  platformMass: number,
  platformRadius: number,
  attachedMass: number,
  massDistance: number,
): number {
  if (
    ![platformMass, platformRadius, attachedMass, massDistance].every(Number.isFinite) ||
    platformMass <= 0 ||
    platformRadius <= 0 ||
    attachedMass <= 0 ||
    massDistance <= 0
  ) {
    return 0;
  }

  return 0.5 * platformMass * platformRadius ** 2 + 2 * attachedMass * massDistance ** 2;
}

export function computeTorsionalConstant(
  rigidityModulusPa: number,
  wireLength: number,
  wireRadius: number,
): number {
  if (
    ![rigidityModulusPa, wireLength, wireRadius].every(Number.isFinite) ||
    rigidityModulusPa <= 0 ||
    wireLength <= 0 ||
    wireRadius <= 0
  ) {
    return 0;
  }

  const result = Math.PI * rigidityModulusPa * wireRadius ** 4 / (2 * wireLength);
  return Number.isFinite(result) ? result : 0;
}

export function computeTimePeriod(momentOfInertia: number, torsionalConstant: number): number {
  if (
    !Number.isFinite(momentOfInertia) ||
    !Number.isFinite(torsionalConstant) ||
    momentOfInertia <= 0 ||
    torsionalConstant <= 0
  ) {
    return 0;
  }

  const result = 2 * Math.PI * Math.sqrt(momentOfInertia / torsionalConstant);
  return Number.isFinite(result) ? result : 0;
}

export function computeRigidityModulus(
  momentOfInertia: number,
  wireLength: number,
  wireRadius: number,
  measuredPeriodS: number,
): number {
  if (
    ![momentOfInertia, wireLength, wireRadius, measuredPeriodS].every(Number.isFinite) ||
    momentOfInertia <= 0 ||
    wireLength <= 0 ||
    wireRadius <= 0 ||
    measuredPeriodS <= 0
  ) {
    return 0;
  }

  const denominator = wireRadius ** 4 * measuredPeriodS ** 2;
  if (!Number.isFinite(denominator) || denominator <= 0) return 0;

  const result = 8 * Math.PI * momentOfInertia * wireLength / denominator;
  return Number.isFinite(result) ? result : 0;
}

export function computeState(params: Params): State {
  const material = MATERIALS[params.material] ?? MATERIALS.steel;
  const isValid = isValidParams(params);
  const platformMomentOfInertia = isValid ? 0.5 * params.M * params.R ** 2 : 0;
  const momentOfInertia = isValid
    ? computeMomentOfInertia(params.M, params.R, params.m, params.d)
    : 0;
  const torsionalConstant = isValid
    ? computeTorsionalConstant(material.rigidityModulusPa, params.l, params.r)
    : 0;

  return {
    isValid,
    torsionalConstant,
    platformMomentOfInertia,
    momentOfInertia,
    theoreticalPeriodS: computeTimePeriod(momentOfInertia, torsionalConstant),
    referenceRigidityPa: material.rigidityModulusPa,
    materialLabel: material.label,
  };
}

export function isValidMeasuredTime(totalTimeS: number): boolean {
  return (
    Number.isFinite(totalTimeS) &&
    totalTimeS >= MIN_MEASURED_TIME_S &&
    totalTimeS <= MAX_MEASURED_TIME_S
  );
}

export function createReading(
  trial: number,
  params: Params,
  oscillations: number,
  totalTimeS: number,
): Reading | null {
  if (
    !isValidParams(params) ||
    !Number.isInteger(trial) ||
    trial < 1 ||
    !Number.isInteger(oscillations) ||
    oscillations < 1 ||
    oscillations > 1000 ||
    !isValidMeasuredTime(totalTimeS)
  ) {
    return null;
  }

  const state = computeState(params);
  const periodS = totalTimeS / oscillations;
  const rigidityModulusPa = computeRigidityModulus(
    state.momentOfInertia,
    params.l,
    params.r,
    periodS,
  );

  if (!Number.isFinite(rigidityModulusPa) || rigidityModulusPa <= 0) return null;

  return {
    trial,
    d: params.d,
    momentOfInertia: state.momentOfInertia,
    oscillations,
    totalTimeS,
    periodS,
    periodSquaredS2: periodS ** 2,
    rigidityModulusPa,
    referenceRigidityPa: state.referenceRigidityPa,
    l: params.l,
    r: params.r,
  };
}

export function computeResult(readings: Reading[]): ExperimentResult {
  const validReadings = readings.filter(
    (reading) =>
      Number.isFinite(reading.rigidityModulusPa) &&
      reading.rigidityModulusPa > 0 &&
      Number.isFinite(reading.momentOfInertia) &&
      reading.momentOfInertia > 0 &&
      Number.isFinite(reading.periodSquaredS2) &&
      reading.periodSquaredS2 > 0,
  );

  const mean = (values: number[]) =>
    values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

  const meanRigidityModulusPa = mean(validReadings.map((reading) => reading.rigidityModulusPa));
  const meanReferenceRigidityPa = mean(validReadings.map((reading) => reading.referenceRigidityPa));
  const inertiaValues = validReadings.map((reading) => reading.momentOfInertia);
  const inertiaRange = inertiaValues.length > 0
    ? Math.max(...inertiaValues) - Math.min(...inertiaValues)
    : 0;
  const maxInertia = inertiaValues.length > 0 ? Math.max(...inertiaValues) : 0;
  const canFitGraph =
    validReadings.length >= 2 &&
    inertiaRange > Math.max(1e-12, maxInertia * 1e-6);

  let slopeS2PerKgM2 = 0;
  if (canFitGraph) {
    const sumInertiaSquared = validReadings.reduce(
      (sum, reading) => sum + reading.momentOfInertia ** 2,
      0,
    );
    const sumInertiaPeriodSquared = validReadings.reduce(
      (sum, reading) => sum + reading.momentOfInertia * reading.periodSquaredS2,
      0,
    );
    if (sumInertiaSquared > 0) slopeS2PerKgM2 = sumInertiaPeriodSquared / sumInertiaSquared;
  }

  const firstReading = validReadings[0];
  const rigidityFromSlopePa =
    canFitGraph && firstReading && slopeS2PerKgM2 > 0
      ? 8 * Math.PI * firstReading.l / (firstReading.r ** 4 * slopeS2PerKgM2)
      : 0;
  const percentError =
    meanReferenceRigidityPa > 0 && meanRigidityModulusPa > 0
      ? Math.abs((meanRigidityModulusPa - meanReferenceRigidityPa) / meanReferenceRigidityPa) * 100
      : 0;

  return {
    meanRigidityModulusPa,
    meanReferenceRigidityPa,
    slopeS2PerKgM2,
    rigidityFromSlopePa,
    percentError,
    canFitGraph,
  };
}
