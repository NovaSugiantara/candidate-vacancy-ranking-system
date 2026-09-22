import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';

import { listCandidates } from '../api/candidates';
import { getRanking, listVacancies } from '../api/vacancies';
import { RankingTable } from '../components/RankingTable';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { formatCriterionSummary } from '../lib/format';

const RECENT_LIMIT = 5;
const RANKING_LIMIT = 3;

export const DashboardPage = () => {
  const candidatesQuery = useQuery({
    queryKey: ['candidates', 'dashboard-total'],
    queryFn: ({ signal }) => listCandidates({ page: 1, limit: 1 }, signal),
  });

  const vacanciesQuery = useQuery({
    queryKey: ['vacancies', 'dashboard-recent'],
    queryFn: ({ signal }) =>
      listVacancies(
        { page: 1, limit: RECENT_LIMIT, sortBy: 'createdAt', sortOrder: 'desc' },
        signal,
      ),
  });

  const recentVacancies = vacanciesQuery.data?.data ?? [];
  const mostRecent = recentVacancies.at(0);

  const rankingQuery = useQuery({
    queryKey: ['ranking', mostRecent?.id ?? 'none', 'summary'],
    enabled: mostRecent !== undefined,
    queryFn: ({ signal }) => {
      if (mostRecent === undefined) {
        throw new Error('Ranking summary requested without a vacancy.');
      }

      return getRanking(mostRecent.id, { page: 1, limit: RANKING_LIMIT }, signal);
    },
  });

  if (candidatesQuery.isPending || vacanciesQuery.isPending) {
    return (
      <div className="page">
        <Skeleton />
      </div>
    );
  }

  if (candidatesQuery.isError || vacanciesQuery.isError) {
    return (
      <div className="page">
        <ErrorState
          error={candidatesQuery.error ?? vacanciesQuery.error}
          onRetry={() => {
            void candidatesQuery.refetch();
            void vacanciesQuery.refetch();
          }}
        />
      </div>
    );
  }

  const candidateTotal = candidatesQuery.data?.pagination.total ?? 0;
  const vacancyTotal = vacanciesQuery.data?.pagination.total ?? 0;
  const ranking = rankingQuery.data;

  return (
    <div className="page stack">
      <header className="page-header">
        <div>
          <h1 className="page-heading">Dashboard</h1>
          <p className="page-description">
            Totals across the candidate pool, the vacancy list, and the latest ranking.
          </p>
        </div>
      </header>

      <section aria-label="Totals" className="stats-grid">
        <article className="stat-card">
          <h2>Candidates</h2>
          <p className="stat-value">{candidateTotal}</p>
          <Link className="text-button" to="/candidates">
            Manage candidates
          </Link>
        </article>
        <article className="stat-card">
          <h2>Vacancies</h2>
          <p className="stat-value">{vacancyTotal}</p>
          <Link className="text-button" to="/vacancies">
            Manage vacancies
          </Link>
        </article>
      </section>

      <section aria-labelledby="recent-vacancies-heading" className="stack">
        <div className="section-header">
          <h2 className="section-heading" id="recent-vacancies-heading">
            Recent vacancies
          </h2>
          <Link className="text-button" to="/vacancies">
            View all
          </Link>
        </div>

        {recentVacancies.length === 0 ? (
          <EmptyState
            action={
              <Link className="button button-primary" to="/vacancies">
                Add vacancy
              </Link>
            }
            description="Create a vacancy so candidates can be ranked against its criteria."
            title="No vacancies yet"
          />
        ) : (
          <div className="table-card">
            <table className="data-table">
              <caption>Most recently created vacancies</caption>
              <thead>
                <tr>
                  <th scope="col">Vacancy</th>
                  <th scope="col">Criteria</th>
                  <th scope="col">Ranking</th>
                </tr>
              </thead>
              <tbody>
                {recentVacancies.map((vacancy) => (
                  <tr key={vacancy.id}>
                    <td>
                      <strong>{vacancy.name}</strong>
                    </td>
                    <td>
                      <div className="badge-list">
                        {vacancy.criteria.map((criterion) => (
                          <span className="badge" key={criterion.id}>
                            {formatCriterionSummary(criterion)} · weight {criterion.weight}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <Link className="text-button" to={`/ranking?vacancyId=${vacancy.id}`}>
                        Rank candidates
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="ranking-summary-heading" className="stack">
        <h2 className="section-heading" id="ranking-summary-heading">
          Ranking summary
        </h2>

        {mostRecent === undefined ? (
          <EmptyState
            description="A ranking summary appears once a vacancy exists."
            title="No ranking yet"
          />
        ) : rankingQuery.isPending ? (
          <Skeleton rows={RANKING_LIMIT} />
        ) : rankingQuery.isError ? (
          <ErrorState error={rankingQuery.error} onRetry={() => void rankingQuery.refetch()} />
        ) : ranking === undefined ? null : ranking.results.length === 0 ? (
          <EmptyState
            description="There are no active candidates to rank for this vacancy."
            title="No candidates to rank"
          />
        ) : (
          <>
            <p className="muted-text">
              Top {ranking.results.length} for {ranking.vacancy.name}
            </p>
            <RankingTable results={ranking.results} />
            <Link className="text-button" to={`/ranking?vacancyId=${mostRecent.id}`}>
              Open full ranking
            </Link>
          </>
        )}
      </section>
    </div>
  );
};
