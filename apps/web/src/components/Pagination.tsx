import type { Pagination as PaginationModel } from '../api/types';

type PaginationProps = {
  readonly onPageChange: (page: number) => void;
  readonly pagination: PaginationModel;
};

export const Pagination = ({ onPageChange, pagination }: PaginationProps) => {
  if (pagination.totalPages <= 1) {
    return null;
  }

  return (
    <nav aria-label="Pagination" className="pagination">
      <span className="pagination-summary">
        Page {pagination.page} of {pagination.totalPages}
      </span>
      <div className="pagination-actions">
        <button
          aria-label="Go to previous page"
          className="button button-secondary button-compact"
          disabled={pagination.page === 1}
          onClick={() => onPageChange(pagination.page - 1)}
          type="button"
        >
          Previous
        </button>
        <button
          aria-label="Go to next page"
          className="button button-secondary button-compact"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
          type="button"
        >
          Next
        </button>
      </div>
    </nav>
  );
};
