/**
 * Common physics utility functions.
 * All inputs and outputs use SI units unless noted.
 */

/** Convert degrees to radians */
export const toRadians = (deg: number): number => (deg * Math.PI) / 180;

/** Convert radians to degrees */
export const toDegrees = (rad: number): number => (rad * 180) / Math.PI;

/** Clamp a value between min and max */
export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/** Round to a given number of decimal places */
export const round = (value: number, decimals: number = 2): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

/** Linear interpolation */
export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * clamp(t, 0, 1);

/** Kinematic: displacement given initial velocity, time, and acceleration */
export const displacement = (v0: number, t: number, a: number): number =>
  v0 * t + 0.5 * a * t * t;

/** Kinematic: velocity given initial velocity, acceleration, and time */
export const velocity = (v0: number, a: number, t: number): number =>
  v0 + a * t;

/** Standard acceleration due to gravity (m/s²) */
export const GRAVITY = 9.81;
