import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page-error">
      <h1>404 — Page not found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn btn-secondary">Go to Library</Link>
    </div>
  );
}
