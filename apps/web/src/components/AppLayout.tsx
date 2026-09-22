import { Link, NavLink, Outlet } from 'react-router';

const navigationItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/candidates', label: 'Candidates', end: false },
  { to: '/vacancies', label: 'Vacancies', end: false },
  { to: '/ranking', label: 'Ranking', end: false },
] as const;

export const AppLayout = () => (
  <div className="app-shell">
    <a className="skip-link" href="#main-content">
      Skip to content
    </a>
    <aside className="sidebar">
      <Link className="brand" to="/">
        Talent Ranking
      </Link>
      <nav aria-label="Primary navigation" className="primary-nav">
        {navigationItems.map((item) => (
          <NavLink
            className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
            end={item.end}
            key={item.to}
            to={item.to}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
    <main className="app-main" id="main-content">
      <Outlet />
    </main>
  </div>
);
