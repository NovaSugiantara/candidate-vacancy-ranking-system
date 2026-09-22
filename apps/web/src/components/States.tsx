import type { ReactNode } from 'react';

import { ApiError } from '../api/client';

type EmptyStateProps = {
  readonly action?: ReactNode;
  readonly description: string;
  readonly title: string;
};

type ErrorStateProps = {
  readonly error: unknown;
  readonly onRetry: () => void;
};

type SkeletonProps = {
  readonly rows?: number;
};

export const Skeleton = ({ rows = 5 }: SkeletonProps) => (
  <div aria-busy="true" aria-label="Loading content" className="skeleton-stack" role="status">
    {Array.from({ length: rows }, (_, index) => (
      <div className="skeleton-line" key={`skeleton-${index}`} />
    ))}
  </div>
);

export const EmptyState = ({ action, description, title }: EmptyStateProps) => (
  <section className="state-panel" aria-labelledby="empty-state-title">
    <h2 id="empty-state-title">{title}</h2>
    <p>{description}</p>
    {action ? <div className="state-action">{action}</div> : null}
  </section>
);

export const ErrorState = ({ error, onRetry }: ErrorStateProps) => {
  const message =
    error instanceof ApiError
      ? error.message
      : 'The requested data could not be loaded. Please try again.';

  return (
    <section className="state-panel state-error" aria-labelledby="error-state-title" role="alert">
      <h2 id="error-state-title">Unable to load this view</h2>
      <p>{message}</p>
      <div className="state-action">
        <button className="button button-secondary" onClick={onRetry} type="button">
          Try again
        </button>
      </div>
    </section>
  );
};
