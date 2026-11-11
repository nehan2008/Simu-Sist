/**
 * Physics subject module.
 * Import and re-export physics experiments here so the registry
 * can reference them through a subject-scoped entry point.
 *
 * Example (once an experiment exists):
 *   export { default as ProjectileMotion } from '../../experiments/projectile-motion';
 */

export const SUBJECT_LABEL = 'Physics';
export const SUBJECT_ID = 'physics' as const;
