/**
 * Laser wavelength measurement with a diffraction grating.
 *
 * SI units are used in the calculations:
 *   d sin(theta) = n lambda
 *   y = L tan(theta)
 */

export const SCREEN_DISTANCE_M = 1.5;

export interface Params {
  wavelengthNm: number;
  gratingLinesPerMm: number;
  order: number;
}

export const DEFAULT_PARAMS: Params = {
  wavelengthNm: 532,
  gratingLinesPerMm: 300,
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
  wavelengthM: number;
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
  gratingLinesPerMm: number;
  gratingSpacingM: number;
  leftAngleDegrees: number;
  rightAngleDegrees: number;
  meanSinTheta: number;
  experimentalWavelengthNm: number;
  referenceWavelengthNm: number;
}

export interface ExperimentResult {
  meanWavelengthNm: number;
  graphWavelengthNm: number;
  meanReferenceWavelengthNm: number;
  percentError: number;
}

export function spacingFromDensity(gratingLinesPerMm: number): number {
  if (!Number.isFinite(gratingLinesPerMm) || gratingLinesPerMm <= 0) return 0;
  return 1 / (gratingLinesPerMm * 1000);
}

export function getMaximumOrder(wavelengthNm: number, gratingLinesPerMm: number): number {
  const spacingM = spacingFromDensity(gratingLinesPerMm);
  if (!Number.isFinite(wavelengthNm) || wavelengthNm <= 0 || spacingM <= 0) return 0;

  const wavelengthM = wavelengthNm * 1e-9;
  return Math.floor(spacingM / wavelengthM + 1e-12);
}

export function isValidParams(params: Params): boolean {
  return (
    Number.isFinite(params.wavelengthNm) &&
    params.wavelengthNm >= 380 &&
    params.wavelengthNm <= 750 &&
    Number.isFinite(params.gratingLinesPerMm) &&
    params.gratingLinesPerMm >= 100 &&
    params.gratingLinesPerMm <= 1200 &&
    Number.isInteger(params.order) &&
    params.order >= 1 &&
    params.order <= getMaximumOrder(params.wavelengthNm, params.gratingLinesPerMm)
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
  const wavelengthM = params.wavelengthNm * 1e-9;
  const gratingSpacingM = spacingFromDensity(params.gratingLinesPerMm);
  const maximumOrder = getMaximumOrder(params.wavelengthNm, params.gratingLinesPerMm);
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
      positionM: reachesScreen ? SCREEN_DISTANCE_M * Math.tan(angleRadians) : Number.POSITIVE_INFINITY,
      reachesScreen,
    });
  }

  const selected = orders[orders.length - 1];
  return {
    wavelengthM,
    gratingSpacingM,
    maximumOrder,
    selectedOrder: selected ? selected.order : 0,
    selectedAngleRadians: selected ? selected.angleRadians : 0,
    selectedAngleDegrees: selected ? selected.angleDegrees : 0,
    selectedPositionM: selected ? selected.positionM : 0,
    selectedReachesScreen: selected?.reachesScreen ?? false,
    orders,
    laserColor: wavelengthToColor(params.wavelengthNm),
  };
}

export function createReading(
  trial: number,
  params: Params,
  leftAngleDegrees: number,
  rightAngleDegrees: number,
): Reading | null {
  if (
    !isValidParams(params) ||
    !Number.isInteger(trial) ||
    trial < 1 ||
    !Number.isFinite(leftAngleDegrees) ||
    !Number.isFinite(rightAngleDegrees) ||
    leftAngleDegrees <= 0 ||
    leftAngleDegrees >= 90 ||
    rightAngleDegrees <= 0 ||
    rightAngleDegrees >= 90
  ) {
    return null;
  }

  const state = computeState(params);
  if (!state.selectedReachesScreen || state.selectedOrder < 1) return null;

  const meanSinTheta = (
    Math.sin(leftAngleDegrees * Math.PI / 180) +
    Math.sin(rightAngleDegrees * Math.PI / 180)
  ) / 2;
  const experimentalWavelengthNm =
    state.gratingSpacingM * meanSinTheta / state.selectedOrder * 1e9;

  if (!Number.isFinite(experimentalWavelengthNm) || experimentalWavelengthNm <= 0) return null;

  return {
    trial,
    order: state.selectedOrder,
    gratingLinesPerMm: params.gratingLinesPerMm,
    gratingSpacingM: state.gratingSpacingM,
    leftAngleDegrees,
    rightAngleDegrees,
    meanSinTheta,
    experimentalWavelengthNm,
    referenceWavelengthNm: params.wavelengthNm,
  };
}

export function computeResult(readings: Reading[]): ExperimentResult {
  const validReadings = readings.filter((reading) =>
    Number.isFinite(reading.experimentalWavelengthNm) &&
    reading.experimentalWavelengthNm > 0 &&
    Number.isFinite(reading.meanSinTheta) &&
    reading.gratingSpacingM > 0 &&
    reading.order > 0,
  );
  const mean = (values: number[]) =>
    values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

  const meanWavelengthNm = mean(validReadings.map((reading) => reading.experimentalWavelengthNm));
  const meanReferenceWavelengthNm = mean(
    validReadings.map((reading) => reading.referenceWavelengthNm),
  );
  const graphDenominator = validReadings.reduce((sum, reading) => {
    const x = reading.order / reading.gratingSpacingM;
    return sum + x * x;
  }, 0);
  const graphNumerator = validReadings.reduce((sum, reading) => {
    const x = reading.order / reading.gratingSpacingM;
    return sum + x * reading.meanSinTheta;
  }, 0);
  const graphWavelengthNm = graphDenominator > 0
    ? graphNumerator / graphDenominator * 1e9
    : 0;
  const percentError = meanReferenceWavelengthNm > 0 && meanWavelengthNm > 0
    ? Math.abs((meanWavelengthNm - meanReferenceWavelengthNm) / meanReferenceWavelengthNm) * 100
    : 0;

  return {
    meanWavelengthNm,
    graphWavelengthNm,
    meanReferenceWavelengthNm,
    percentError,
  };
}
