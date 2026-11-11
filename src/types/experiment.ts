/**
 * Core types for the SimuSist experiment system.
 * Every experiment in the registry must conform to ExperimentMeta.
 */

export type Subject = 'physics' | 'chemistry' | 'biology' | 'mathematics';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

/** Metadata registered for every experiment. */
export interface ExperimentMeta {
  /** Unique slug used in the URL: /experiments/:id */
  id: string;
  /** Display name shown in the experiment library */
  title: string;
  /** One-line description of what the student investigates */
  tagline: string;
  subject: Subject;
  difficulty: DifficultyLevel;
  /** e.g. ['velocity', 'acceleration', 'force'] */
  concepts: string[];
  /** Lazy-loaded experiment page component */
  component: React.LazyExoticComponent<React.ComponentType>;
}

/** State shape shared by all simulation hooks */
export interface SimulationState {
  isRunning: boolean;
  elapsedTime: number; // seconds
  /** Arbitrary key-value measurements the experiment records */
  measurements: Record<string, number>;
}

/** A single data point recorded during a simulation run */
export interface DataPoint {
  time: number;
  [key: string]: number;
}
