/**
 * Optical-fiber numerical-aperture and attenuation observations.
 * Distances are stored in metres; spot diameters are stored in metres.
 */

export const SCREEN_CIRCLE_DIAMETERS_MM = [5, 10, 15, 20, 25] as const;
export type ScreenCircleDiameterMm = (typeof SCREEN_CIRCLE_DIAMETERS_MM)[number];
export type PowerReadingId = 'P01' | 'P02' | 'P03' | 'P04' | 'P05';

export interface NumericalApertureParams {
  screenDistanceM: number;
  spotDiameterM: number;
  targetCircleMm: ScreenCircleDiameterMm;
}

export const DEFAULT_NA_PARAMS: NumericalApertureParams = {
  screenDistanceM: 0.1,
  spotDiameterM: 0.01,
  targetCircleMm: 10,
};

export interface NumericalApertureReading extends NumericalApertureParams {
  trial: number;
  numericalAperture: number;
  acceptanceAngleRad: number;
}

export interface NumericalApertureResult {
  meanNumericalAperture: number;
  meanAcceptanceAngleRad: number;
}

export interface PowerMeterReading {
  id: PowerReadingId;
  meterValueDb: number;
}

export interface AttenuationComparison {
  id: 'oneMetreBending' | 'fiveMetreBending' | 'combinedVsOneMetre' | 'combinedVsFiveMetre';
  label: string;
  formula: string;
  valueDb: number | null;
}

export const POWER_READING_IDS: readonly PowerReadingId[] = ['P01', 'P02', 'P03', 'P04', 'P05'];

export const POWER_READING_DESCRIPTIONS: Record<PowerReadingId, string> = {
  P01: '1 m fiber · straight',
  P02: '1 m fiber · four mandrel turns',
  P03: '5 m fiber · straight',
  P04: '5 m fiber · four mandrel turns',
  P05: 'Combined cables · inline adaptor',
};

export function isValidNumericalApertureParams(
  params: NumericalApertureParams,
): boolean {
  return (
    Number.isFinite(params.screenDistanceM) &&
    params.screenDistanceM > 0 &&
    Number.isFinite(params.spotDiameterM) &&
    params.spotDiameterM > 0 &&
    SCREEN_CIRCLE_DIAMETERS_MM.includes(params.targetCircleMm)
  );
}

export function computeNumericalAperture(
  screenDistanceM: number,
  spotDiameterM: number,
): { numericalAperture: number; acceptanceAngleRad: number } | null {
  if (
    !Number.isFinite(screenDistanceM) ||
    !Number.isFinite(spotDiameterM) ||
    screenDistanceM <= 0 ||
    spotDiameterM <= 0
  ) {
    return null;
  }

  const numericalAperture =
    spotDiameterM / Math.sqrt(4 * screenDistanceM ** 2 + spotDiameterM ** 2);
  if (!Number.isFinite(numericalAperture) || numericalAperture < 0 || numericalAperture > 1) {
    return null;
  }

  const acceptanceAngleRad = Math.asin(numericalAperture);
  return Number.isFinite(acceptanceAngleRad)
    ? { numericalAperture, acceptanceAngleRad }
    : null;
}

export function createNumericalApertureReading(
  trial: number,
  params: NumericalApertureParams,
): NumericalApertureReading | null {
  if (!Number.isInteger(trial) || trial < 1 || !isValidNumericalApertureParams(params)) {
    return null;
  }

  const result = computeNumericalAperture(params.screenDistanceM, params.spotDiameterM);
  return result ? { trial, ...params, ...result } : null;
}

export function computeNumericalApertureResult(
  readings: NumericalApertureReading[],
): NumericalApertureResult {
  const validReadings = readings.filter(
    (reading) =>
      Number.isFinite(reading.numericalAperture) &&
      reading.numericalAperture >= 0 &&
      reading.numericalAperture <= 1 &&
      Number.isFinite(reading.acceptanceAngleRad) &&
      reading.acceptanceAngleRad >= 0 &&
      reading.acceptanceAngleRad <= Math.PI / 2,
  );
  if (validReadings.length === 0) {
    return { meanNumericalAperture: 0, meanAcceptanceAngleRad: 0 };
  }

  return {
    meanNumericalAperture:
      validReadings.reduce((sum, reading) => sum + reading.numericalAperture, 0) /
      validReadings.length,
    meanAcceptanceAngleRad:
      validReadings.reduce((sum, reading) => sum + reading.acceptanceAngleRad, 0) /
      validReadings.length,
  };
}

export function isValidPowerMeterValue(value: number): boolean {
  return Number.isFinite(value) && value >= -120 && value <= 30;
}

export function calculateAttenuationComparisons(
  readings: Partial<Record<PowerReadingId, number>>,
): AttenuationComparison[] {
  const difference = (minuend: PowerReadingId, subtrahend: PowerReadingId) => {
    const first = readings[minuend];
    const second = readings[subtrahend];
    return first !== undefined &&
      second !== undefined &&
      isValidPowerMeterValue(first) &&
      isValidPowerMeterValue(second)
      ? first - second
      : null;
  };

  return [
    {
      id: 'oneMetreBending',
      label: '1 m bending comparison',
      formula: 'P01 − P02',
      valueDb: difference('P01', 'P02'),
    },
    {
      id: 'fiveMetreBending',
      label: '5 m bending comparison',
      formula: 'P03 − P04',
      valueDb: difference('P03', 'P04'),
    },
    {
      id: 'combinedVsOneMetre',
      label: 'Combined setup vs P01',
      formula: 'P05 − P01',
      valueDb: difference('P05', 'P01'),
    },
    {
      id: 'combinedVsFiveMetre',
      label: 'Combined setup vs P03',
      formula: 'P05 − P03',
      valueDb: difference('P05', 'P03'),
    },
  ];
}
