import { lazy } from 'react';
import type { ExperimentMeta } from '../types';

/**
 * Central registry of all experiments.
 * To add a new experiment:
 *   1. Create src/experiments/<id>/index.tsx
 *   2. Add an entry here — the route and library card are generated automatically.
 */
const experiments: ExperimentMeta[] = [
  {
    id: 'youngs-modulus',
    title: "Young's Modulus by Non-Uniform Bending",
    tagline: 'Measure the elastic modulus of a beam by observing its central depression under a known load.',
    subject: 'physics',
    difficulty: 'intermediate',
    concepts: ['elasticity', 'stress', 'strain', 'bending moment', "Young's modulus"],
    component: lazy(() => import('../experiments/youngs-modulus')),
  },
  {
    id: 'torsional-pendulum',
    title: 'Rigidity Modulus by Torsional Pendulum',
    tagline: 'Measure the rigidity modulus of a wire by observing torsional oscillations of a platform with attached masses.',
    subject: 'physics',
    difficulty: 'intermediate',
    concepts: ['rigidity', 'torsion', 'moment of inertia', 'oscillation', 'elastic modulus'],
    component: lazy(() => import('../experiments/torsional-pendulum')),
  },
  {
    id: 'diffraction-grating',
    title: 'Laser Wavelength by Diffraction Grating',
    tagline: 'Determine a laser wavelength from the symmetric diffraction angles produced by a grating.',
    subject: 'physics',
    difficulty: 'intermediate',
    concepts: ['diffraction', 'laser', 'wavelength', 'grating', 'interference'],
    component: lazy(() => import('../experiments/diffraction-grating')),
  },
  {
    id: 'optical-fiber',
    title: 'Optical Fiber Attenuation Loss & Numerical Aperture',
    tagline: 'Measure a fiber’s numerical aperture and compare bending and cable losses with a power meter.',
    subject: 'physics',
    difficulty: 'intermediate',
    concepts: ['optical fiber', 'numerical aperture', 'acceptance angle', 'attenuation', 'bending loss'],
    component: lazy(() => import('../experiments/optical-fiber')),
  },
];

export default experiments;

/** Look up a single experiment by its id slug. */
export function getExperimentById(id: string): ExperimentMeta | undefined {
  return experiments.find((e) => e.id === id);
}

/** Filter experiments by subject. */
export function getExperimentsBySubject(
  subject: ExperimentMeta['subject'],
): ExperimentMeta[] {
  return experiments.filter((e) => e.subject === subject);
}
