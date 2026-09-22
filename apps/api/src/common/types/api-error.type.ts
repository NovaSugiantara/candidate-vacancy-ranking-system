export type ApiFieldError = {
  readonly field: string;
  readonly message: string;
};

export type ApiError = {
  readonly statusCode: number;
  readonly message: string;
  readonly errors: readonly ApiFieldError[];
  readonly timestamp: string;
  readonly path: string;
};
