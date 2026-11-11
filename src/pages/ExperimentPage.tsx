import { Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getExperimentById } from '../registry/experiments';

export default function ExperimentPage() {
  const { id } = useParams<{ id: string }>();
  const experiment = id ? getExperimentById(id) : undefined;

  if (!experiment) {
    return (
      <div className="page-error">
        <h1>Experiment not found</h1>
        <p>No experiment exists with the ID <code>{id}</code>.</p>
        <Link to="/" className="btn btn-secondary">Back to Library</Link>
      </div>
    );
  }

  const ExperimentComponent = experiment.component;

  return (
    <div className="page-experiment">
      <div className="experiment-header">
        <Link to="/" className="back-link" aria-label="Back to experiment library">
          ← Library
        </Link>
        <div>
          <h1 className="experiment-title">{experiment.title}</h1>
          <p className="experiment-tagline">{experiment.tagline}</p>
        </div>
      </div>

      <Suspense fallback={<div className="loading-experiment">Loading simulation…</div>}>
        <ExperimentComponent />
      </Suspense>
    </div>
  );
}
