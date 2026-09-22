import { useEffect, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';

import { getRanking, listVacancies } from '../api/vacancies';
import { Pagination } from '../components/Pagination';
import { RankingTable } from '../components/RankingTable';
import { EmptyState, ErrorState, Skeleton } from '../components/States';

const VACANCY_OPTIONS_LIMIT = 100;
const PAGE_LIMIT = 10;

const getPage = (value: string | null): number => {
  const page = Number(value);

  return Number.isInteger(page) && page > 0 ? page : 1;
};

const getMinScore = (value: string | null): number | undefined => {
  const minScore = Number(value);

  return value !== null && value !== '' && Number.isInteger(minScore) && minScore >= 0
    ? minScore
    : undefined;
};

export const RankingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedVacancyId, setSelectedVacancyId] = useState(searchParams.get('vacancyId') ?? '');
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');
  const [minScoreInput, setMinScoreInput] = useState(searchParams.get('minScore') ?? '');
  const [hasRun, setHasRun] = useState(false);

  const vacancyId = searchParams.get('vacancyId') ?? '';
  const search = searchParams.get('search') ?? '';
  const minScore = getMinScore(searchParams.get('minScore'));
  const page = getPage(searchParams.get('page'));

  useEffect(() => {
    setSelectedVacancyId(vacancyId);
  }, [vacancyId]);

  const vacanciesQuery = useQuery({
    queryKey: ['vacancies', 'ranking-options'],
    queryFn: ({ signal }) =>
      listVacancies(
        { page: 1, limit: VACANCY_OPTIONS_LIMIT, sortBy: 'name', sortOrder: 'asc' },
        signal,
      ),
  });

  const isReady = hasRun && vacancyId !== '';

  const rankingQuery = useQuery({
    queryKey: ['ranking', vacancyId, page, search, minScore ?? null],
    enabled: isReady,
    queryFn: ({ signal }) => {
      if (!isReady) {
        throw new Error('Ranking requested before a vacancy was chosen.');
      }

      return getRanking(
        vacancyId,
        { page, limit: PAGE_LIMIT, search: search || undefined, minScore },
        signal,
      );
    },
  });

  const runRanking = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (selectedVacancyId === '') {
      return;
    }

    const nextParams = new URLSearchParams({ vacancyId: selectedVacancyId });
    const trimmedSearch = searchInput.trim();
    const trimmedMinScore = minScoreInput.trim();

    if (trimmedSearch) {
      nextParams.set('search', trimmedSearch);
    }

    if (trimmedMinScore) {
      nextParams.set('minScore', trimmedMinScore);
    }

    setSearchParams(nextParams);
    setHasRun(true);
  };

  const changePage = (nextPage: number) => {
    const nextParams = new URLSearchParams(searchParams);

    if (nextPage > 1) {
      nextParams.set('page', String(nextPage));
    } else {
      nextParams.delete('page');
    }

    setSearchParams(nextParams);
  };

  const ranking = rankingQuery.data;
  const vacancyOptions = vacanciesQuery.data?.data ?? [];

  return (
    <div className="page stack">
      <header className="page-header">
        <div>
          <h1 className="page-heading">Ranking</h1>
          <p className="page-description">
            Score every active candidate against a vacancy's weighted criteria.
          </p>
        </div>
      </header>

      {vacanciesQuery.isPending ? (
        <Skeleton rows={3} />
      ) : vacanciesQuery.isError ? (
        <ErrorState error={vacanciesQuery.error} onRetry={() => void vacanciesQuery.refetch()} />
      ) : vacancyOptions.length === 0 ? (
        <EmptyState
          description="Create a vacancy with at least one criterion before ranking candidates."
          title="No vacancies to rank against"
        />
      ) : (
        <form className="vacancy-picker" onSubmit={runRanking}>
          <div className="field">
            <label htmlFor="ranking-vacancy">Vacancy</label>
            <select
              id="ranking-vacancy"
              onChange={(event) => setSelectedVacancyId(event.target.value)}
              value={selectedVacancyId}
            >
              <option value="">Select a vacancy</option>
              {vacancyOptions.map((vacancy) => (
                <option key={vacancy.id} value={vacancy.id}>
                  {vacancy.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="ranking-search">Filter by candidate</label>
            <input
              id="ranking-search"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Name or email"
              type="search"
              value={searchInput}
            />
          </div>

          <div className="field">
            <label htmlFor="ranking-min-score">Minimum score</label>
            <input
              id="ranking-min-score"
              min={0}
              onChange={(event) => setMinScoreInput(event.target.value)}
              type="number"
              value={minScoreInput}
            />
          </div>

          <div className="form-actions">
            <button
              className="button button-primary"
              disabled={selectedVacancyId === '' || rankingQuery.isFetching}
              type="submit"
            >
              {rankingQuery.isFetching ? 'Ranking' : 'Run ranking'}
            </button>
          </div>
        </form>
      )}

      <section aria-label="Ranking results" className="stack">
        {!isReady ? (
          <EmptyState
            description="Choose a vacancy and run the ranking to see scored candidates."
            title="No ranking run yet"
          />
        ) : rankingQuery.isPending ? (
          <Skeleton />
        ) : rankingQuery.isError ? (
          <ErrorState error={rankingQuery.error} onRetry={() => void rankingQuery.refetch()} />
        ) : ranking === undefined ? null : ranking.results.length === 0 ? (
          <EmptyState
            description="No active candidates match the current filters for this vacancy."
            title="No candidates to show"
          />
        ) : (
          <>
            <div className="section-header">
              <h2 className="section-heading" id="ranking-results-heading">
                {ranking.vacancy.name}
              </h2>
              <p className="muted-text">{ranking.pagination.total} ranked candidates</p>
            </div>
            <RankingTable results={ranking.results} />
            <Pagination onPageChange={changePage} pagination={ranking.pagination} />
          </>
        )}
      </section>
    </div>
  );
};
