export const ROOM_TEMPERATURE_C = 25;
export const MAX_SAFE_TEMPERATURE_C = 80;
export const POWER_SUPPLY_MAX_V = 15;
export const VOLTMETER_MAX_V = 12;
export const MICROAMMETER_MAX_UA = 100;
export const MODEL_BAND_GAP_EV = 1.12;
export const MODEL_REFERENCE_CURRENT_UA = 2;
export const MODEL_REFERENCE_TEMPERATURE_K = 298.15;
export const MODEL_REFERENCE_VOLTAGE_V = 3;
export const PDF_BAND_GAP_FACTOR_EV_PER_K = 3.973e-4;

const BOLTZMANN_CONSTANT_EV_PER_K = 8.617333262e-5;
const HEATER_INPUT_C_PER_S = 0.34;
const HEAT_LOSS_PER_S = 0.0015;
const COOLING_TIME_CONSTANT_S = 540;
const MIN_RECORDING_VOLTAGE_V = 0.5;

export interface Params {
  heaterOn: boolean;
  powerOn: boolean;
  stirringOn: boolean;
  reverseVoltageV: number;
}

export const DEFAULT_PARAMS: Params = {
  heaterOn: false,
  powerOn: false,
  stirringOn: false,
  reverseVoltageV: MODEL_REFERENCE_VOLTAGE_V,
};

export type ThermalPhase = 'ambient' | 'heating' | 'cooling';

export interface State {
  temperatureC: number;
  peakTemperatureC: number;
  temperatureRateCPerS: number;
  thermalPhase: ThermalPhase;
  reverseCurrentUa: number;
  voltmeterReadingV: number;
  heaterSafetyCutoff: boolean;
}

export interface Reading {
  trial: number;
  temperatureC: number;
  temperatureK: number;
  inverseTemperatureScaled: number;
  reverseVoltageV: number;
  reverseCurrentUa: number;
  logCurrentUa: number;
}

export interface EnergyGapResult {
  readingCount: number;
  slopePerScaledInverseKelvin: number | null;
  intercept: number | null;
  bandGapEv: number | null;
  fitStart: { x: number; y: number } | null;
  fitEnd: { x: number; y: number } | null;
}

