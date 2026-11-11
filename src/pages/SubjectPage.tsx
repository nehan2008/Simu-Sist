import experiments from '../registry/experiments';
import type { ExperimentMeta } from '../types';
import { Link } from 'react-router-dom';

interface SubjectPageProps {
  subject: ExperimentMeta['subject'];
  title: string;
}

export default function SubjectPage({ subject, title }: SubjectPageProps) {
  const subjectExperiments = experiments.filter((e) => e.subject === subject);

  return (
    <div className="page-subject">
      <div className="library-header">
        <h1 className="page-title">{title}</h1>
      </div>

      {subjectExperiments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">🔬</div>
          <p className="empty-state-message">No {title.toLowerCase()} experiments yet.</p>
        </div>
      ) : (
        <ul className="experiment-grid" role="list">
          {subjectExperiments.map((exp) => (
            <li key={exp.id} className="experiment-card">
              <Link to={`/experiments/${exp.id}`} className="card-link">
                <h2 className="card-title">{exp.title}</h2>
                <p className="card-tagline">{exp.tagline}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
