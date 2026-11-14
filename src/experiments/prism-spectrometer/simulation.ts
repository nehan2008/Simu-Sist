/**
 * Prism minimum-deviation experiment.
 *
 * Ray directions are traced through an equilateral prism using Snell's law.
 * Angles are stored in radians, vernier readings in arcminutes, and speed in m/s.
 */

export const PRISM_ANGLE_RAD = Math.PI / 3;
export const GLASS_MODEL_REFRACTIVE_INDEX = 1.52;
export const SPEED_OF_LIGHT_M_S = 3e8;
export const VERNIER_DIVISIONS = 30;
export const LEAST_COUNT_ARCMIN = 1;
export const MAIN_SCALE_DIVISION_ARCMIN = 30;
export const FULL_CIRCLE_ARCMIN = 360 * 60;
export const PRISM_ROTATION_MIN_RAD = 30 * Math.PI / 180;
export const PRISM_ROTATION_MAX_RAD = 58 * Math.PI / 180;

const PRISM_VERTICES: Point[] = [
  { x: 1, y: 0 },
  { x: -0.5, y: Math.sqrt(3) / 2 },
  { x: -0.5, y: -Math.sqrt(3) / 2 },
];

export interface Point {
  x: number;
  y: number;
}

export interface Params {
  prismRotationRad: number;
  telescopeRotationRad: number;
  slitWidthM: number;
  prismInserted: boolean;
}

export const DEFAULT_PARAMS: Params = {
  prismRotationRad: 36 * Math.PI / 180,
  telescopeRotationRad: 0,
  slitWidthM: 0.0007,
  prismInserted: false,
};

export interface RayTrace {
  valid: boolean;
  totalInternalReflection: boolean;
  entryPoint: Point | null;
  exitPoint: Point | null;
  internalDirection: Point | null;
  outgoingDirection: Point;
  outgoingAngleRad: number;
  deviationRad: number;
}

export interface TurningPoint {
  rotationRad: number;
  deviationRad: number;
}

export interface State {
  ray: RayTrace;
  deviationRad: number;
  outgoingAngleRad: number;
  imageOffsetRad: number;
  atTurningPoint: boolean;
  telescopeAligned: boolean;
  turningPoint: TurningPoint | null;
}

export interface VernierReading {
  mainScaleDegrees: number;
  mainScaleMinutes: 0 | 30;
  vernierCoincidence: number;
}

export interface TrialReadings {
  directA: VernierReading;
  directB: VernierReading;
  minimumA: VernierReading;
  minimumB: VernierReading;
}

export interface PrismTrial extends TrialReadings {
  trial: number;
  prismRotationRad: number | null;
  deviationAArcMinutes: number;
  deviationBArcMinutes: number;
  meanDeviationArcMinutes: number;
  refractiveIndex: number;
  speedMPerS: number;
}

export interface ExperimentResult {
  trialCount: number;
  meanDeviationArcMinutes: number;
  refractiveIndex: number;
  speedMPerS: number;
}

export function degreesToRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

export function radiansToDegrees(radians: number): number {
  return radians * 180 / Math.PI;
}

