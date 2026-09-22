import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';

import { ApiError } from '../api/client';
import type { Vacancy, VacancyInput } from '../api/types';
import { createVacancy, deleteVacancy, listVacancies, updateVacancy } from '../api/vacancies';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { useToast } from '../components/Toast';
import { VacancyForm } from '../components/VacancyForm';
import { VacancyTable } from '../components/VacancyTable';
import { formatCriterionSummary } from '../lib/format';

const PAGE_LIMIT = 10;

const getPage = (value: string | null): number => {
  const page = Number(value);

  return Number.isInteger(page) && page > 0 ? page : 1;
};

const getErrorMessage = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'The vacancy request could not be completed.';

export const VacanciesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingVacancy, setEditingVacancy] = useState<Vacancy | null>(null);
  const [detailVacancy, setDetailVacancy] = useState<Vacancy | null>(null);
  const [vacancyToDelete, setVacancyToDelete] = useState<Vacancy | null>(null);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const page = getPage(searchParams.get('page'));
  const search = searchParams.get('search') ?? '';

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const vacanciesQuery = useQuery({
    queryKey: ['vacancies', page, search],
    queryFn: ({ signal }) =>
      listVacancies(
        {
          page,
          limit: PAGE_LIMIT,
          search: search || undefined,
          sortBy: 'name',
          sortOrder: 'asc',
        },
        signal,
      ),
  });

  const createMutation = useMutation({
    mutationFn: createVacancy,
    onError: (error) => showToast(getErrorMessage(error), 'error'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['vacancies'] });
      setFormOpen(false);
      showToast('Vacancy created.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { readonly id: string; readonly input: VacancyInput }) =>
      updateVacancy(id, input),
    onError: (error) => showToast(getErrorMessage(error), 'error'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['vacancies'] });
      setFormOpen(false);
      showToast('Vacancy updated.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVacancy,
    onError: (error) => showToast(getErrorMessage(error), 'error'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['vacancies'] });
      setVacancyToDelete(null);
      showToast('Vacancy deleted.');
    },
  });

  const updateParams = (nextPage: number, nextSearch: string) => {
    const nextParams = new URLSearchParams();

    if (nextSearch) {
      nextParams.set('search', nextSearch);
    }

    if (nextPage > 1) {
      nextParams.set('page', String(nextPage));
    }

    setSearchParams(nextParams);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateParams(1, searchInput.trim());
  };

  const submitVacancy = async (input: VacancyInput) => {
    if (editingVacancy === null) {
      await createMutation.mutateAsync(input);
      return;
    }

    await updateMutation.mutateAsync({ id: editingVacancy.id, input });
  };

  const openCreateForm = () => {
    setEditingVacancy(null);
    setFormOpen(true);
  };

  const openEditForm = (vacancy: Vacancy) => {
    setEditingVacancy(vacancy);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
  };

  if (vacanciesQuery.isPending) {
    return (
      <div className="page">
        <Skeleton />
      </div>
    );
  }

  if (vacanciesQuery.isError) {
    return (
      <div className="page">
        <ErrorState error={vacanciesQuery.error} onRetry={() => void vacanciesQuery.refetch()} />
      </div>
    );
  }

  if (vacanciesQuery.data === undefined) {
    return null;
  }

  const { data: vacancies, pagination } = vacanciesQuery.data;

  return (
    <div className="page stack">
      <header className="page-header">
        <div>
          <h1 className="page-heading">Vacancies</h1>
          <p className="page-description">
            Define the weighted criteria candidates are scored against.
          </p>
        </div>
        <button className="button button-primary" onClick={openCreateForm} type="button">
          Add vacancy
        </button>
      </header>

      <section aria-label="Vacancy list">
        <div className="toolbar">
          <form className="inline-controls" onSubmit={submitSearch}>
            <div className="field search-field">
              <label className="visually-hidden" htmlFor="vacancy-search">
                Search vacancies
              </label>
              <input
                id="vacancy-search"
                onChange={(event) => setSearchInput(event.target.value)}
                type="search"
                value={searchInput}
              />
            </div>
            <button className="button button-secondary" type="submit">
              Search vacancies
            </button>
          </form>
        </div>

        {vacancies.length === 0 ? (
          <EmptyState
            action={
              <button className="button button-primary" onClick={openCreateForm} type="button">
                Add vacancy
              </button>
            }
            description={
              search
                ? 'No vacancies match this search. Change the search or add a vacancy.'
                : 'Add a vacancy with at least one criterion to start ranking candidates.'
            }
            title={search ? 'No matching vacancies' : 'No vacancies yet'}
          />
        ) : (
          <>
            <VacancyTable
              onDelete={setVacancyToDelete}
              onEdit={openEditForm}
              onView={setDetailVacancy}
              vacancies={vacancies}
            />
            <Pagination
              onPageChange={(nextPage) => updateParams(nextPage, search)}
              pagination={pagination}
            />
          </>
        )}
      </section>

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingVacancy === null ? 'Add vacancy' : 'Edit vacancy'}
      >
        {isFormOpen ? (
          <VacancyForm
            key={editingVacancy?.id ?? 'new-vacancy'}
            onCancel={closeForm}
            onSubmit={submitVacancy}
            submitLabel={editingVacancy === null ? 'Create vacancy' : 'Save changes'}
            vacancy={editingVacancy ?? undefined}
          />
        ) : null}
      </Modal>

      <Modal
        isOpen={detailVacancy !== null}
        onClose={() => setDetailVacancy(null)}
        title="Vacancy details"
      >
        {detailVacancy ? (
          <>
            <dl className="detail-list">
              <div>
                <dt>Name</dt>
                <dd>{detailVacancy.name}</dd>
              </div>
              <div>
                <dt>Criteria</dt>
                <dd>{detailVacancy.criteria.length}</dd>
              </div>
            </dl>
            <p className="muted-text">{detailVacancy.description}</p>
            <div className="badge-list">
              {detailVacancy.criteria.map((criterion) => (
                <span className="badge" key={criterion.id}>
                  {formatCriterionSummary(criterion)} · weight {criterion.weight}
                </span>
              ))}
            </div>
          </>
        ) : null}
      </Modal>

      <Modal
        isOpen={vacancyToDelete !== null}
        onClose={() => setVacancyToDelete(null)}
        title="Delete vacancy"
      >
        {vacancyToDelete ? (
          <>
            <p className="confirmation-copy">
              Delete {vacancyToDelete.name}? Its criteria and any cached ranking are removed with
              it.
            </p>
            <div className="confirmation-actions">
              <button
                className="button button-secondary"
                disabled={deleteMutation.isPending}
                onClick={() => setVacancyToDelete(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="button button-danger"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(vacancyToDelete.id)}
                type="button"
              >
                {deleteMutation.isPending ? 'Deleting' : 'Delete vacancy'}
              </button>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  );
};
