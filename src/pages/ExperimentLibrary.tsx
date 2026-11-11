import experiments from '../registry/experiments';
import type { ExperimentMeta } from '../types';
import { Link } from 'react-router-dom';

const SUBJECT_LABELS: Record<ExperimentMeta['subject'], string> = {
  physics: 'Physics',
  chemistry: 'Chemistry',
  biology: 'Biology',
  mathematics: 'Mathematics',
};

const DIFFICULTY_LABELS: Record<ExperimentMeta['difficulty'], string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export default function ExperimentLibrary() {
  return (
    <div className="page-library">
      <div className="library-header">
        <h1 className="page-title">Experiment Library</h1>
        <p className="page-subtitle">
          Select an experiment to open the interactive simulation.
        </p>
      </div>

      {experiments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">⚗️</div>
          <p className="empty-state-message">No experiments registered yet.</p>
          <p className="empty-state-hint">
            Add an experiment to <code>src/registry/experiments.ts</code> to see it here.
          </p>
        </div>
      ) : (
        <ul className="experiment-grid" role="list">
          {experiments.map((exp) => (
            <li key={exp.id} className="experiment-card">
              <Link to={`/experiments/${exp.id}`} className="card-link">
                <div className="card-meta">
                  <span className="badge badge-subject">
                    {SUBJECT_LABELS[exp.subject]}
                  </span>
                  <span className="badge badge-difficulty">
                    {DIFFICULTY_LABELS[exp.difficulty]}
                  </span>
                </div>
                <h2 className="card-title">{exp.title}</h2>
                <p className="card-tagline">{exp.tagline}</p>
                <div className="card-concepts" aria-label="Concepts covered">
                  {exp.concepts.map((c) => (
                    <span key={c} className="concept-tag">{c}</span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
