import axios, { CanceledError } from 'axios';
import { z } from 'zod';

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string;
  }
}

export type ApiFieldError = {
  readonly field: string;
  readonly message: string;
};

export class ApiError extends Error {
  readonly statusCode: number;
  readonly fieldErrors: readonly ApiFieldError[];

  constructor(statusCode: number, message: string, fieldErrors: readonly ApiFieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.fieldErrors = fieldErrors;
  }
}

const errorEnvelopeSchema = z.object({
  statusCode: z.number(),
  message: z.string(),
  errors: z
    .array(
      z.object({
        field: z.string(),
        message: z.string(),
      }),
    )
    .default([]),
  timestamp: z.string(),
  path: z.string(),
});

export const apiClient = axios.create({
  // The env var is build-time config; without the fallback an unset value makes
  // axios emit relative paths, which nginx answers with index.html instead of proxying.
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown): Promise<never> => {
    if (error instanceof CanceledError || axios.isCancel(error)) {
      return Promise.reject(error);
    }

    if (axios.isAxiosError(error)) {
      const envelope = errorEnvelopeSchema.safeParse(error.response?.data);

      if (envelope.success) {
        return Promise.reject(
          new ApiError(envelope.data.statusCode, envelope.data.message, envelope.data.errors),
        );
      }

      return Promise.reject(
        new ApiError(
          error.response?.status ?? 0,
          error.message || 'The request could not be completed.',
        ),
      );
    }

    return Promise.reject(error);
  },
);

export const parseEntityResponse = <T>(payload: unknown, schema: z.ZodType<T>): T => {
  const directResult = schema.safeParse(payload);

  if (directResult.success) {
    return directResult.data;
  }

  const wrappedResult = z.object({ data: schema }).safeParse(payload);

  if (wrappedResult.success) {
    return wrappedResult.data.data;
  }

  throw new ApiError(502, 'The API returned an unexpected response.');
};

export const parsePaginatedResponse = <T>(
  payload: unknown,
  itemSchema: z.ZodType<T>,
): {
  readonly data: readonly T[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
} => {
  const envelopeSchema = z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
    }),
  });
  const directResult = envelopeSchema.safeParse(payload);

  if (directResult.success) {
    return directResult.data;
  }

  const wrappedResult = z.object({ data: envelopeSchema }).safeParse(payload);

  if (wrappedResult.success) {
    return wrappedResult.data.data;
  }

  throw new ApiError(502, 'The API returned an unexpected list response.');
};
