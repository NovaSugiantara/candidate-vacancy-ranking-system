import { createBrowserRouter, Link } from 'react-router';

import { AppLayout } from './components/AppLayout';
import { CandidatesPage } from './pages/CandidatesPage';
import { DashboardPage } from './pages/DashboardPage';
import { RankingPage } from './pages/RankingPage';
import { VacanciesPage } from './pages/VacanciesPage';

const NotFoundPage = () => (
  <div className="page stack">
    <header className="page-header">
      <div>
        <h1 className="page-heading">Page not found</h1>
        <p className="page-description">That route does not exist.</p>
      </div>
    </header>
    <Link className="button button-primary" to="/">
      Back to dashboard
    </Link>
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppLayout,
    children: [
      { index: true, Component: DashboardPage },
      { path: 'candidates', Component: CandidatesPage },
      { path: 'vacancies', Component: VacanciesPage },
      { path: 'ranking', Component: RankingPage },
      { path: '*', Component: NotFoundPage },
    ],
  },
]);
