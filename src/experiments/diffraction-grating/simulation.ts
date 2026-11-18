/**
 * Laser wavelength measurement with a diffraction grating.
 *
 * The simulated laser wavelength only drives the apparatus. Experimental
 * wavelengths are calculated exclusively from recorded x, d, n, and N values.
 */

const SIMULATION_WAVELENGTH_NM = 532;
export const MIN_SCREEN_DISTANCE_M = 0.5;
export const MAX_SCREEN_DISTANCE_M = 3;
export const MIN_GRATING_LINES_PER_M = 100_000;
export const MAX_GRATING_LINES_PER_M = 1_200_000;

export interface Params {
  gratingLinesPerM: number;
  screenDistanceM: number;
  order: number;
}

export const DEFAULT_PARAMS: Params = {
  gratingLinesPerM: 300_000,
  screenDistanceM: 1.5,
  order: 1,
};

export interface DiffractionOrder {
  order: number;
  ratio: number;
  angleRadians: number;
  angleDegrees: number;
  positionM: number;
  reachesScreen: boolean;
}

export interface State {
  gratingSpacingM: number;
  maximumOrder: number;
  selectedOrder: number;
  selectedAngleRadians: number;
  selectedAngleDegrees: number;
  selectedPositionM: number;
  selectedReachesScreen: boolean;
  orders: DiffractionOrder[];
  laserColor: string;
}

export interface Reading {
  trial: number;
  order: number;
  screenDistanceM: number;
  gratingLinesPerM: number;
  leftXM: number;
  rightXM: number;
  meanXM: number;
  angleRadians: number;
  angleDegrees: number;
  sinTheta: number;
  experimentalWavelengthM: number;
}

export interface ExperimentResult {
  meanWavelengthM: number;
  graphWavelengthM: number;
}

export function spacingFromDensity(gratingLinesPerM: number): number {
  if (!Number.isFinite(gratingLinesPerM) || gratingLinesPerM <= 0) return 0;
  return 1 / gratingLinesPerM;
}

export function getMaximumOrder(gratingLinesPerM: number): number {
  const spacingM = spacingFromDensity(gratingLinesPerM);
  if (spacingM <= 0) return 0;

  const wavelengthM = SIMULATION_WAVELENGTH_NM * 1e-9;
  return Math.floor(spacingM / wavelengthM + 1e-12);
}

export function isValidParams(params: Params): boolean {
  return (
    Number.isFinite(params.gratingLinesPerM) &&
    params.gratingLinesPerM >= MIN_GRATING_LINES_PER_M &&
    params.gratingLinesPerM <= MAX_GRATING_LINES_PER_M &&
    Number.isFinite(params.screenDistanceM) &&
    params.screenDistanceM >= MIN_SCREEN_DISTANCE_M &&
    params.screenDistanceM <= MAX_SCREEN_DISTANCE_M &&
    Number.isInteger(params.order) &&
    params.order >= 1 &&
    params.order <= getMaximumOrder(params.gratingLinesPerM)
  );
}