export function initialState(): State {
  return {
    temperatureC: ROOM_TEMPERATURE_C,
    peakTemperatureC: ROOM_TEMPERATURE_C,
    temperatureRateCPerS: 0,
    thermalPhase: 'ambient',
    reverseCurrentUa: 0,
    voltmeterReadingV: 0,
    heaterSafetyCutoff: false,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function isValidReverseVoltage(voltageV: number): boolean {
  return (
    Number.isFinite(voltageV) &&
    voltageV >= 0 &&
    voltageV <= POWER_SUPPLY_MAX_V
  );
}

export function computeReverseCurrentUa(temperatureC: number, reverseVoltageV: number): number {
  if (
    !Number.isFinite(temperatureC) ||
    temperatureC < -273.15 ||
    !isValidReverseVoltage(reverseVoltageV) ||
    reverseVoltageV <= 0
  ) {
    return 0;
  }

  const temperatureK = temperatureC + 273.15;
  const referenceBiasFactor =
    MODEL_REFERENCE_VOLTAGE_V / (MODEL_REFERENCE_VOLTAGE_V + 0.15);
  const biasFactor = reverseVoltageV / (reverseVoltageV + 0.15);
  const thermalFactor = Math.exp(
    (MODEL_BAND_GAP_EV / (2 * BOLTZMANN_CONSTANT_EV_PER_K)) *
    (1 / MODEL_REFERENCE_TEMPERATURE_K - 1 / temperatureK),
  );
  const currentUa =
    MODEL_REFERENCE_CURRENT_UA * thermalFactor * biasFactor / referenceBiasFactor;

  return Number.isFinite(currentUa)
    ? clamp(currentUa, 0, MICROAMMETER_MAX_UA)
    : MICROAMMETER_MAX_UA;
}

export function tick(params: Params, state: State, deltaSeconds: number): State {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return state;

  const delta = deltaSeconds;
  const temperatureDifference = state.temperatureC - ROOM_TEMPERATURE_C;
  let temperatureC = state.temperatureC;
  let temperatureRateCPerS = 0;
  let heaterSafetyCutoff = false;

  if (params.heaterOn && state.temperatureC >= MAX_SAFE_TEMPERATURE_C) {
    temperatureC = MAX_SAFE_TEMPERATURE_C;
    heaterSafetyCutoff = true;
  } else if (params.heaterOn) {
    const heaterInput = HEATER_INPUT_C_PER_S * (params.stirringOn ? 1.12 : 1);
    const equilibriumC = ROOM_TEMPERATURE_C + heaterInput / HEAT_LOSS_PER_S;
    temperatureC =
      equilibriumC +
      (state.temperatureC - equilibriumC) * Math.exp(-HEAT_LOSS_PER_S * delta);
    temperatureRateCPerS = heaterInput - HEAT_LOSS_PER_S * temperatureDifference;

    if (temperatureC >= MAX_SAFE_TEMPERATURE_C) {
      temperatureC = MAX_SAFE_TEMPERATURE_C;
      temperatureRateCPerS = 0;
      heaterSafetyCutoff = true;
    }
  } else if (temperatureDifference > 0.02) {
    const coolingRate = (params.stirringOn ? 1.2 : 1) / COOLING_TIME_CONSTANT_S;
    temperatureC =
      ROOM_TEMPERATURE_C + temperatureDifference * Math.exp(-coolingRate * delta);
    temperatureRateCPerS = -(temperatureDifference * coolingRate);
  } else {
    temperatureC = ROOM_TEMPERATURE_C;
  }

  temperatureC = clamp(temperatureC, ROOM_TEMPERATURE_C, MAX_SAFE_TEMPERATURE_C);
  const heaterIsActive = params.heaterOn && !heaterSafetyCutoff;
  const thermalPhase: ThermalPhase = heaterIsActive
    ? 'heating'
    : temperatureC > ROOM_TEMPERATURE_C + 0.2
      ? 'cooling'
      : 'ambient';
  const powerIsActive = params.powerOn && !heaterIsActive && !heaterSafetyCutoff;
  const reverseCurrentUa = powerIsActive
    ? computeReverseCurrentUa(temperatureC, params.reverseVoltageV)
    : 0;

  return {
    temperatureC,
    peakTemperatureC: Math.max(state.peakTemperatureC, temperatureC),
    temperatureRateCPerS,
    thermalPhase,
    reverseCurrentUa,
    voltmeterReadingV: powerIsActive ? params.reverseVoltageV : 0,
    heaterSafetyCutoff,
  };
}

export function createReading(
  trial: number,
  params: Params,
  state: State,
): Reading | null {
  const isValid =
    Number.isInteger(trial) &&
    trial > 0 &&
    params.powerOn &&
    !params.heaterOn &&
    isValidReverseVoltage(params.reverseVoltageV) &&
    params.reverseVoltageV >= MIN_RECORDING_VOLTAGE_V &&
    params.reverseVoltageV <= VOLTMETER_MAX_V &&
    state.temperatureC >= ROOM_TEMPERATURE_C &&
    state.temperatureC < MAX_SAFE_TEMPERATURE_C &&
    Number.isFinite(state.reverseCurrentUa) &&
    state.reverseCurrentUa > 0 &&
    state.reverseCurrentUa <= MICROAMMETER_MAX_UA;

  if (!isValid) return null;

  const temperatureK = state.temperatureC + 273.15;
  const logCurrentUa = Math.log10(state.reverseCurrentUa);
  if (!Number.isFinite(temperatureK) || temperatureK <= 0 || !Number.isFinite(logCurrentUa)) {
    return null;
  }

  return {
    trial,
    temperatureC: state.temperatureC,
    temperatureK,
    inverseTemperatureScaled: 1000 / temperatureK,
    reverseVoltageV: params.reverseVoltageV,
    reverseCurrentUa: state.reverseCurrentUa,
    logCurrentUa,
  };
}

export function computeEnergyGap(readings: Reading[]): EnergyGapResult {
  const points = readings
    .filter(
      (reading) =>
        Number.isFinite(reading.inverseTemperatureScaled) &&
        Number.isFinite(reading.logCurrentUa) &&
        reading.reverseCurrentUa > 0,
    )
    .map((reading) => ({
      x: reading.inverseTemperatureScaled,
      y: reading.logCurrentUa,
    }));

  if (points.length < 2) {
    return {
      readingCount: points.length,
      slopePerScaledInverseKelvin: null,
      intercept: null,
      bandGapEv: null,
      fitStart: null,
      fitEnd: null,
    };
  }

  const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const varianceX = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);

  if (varianceX <= 1e-12) {
    return {
      readingCount: points.length,
      slopePerScaledInverseKelvin: null,
      intercept: null,
      bandGapEv: null,
      fitStart: null,
      fitEnd: null,
    };
  }

  const covariance = points.reduce(
    (sum, point) => sum + (point.x - meanX) * (point.y - meanY),
    0,
  );
  const slope = covariance / varianceX;
  const intercept = meanY - slope * meanX;
  const bandGapEv =
    slope < 0
      ? -slope * 1000 * PDF_BAND_GAP_FACTOR_EV_PER_K
      : null;
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));

  return {
    readingCount: points.length,
    slopePerScaledInverseKelvin: slope,
    intercept,
    bandGapEv: Number.isFinite(bandGapEv) ? bandGapEv : null,
    fitStart: { x: minX, y: slope * minX + intercept },
    fitEnd: { x: maxX, y: slope * maxX + intercept },
  };
}
