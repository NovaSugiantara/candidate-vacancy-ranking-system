import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';

import {
  createCandidate,
  deleteCandidate,
  listCandidates,
  updateCandidate,
} from '../api/candidates';
import { ApiError } from '../api/client';
import type { Candidate, CandidateInput } from '../api/types';
import { CandidateForm } from '../components/CandidateForm';
import { CandidateTable } from '../components/CandidateTable';
import { Modal } from '../components/Modal';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { Pagination } from '../components/Pagination';
import { useToast } from '../components/Toast';
import { formatCandidateGender, formatDate, formatNumber } from '../lib/format';

const PAGE_LIMIT = 10;

const getPage = (value: string | null): number => {
  const page = Number(value);

  return Number.isInteger(page) && page > 0 ? page : 1;
};

const getErrorMessage = (error: unknown): string =>
  error instanceof ApiError ? error.message : 'The candidate request could not be completed.';

export const CandidatesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [detailCandidate, setDetailCandidate] = useState<Candidate | null>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const page = getPage(searchParams.get('page'));
  const search = searchParams.get('search') ?? '';

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const candidatesQuery = useQuery({
    queryKey: ['candidates', page, search],
    queryFn: ({ signal }) =>
      listCandidates(
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
    mutationFn: createCandidate,
    onError: (error) => showToast(getErrorMessage(error), 'error'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['candidates'] });
      setFormOpen(false);
      showToast('Candidate created.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { readonly id: string; readonly input: CandidateInput }) =>
      updateCandidate(id, input),
    onError: (error) => showToast(getErrorMessage(error), 'error'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['candidates'] });
      setFormOpen(false);
      showToast('Candidate updated.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCandidate,
    onError: (error) => showToast(getErrorMessage(error), 'error'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['candidates'] });
      setCandidateToDelete(null);
      showToast('Candidate deleted.');
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

  const submitCandidate = async (input: CandidateInput) => {
    if (editingCandidate === null) {
      await createMutation.mutateAsync(input);
      return;
    }

    await updateMutation.mutateAsync({ id: editingCandidate.id, input });
  };

  const openCreateForm = () => {
    setEditingCandidate(null);
    setFormOpen(true);
  };

  const openEditForm = (candidate: Candidate) => {
    setEditingCandidate(candidate);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
  };

  if (candidatesQuery.isPending) {
    return (
      <div className="page">
        <Skeleton />
      </div>
    );
  }

  if (candidatesQuery.isError) {
    return (
      <div className="page">
        <ErrorState error={candidatesQuery.error} onRetry={() => void candidatesQuery.refetch()} />
      </div>
    );
  }

  if (candidatesQuery.data === undefined) {
    return null;
  }

  const { data: candidates, pagination } = candidatesQuery.data;

  return (
    <div className="page stack">
      <header className="page-header">
        <div>
          <h1 className="page-heading">Candidates</h1>
          <p className="page-description">Manage active candidate profiles used in rankings.</p>
        </div>
        <button className="button button-primary" onClick={openCreateForm} type="button">
          Add candidate
        </button>
      </header>

      <section aria-label="Candidate list">
        <div className="toolbar">
          <form className="inline-controls" onSubmit={submitSearch}>
            <div className="field search-field">
              <label className="visually-hidden" htmlFor="candidate-search">
                Search candidates
              </label>
              <input
                id="candidate-search"
                onChange={(event) => setSearchInput(event.target.value)}
                type="search"
                value={searchInput}
              />
            </div>
            <button className="button button-secondary" type="submit">
              Search candidates
            </button>
          </form>
        </div>

        {candidates.length === 0 ? (
          <EmptyState
            action={
              <button className="button button-primary" onClick={openCreateForm} type="button">
                Add candidate
              </button>
            }
            description={
              search
                ? 'No candidates match this search. Change the search or add a candidate.'
                : 'Add a candidate to include them in vacancy rankings.'
            }
            title={search ? 'No matching candidates' : 'No candidates yet'}
          />
        ) : (
          <>
            <CandidateTable
              candidates={candidates}
              onDelete={setCandidateToDelete}
              onEdit={openEditForm}
              onView={setDetailCandidate}
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
        title={editingCandidate === null ? 'Add candidate' : 'Edit candidate'}
      >
        {isFormOpen ? (
          <CandidateForm
            candidate={editingCandidate ?? undefined}
            key={editingCandidate?.id ?? 'new-candidate'}
            onCancel={closeForm}
            onSubmit={submitCandidate}
            submitLabel={editingCandidate === null ? 'Create candidate' : 'Save changes'}
          />
        ) : null}
      </Modal>

      <Modal
        isOpen={detailCandidate !== null}
        onClose={() => setDetailCandidate(null)}
        title="Candidate details"
      >
        {detailCandidate ? (
          <dl className="detail-list">
            <div>
              <dt>Name</dt>
              <dd>{detailCandidate.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{detailCandidate.email}</dd>
            </div>
            <div>
              <dt>Birth date</dt>
              <dd>{formatDate(detailCandidate.birthdate)}</dd>
            </div>
            <div>
              <dt>Gender</dt>
              <dd>{formatCandidateGender(detailCandidate.gender)}</dd>
            </div>
            <div>
              <dt>Current salary</dt>
              <dd>{formatNumber(detailCandidate.currentSalary)}</dd>
            </div>
          </dl>
        ) : null}
      </Modal>

      <Modal
        isOpen={candidateToDelete !== null}
        onClose={() => setCandidateToDelete(null)}
        title="Delete candidate"
      >
        {candidateToDelete ? (
          <>
            <p className="confirmation-copy">
              Delete {candidateToDelete.name}? This removes the candidate from future rankings.
            </p>
            <div className="confirmation-actions">
              <button
                className="button button-secondary"
                disabled={deleteMutation.isPending}
                onClick={() => setCandidateToDelete(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="button button-danger"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(candidateToDelete.id)}
                type="button"
              >
                {deleteMutation.isPending ? 'Deleting' : 'Delete candidate'}
              </button>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  );
};