export function wavelengthToColor(wavelengthNm: number): string {
  const stops = [
    { wavelength: 380, color: [139, 92, 246] },
    { wavelength: 450, color: [59, 130, 246] },
    { wavelength: 490, color: [34, 211, 238] },
    { wavelength: 530, color: [52, 211, 153] },
    { wavelength: 580, color: [250, 204, 21] },
    { wavelength: 620, color: [251, 146, 60] },
    { wavelength: 750, color: [239, 68, 68] },
  ];
  const wavelength = Math.max(380, Math.min(750, wavelengthNm));
  const upperIndex = stops.findIndex((stop) => stop.wavelength >= wavelength);
  const lower = stops[Math.max(0, upperIndex - 1)];
  const upper = stops[Math.max(0, upperIndex)];
  const fraction = upper.wavelength === lower.wavelength
    ? 0
    : (wavelength - lower.wavelength) / (upper.wavelength - lower.wavelength);
  const rgb = lower.color.map((channel, index) =>
    Math.round(channel + (upper.color[index] - channel) * fraction),
  );
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

export function computeState(params: Params): State {
  const wavelengthM = SIMULATION_WAVELENGTH_NM * 1e-9;
  const gratingSpacingM = spacingFromDensity(params.gratingLinesPerM);
  const maximumOrder = getMaximumOrder(params.gratingLinesPerM);
  const selectedOrder = Math.max(0, Math.min(Math.round(params.order), maximumOrder));

  const orders: DiffractionOrder[] = [];
  for (let order = 1; order <= selectedOrder; order += 1) {
    const ratio = order * wavelengthM / gratingSpacingM;
    if (ratio > 1 + 1e-12) continue;

    const boundedRatio = Math.min(1, ratio);
    const angleRadians = Math.asin(boundedRatio);
    const reachesScreen = boundedRatio < 1 - 1e-12;
    orders.push({
      order,
      ratio: boundedRatio,
      angleRadians,
      angleDegrees: angleRadians * 180 / Math.PI,
      positionM: reachesScreen ? params.screenDistanceM * Math.tan(angleRadians) : Number.POSITIVE_INFINITY,
      reachesScreen,
    });
  }

  const selected = orders[orders.length - 1];
  return {
    gratingSpacingM,
    maximumOrder,
    selectedOrder: selected ? selected.order : 0,
    selectedAngleRadians: selected ? selected.angleRadians : 0,
    selectedAngleDegrees: selected ? selected.angleDegrees : 0,
    selectedPositionM: selected ? selected.positionM : 0,
    selectedReachesScreen: selected?.reachesScreen ?? false,
    orders,
    laserColor: wavelengthToColor(SIMULATION_WAVELENGTH_NM),
  };
}

export function createReading(
  trial: number,
  params: Params,
  leftXM: number,
  rightXM: number,
): Reading | null {
  if (
    !isValidParams(params) ||
    !Number.isInteger(trial) ||
    trial < 1 ||
    !Number.isFinite(leftXM) ||
    !Number.isFinite(rightXM) ||
    leftXM <= 0 ||
    rightXM <= 0
  ) {
    return null;
  }

  const state = computeState(params);
  if (!state.selectedReachesScreen || state.selectedOrder < 1) return null;

  const meanXM = (leftXM + rightXM) / 2;
  const angleRadians = Math.atan(meanXM / params.screenDistanceM);
  const sinTheta = Math.sin(angleRadians);
  const experimentalWavelengthM = sinTheta / (state.selectedOrder * params.gratingLinesPerM);

  if (!Number.isFinite(experimentalWavelengthM) || experimentalWavelengthM <= 0) return null;

  return {
    trial,
    order: state.selectedOrder,
    screenDistanceM: params.screenDistanceM,
    gratingLinesPerM: params.gratingLinesPerM,
    leftXM,
    rightXM,
    meanXM,
    angleRadians,
    angleDegrees: angleRadians * 180 / Math.PI,
    sinTheta,
    experimentalWavelengthM,
  };
}

export function meanWavelengthM(readings: Reading[]): number {
  return readings.length > 0
    ? readings.reduce((sum, reading) => sum + reading.experimentalWavelengthM, 0) / readings.length
    : 0;
}

export function computeResult(readings: Reading[]): ExperimentResult {
  const validReadings = readings.filter((reading) =>
    Number.isFinite(reading.experimentalWavelengthM) &&
    reading.experimentalWavelengthM > 0 &&
    Number.isFinite(reading.sinTheta) &&
    reading.gratingLinesPerM > 0 &&
    reading.order > 0,
  );
  const graphDenominator = validReadings.reduce((sum, reading) => {
    const x = reading.order * reading.gratingLinesPerM;
    return sum + x * x;
  }, 0);
  const graphNumerator = validReadings.reduce((sum, reading) => {
    const x = reading.order * reading.gratingLinesPerM;
    return sum + x * reading.sinTheta;
  }, 0);

  return {
    meanWavelengthM: meanWavelengthM(validReadings),
    graphWavelengthM: graphDenominator > 0 ? graphNumerator / graphDenominator : 0,
  };
}
