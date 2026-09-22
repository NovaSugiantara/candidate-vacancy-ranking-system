import { apiClient, parseEntityResponse, parsePaginatedResponse } from './client';
import {
  candidateSchema,
  type Candidate,
  type CandidateInput,
  type ListQuery,
  type PaginatedResponse,
} from './types';

export const listCandidates = async (
  query: ListQuery,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Candidate>> => {
  const response = await apiClient.get<unknown>('/candidates', {
    params: query,
    signal,
  });

  return parsePaginatedResponse(response.data, candidateSchema);
};

export const getCandidate = async (id: string, signal?: AbortSignal): Promise<Candidate> => {
  const response = await apiClient.get<unknown>(`/candidates/${id}`, { signal });

  return parseEntityResponse(response.data, candidateSchema);
};

export const createCandidate = async (input: CandidateInput): Promise<Candidate> => {
  const response = await apiClient.post<unknown>('/candidates', input);

  return parseEntityResponse(response.data, candidateSchema);
};

export const updateCandidate = async (id: string, input: CandidateInput): Promise<Candidate> => {
  const response = await apiClient.patch<unknown>(`/candidates/${id}`, input);

  return parseEntityResponse(response.data, candidateSchema);
};

export const deleteCandidate = async (id: string): Promise<void> => {
  await apiClient.delete(`/candidates/${id}`);
};