export function wrapRadians(radians: number): number {
  return ((radians + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
}

function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}

function subtract(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

function cross(a: Point, b: Point): number {
  return a.x * b.y - a.y * b.x;
}

function normalize(vector: Point): Point {
  const magnitude = Math.hypot(vector.x, vector.y);
  return magnitude > 0 ? { x: vector.x / magnitude, y: vector.y / magnitude } : { x: 0, y: 0 };
}

/** Equilateral-prism vertices in Cartesian coordinates, rotated about its centre. */
export function getPrismVertices(rotationRad: number): Point[] {
  const cosine = Math.cos(rotationRad);
  const sine = Math.sin(rotationRad);
  return PRISM_VERTICES.map(({ x, y }) => ({
    x: x * cosine - y * sine,
    y: x * sine + y * cosine,
  }));
}

function nearestRayIntersection(
  origin: Point,
  direction: Point,
  vertices: Point[],
): { distance: number; edgeStart: Point; edgeEnd: Point } | null {
  const intersections: Array<{ distance: number; edgeStart: Point; edgeEnd: Point }> = [];

  for (let index = 0; index < vertices.length; index += 1) {
    const edgeStart = vertices[index];
    const edgeEnd = vertices[(index + 1) % vertices.length];
    if (!edgeStart || !edgeEnd) continue;

    const edge = subtract(edgeEnd, edgeStart);
    const denominator = cross(direction, edge);
    if (Math.abs(denominator) < 1e-12) continue;

    const offset = subtract(edgeStart, origin);
    const distance = cross(offset, edge) / denominator;
    const segmentPosition = cross(offset, direction) / denominator;
    if (distance > 1e-8 && segmentPosition >= -1e-8 && segmentPosition <= 1 + 1e-8) {
      intersections.push({ distance, edgeStart, edgeEnd });
    }
  }

  intersections.sort((a, b) => a.distance - b.distance);
  return intersections[0] ?? null;
}

function refract(
  incident: Point,
  edgeStart: Point,
  edgeEnd: Point,
  incidentIndex: number,
  transmittedIndex: number,
): Point | null {
  const edge = subtract(edgeEnd, edgeStart);
  let normal = normalize({ x: edge.y, y: -edge.x });
  if (dot(incident, normal) > 0) normal = { x: -normal.x, y: -normal.y };

  const cosineIncident = Math.max(0, -dot(incident, normal));
  const ratio = incidentIndex / transmittedIndex;
  const discriminant = 1 - ratio ** 2 * (1 - cosineIncident ** 2);
  if (discriminant < -1e-10) return null;

  const transmitted = {
    x: ratio * incident.x + (ratio * cosineIncident - Math.sqrt(Math.max(0, discriminant))) * normal.x,
    y: ratio * incident.y + (ratio * cosineIncident - Math.sqrt(Math.max(0, discriminant))) * normal.y,
  };
  return normalize(transmitted);
}

function invalidRay(totalInternalReflection = false): RayTrace {
  return {
    valid: false,
    totalInternalReflection,
    entryPoint: null,
    exitPoint: null,
    internalDirection: null,
    outgoingDirection: { x: 1, y: 0 },
    outgoingAngleRad: 0,
    deviationRad: 0,
  };
}

/** Trace a horizontal incident ray through the rotated triangular glass prism. */
export function tracePrismRay(
  rotationRad: number,
  refractiveIndex = GLASS_MODEL_REFRACTIVE_INDEX,
): RayTrace {
  if (
    !Number.isFinite(rotationRad) ||
    !Number.isFinite(refractiveIndex) ||
    refractiveIndex <= 1
  ) {
    return invalidRay();
  }

  const vertices = getPrismVertices(rotationRad);
  const initialOrigin = { x: -2, y: 0 };
  const incidentDirection = { x: 1, y: 0 };
  const entry = nearestRayIntersection(initialOrigin, incidentDirection, vertices);
  if (!entry) return invalidRay();

  const entryPoint = {
    x: initialOrigin.x + incidentDirection.x * entry.distance,
    y: initialOrigin.y + incidentDirection.y * entry.distance,
  };
  const internalDirection = refract(
    incidentDirection,
    entry.edgeStart,
    entry.edgeEnd,
    1,
    refractiveIndex,
  );
  if (!internalDirection) return invalidRay(true);

  const internalOrigin = {
    x: entryPoint.x + internalDirection.x * 1e-7,
    y: entryPoint.y + internalDirection.y * 1e-7,
  };
  const exit = nearestRayIntersection(internalOrigin, internalDirection, vertices);
  if (!exit) return invalidRay();

  const exitPoint = {
    x: internalOrigin.x + internalDirection.x * exit.distance,
    y: internalOrigin.y + internalDirection.y * exit.distance,
  };
  const outgoingDirection = refract(
    internalDirection,
    exit.edgeStart,
    exit.edgeEnd,
    refractiveIndex,
    1,
  );
  if (!outgoingDirection) return invalidRay(true);

  const outgoingAngleRad = Math.atan2(outgoingDirection.y, outgoingDirection.x);
  return {
    valid: true,
    totalInternalReflection: false,
    entryPoint,
    exitPoint,
    internalDirection,
    outgoingDirection,
    outgoingAngleRad,
    deviationRad: Math.abs(outgoingAngleRad),
  };
}

/** Formula value used to verify the geometric trace at symmetric incidence. */
export function theoreticalMinimumDeviation(refractiveIndex: number): number | null {
  if (!Number.isFinite(refractiveIndex) || refractiveIndex <= 1) return null;
  const sine = refractiveIndex * Math.sin(PRISM_ANGLE_RAD / 2);
  if (sine > 1) return null;
  return 2 * Math.asin(sine) - PRISM_ANGLE_RAD;
}

/** Locate the turning point by minimizing the Snell-law ray trace over table angle. */
export function findMinimumDeviation(
  refractiveIndex = GLASS_MODEL_REFRACTIVE_INDEX,
): TurningPoint | null {
  const sampleCount = 560;
  const step = (PRISM_ROTATION_MAX_RAD - PRISM_ROTATION_MIN_RAD) / sampleCount;
  let bestRotation = PRISM_ROTATION_MIN_RAD;
  let bestDeviation = Number.POSITIVE_INFINITY;

  for (let index = 0; index <= sampleCount; index += 1) {
    const rotation = PRISM_ROTATION_MIN_RAD + index * step;
    const ray = tracePrismRay(rotation, refractiveIndex);
    if (ray.valid && ray.deviationRad < bestDeviation) {
      bestRotation = rotation;
      bestDeviation = ray.deviationRad;
    }
  }
  if (!Number.isFinite(bestDeviation)) return null;

  let left = Math.max(PRISM_ROTATION_MIN_RAD, bestRotation - step);
  let right = Math.min(PRISM_ROTATION_MAX_RAD, bestRotation + step);
  const goldenRatio = (Math.sqrt(5) - 1) / 2;
  let x1 = right - goldenRatio * (right - left);
  let x2 = left + goldenRatio * (right - left);
  const deviationAt = (rotation: number) => {
    const ray = tracePrismRay(rotation, refractiveIndex);
    return ray.valid ? ray.deviationRad : Number.POSITIVE_INFINITY;
  };
  let y1 = deviationAt(x1);
  let y2 = deviationAt(x2);

  for (let iteration = 0; iteration < 48; iteration += 1) {
    if (y1 <= y2) {
      right = x2;
      x2 = x1;
      y2 = y1;
      x1 = right - goldenRatio * (right - left);
      y1 = deviationAt(x1);
    } else {
      left = x1;
      x1 = x2;
      y1 = y2;
      x2 = left + goldenRatio * (right - left);
      y2 = deviationAt(x2);
    }
  }

  const rotationRad = (left + right) / 2;
  const ray = tracePrismRay(rotationRad, refractiveIndex);
  return ray.valid ? { rotationRad, deviationRad: ray.deviationRad } : null;
}

export function computeState(
  params: Params,
  turningPoint: TurningPoint | null,
  refractiveIndex = GLASS_MODEL_REFRACTIVE_INDEX,
): State {
  const ray = params.prismInserted
    ? tracePrismRay(params.prismRotationRad, refractiveIndex)
    : {
      ...invalidRay(),
      valid: true,
      outgoingAngleRad: 0,
      deviationRad: 0,
    };
  const outgoingAngleRad = ray.valid ? ray.outgoingAngleRad : 0;
  const imageOffsetRad = wrapRadians(outgoingAngleRad - params.telescopeRotationRad);
  const atTurningPoint = Boolean(
    params.prismInserted &&
    ray.valid &&
    turningPoint &&
    Math.abs(params.prismRotationRad - turningPoint.rotationRad) <= degreesToRadians(0.3),
  );
  const telescopeAligned = Math.abs(imageOffsetRad) <= degreesToRadians(0.75);

  return {
    ray,
    deviationRad: ray.valid ? ray.deviationRad : 0,
    outgoingAngleRad,
    imageOffsetRad,
    atTurningPoint,
    telescopeAligned,
    turningPoint,
  };
}

export function isValidVernierReading(reading: VernierReading): boolean {
  return (
    Number.isInteger(reading.mainScaleDegrees) &&
    reading.mainScaleDegrees >= 0 &&
    reading.mainScaleDegrees <= 359 &&
    (reading.mainScaleMinutes === 0 || reading.mainScaleMinutes === 30) &&
    Number.isInteger(reading.vernierCoincidence) &&
    reading.vernierCoincidence >= 0 &&
    reading.vernierCoincidence < VERNIER_DIVISIONS
  );
}

export function createVernierReading(
  mainScaleDegrees: number,
  mainScaleMinutes: number,
  vernierCoincidence: number,
): VernierReading | null {
  if (
    !Number.isInteger(mainScaleDegrees) ||
    mainScaleDegrees < 0 ||
    mainScaleDegrees > 359 ||
    (mainScaleMinutes !== 0 && mainScaleMinutes !== 30) ||
    !Number.isInteger(vernierCoincidence) ||
    vernierCoincidence < 0 ||
    vernierCoincidence >= VERNIER_DIVISIONS
  ) {
    return null;
  }

  const scaleMinutes: 0 | 30 = mainScaleMinutes === 30 ? 30 : 0;
  const reading = {
    mainScaleDegrees,
    mainScaleMinutes: scaleMinutes,
    vernierCoincidence,
  };
  return isValidVernierReading(reading) ? reading : null;
}

export function vernierReadingArcMinutes(reading: VernierReading): number | null {
  if (!isValidVernierReading(reading)) return null;
  return (
    reading.mainScaleDegrees * 60 +
    reading.mainScaleMinutes +
    reading.vernierCoincidence * LEAST_COUNT_ARCMIN
  );
}

/** Convert an apparatus angle to MSR + VSC with a 1′ least count. */
export function vernierReadingFromAngle(angleRad: number): VernierReading | null {
  if (!Number.isFinite(angleRad)) return null;
  const normalizedRadians = ((angleRad % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const totalArcMinutes = Math.round(radiansToDegrees(normalizedRadians) * 60) % FULL_CIRCLE_ARCMIN;
  const mainScaleArcMinutes =
    Math.floor(totalArcMinutes / MAIN_SCALE_DIVISION_ARCMIN) * MAIN_SCALE_DIVISION_ARCMIN;
  return createVernierReading(
    Math.floor(mainScaleArcMinutes / 60),
    mainScaleArcMinutes % 60,
    totalArcMinutes - mainScaleArcMinutes,
  );
}

/** Smallest unsigned angular difference, including readings across 0°/360°. */
export function angularDifferenceArcMinutes(
  first: VernierReading,
  second: VernierReading,
): number | null {
  const firstMinutes = vernierReadingArcMinutes(first);
  const secondMinutes = vernierReadingArcMinutes(second);
  if (firstMinutes === null || secondMinutes === null) return null;

  const halfCircle = FULL_CIRCLE_ARCMIN / 2;
  const wrappedDifference =
    ((firstMinutes - secondMinutes + halfCircle) % FULL_CIRCLE_ARCMIN + FULL_CIRCLE_ARCMIN) %
    FULL_CIRCLE_ARCMIN - halfCircle;
  return Math.abs(wrappedDifference);
}

export function formatAngleArcMinutes(arcMinutes: number, minutePrecision = 1): string {
  if (!Number.isFinite(arcMinutes) || arcMinutes < 0) return '—';
  const degrees = Math.floor(arcMinutes / 60);
  const minutes = arcMinutes - degrees * 60;
  const formattedMinutes = minutes.toFixed(minutePrecision);
  const minuteText = minutePrecision === 0 ? formattedMinutes.padStart(2, '0') : formattedMinutes.padStart(4, '0');
  return `${degrees}° ${minuteText}′`;
}

export function formatVernierReading(reading: VernierReading | null): string {
  if (!reading) return '—';
  const totalArcMinutes = vernierReadingArcMinutes(reading);
  if (totalArcMinutes === null) return '—';
  const mainScaleArcMinutes = reading.mainScaleDegrees * 60 + reading.mainScaleMinutes;
  return `TR ${formatAngleArcMinutes(totalArcMinutes, 0)} · MSR ${formatAngleArcMinutes(mainScaleArcMinutes, 0)} · VSC ${String(reading.vernierCoincidence).padStart(2, '0')}`;
}

export function refractiveIndexFromDeviation(deviationRad: number): number | null {
  if (
    !Number.isFinite(deviationRad) ||
    deviationRad <= 0 ||
    deviationRad >= 2 * Math.PI / 3
  ) {
    return null;
  }
  const value =
    Math.sin((PRISM_ANGLE_RAD + deviationRad) / 2) / Math.sin(PRISM_ANGLE_RAD / 2);
  return Number.isFinite(value) && value > 1 ? value : null;
}

export function speedInMedium(refractiveIndex: number): number | null {
  if (!Number.isFinite(refractiveIndex) || refractiveIndex <= 1) return null;
  const speed = SPEED_OF_LIGHT_M_S / refractiveIndex;
  return Number.isFinite(speed) && speed > 0 ? speed : null;
}

export function createTrial(
  trial: number,
  readings: TrialReadings,
  prismRotationRad: number | null = null,
): PrismTrial | null {
  if (
    !Number.isInteger(trial) ||
    trial < 1 ||
    (prismRotationRad !== null && !Number.isFinite(prismRotationRad)) ||
    !isValidVernierReading(readings.directA) ||
    !isValidVernierReading(readings.directB) ||
    !isValidVernierReading(readings.minimumA) ||
    !isValidVernierReading(readings.minimumB)
  ) {
    return null;
  }

  const deviationAArcMinutes = angularDifferenceArcMinutes(readings.minimumA, readings.directA);
  const deviationBArcMinutes = angularDifferenceArcMinutes(readings.minimumB, readings.directB);
  if (deviationAArcMinutes === null || deviationBArcMinutes === null) return null;

  const meanDeviationArcMinutes = (deviationAArcMinutes + deviationBArcMinutes) / 2;
  const meanDeviationRad = degreesToRadians(meanDeviationArcMinutes / 60);
  const refractiveIndex = refractiveIndexFromDeviation(meanDeviationRad);
  if (refractiveIndex === null) return null;
  const speedMPerS = speedInMedium(refractiveIndex);
  if (speedMPerS === null) return null;

  return {
    trial,
    prismRotationRad,
    ...readings,
    deviationAArcMinutes,
    deviationBArcMinutes,
    meanDeviationArcMinutes,
    refractiveIndex,
    speedMPerS,
  };
}

export function computeExperimentResult(trials: PrismTrial[]): ExperimentResult {
  const validTrials = trials.filter((trial) =>
    Number.isFinite(trial.meanDeviationArcMinutes) &&
    trial.meanDeviationArcMinutes > 0 &&
    Number.isFinite(trial.refractiveIndex) &&
    trial.refractiveIndex > 1 &&
    Number.isFinite(trial.speedMPerS) &&
    trial.speedMPerS > 0,
  );
  const meanDeviationArcMinutes = validTrials.length > 0
    ? validTrials.reduce((sum, trial) => sum + trial.meanDeviationArcMinutes, 0) / validTrials.length
    : 0;
  const refractiveIndex = meanDeviationArcMinutes > 0
    ? refractiveIndexFromDeviation(degreesToRadians(meanDeviationArcMinutes / 60)) ?? 0
    : 0;

  return {
    trialCount: validTrials.length,
    meanDeviationArcMinutes,
    refractiveIndex,
    speedMPerS: refractiveIndex > 0 ? speedInMedium(refractiveIndex) ?? 0 : 0,
  };
}

export function computeDeviationCurve(
  refractiveIndex = GLASS_MODEL_REFRACTIVE_INDEX,
  sampleCount = 57,
): Array<{ rotationRad: number; deviationRad: number }> {
  return Array.from({ length: sampleCount + 1 }, (_, index) => {
    const rotationRad =
      PRISM_ROTATION_MIN_RAD +
      (PRISM_ROTATION_MAX_RAD - PRISM_ROTATION_MIN_RAD) * index / sampleCount;
    const ray = tracePrismRay(rotationRad, refractiveIndex);
    return { rotationRad, deviationRad: ray.valid ? ray.deviationRad : Number.NaN };
  });
}
