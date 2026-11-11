import { NavLink } from 'react-router-dom';

export default function Header() {
  return (
    <header className="app-header">
      <div className="header-brand">
        <NavLink to="/" className="brand-link" aria-label="SimuSist home">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <circle cx="14" cy="14" r="13" stroke="var(--accent)" strokeWidth="2" />
            <circle cx="14" cy="14" r="4" fill="var(--accent)" />
            <line x1="14" y1="1" x2="14" y2="8" stroke="var(--accent)" strokeWidth="1.5" />
            <line x1="14" y1="20" x2="14" y2="27" stroke="var(--accent)" strokeWidth="1.5" />
            <line x1="1" y1="14" x2="8" y2="14" stroke="var(--accent)" strokeWidth="1.5" />
            <line x1="20" y1="14" x2="27" y2="14" stroke="var(--accent)" strokeWidth="1.5" />
          </svg>
          <span className="brand-name">SimuSist</span>
        </NavLink>
      </div>

      <nav className="header-nav" aria-label="SimuSist navigation">
        <NavLink
          to="/"
          className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}
          end
        >
          Library
        </NavLink>
        <NavLink
          to="/subjects/physics"
          className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}
        >
          Physics
        </NavLink>
      </nav>
    </header>
  );
}
