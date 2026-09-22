import { apiClient, parseEntityResponse, parsePaginatedResponse } from './client';
import {
  rankingSchema,
  vacancySchema,
  type ListQuery,
  type PaginatedResponse,
  type Ranking,
  type RankingQuery,
  type Vacancy,
  type VacancyInput,
} from './types';

export const listVacancies = async (
  query: ListQuery,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Vacancy>> => {
  const response = await apiClient.get<unknown>('/vacancies', {
    params: query,
    signal,
  });

  return parsePaginatedResponse(response.data, vacancySchema);
};

export const getVacancy = async (id: string, signal?: AbortSignal): Promise<Vacancy> => {
  const response = await apiClient.get<unknown>(`/vacancies/${id}`, { signal });

  return parseEntityResponse(response.data, vacancySchema);
};

export const createVacancy = async (input: VacancyInput): Promise<Vacancy> => {
  const response = await apiClient.post<unknown>('/vacancies', input);

  return parseEntityResponse(response.data, vacancySchema);
};

export const updateVacancy = async (id: string, input: VacancyInput): Promise<Vacancy> => {
  const response = await apiClient.patch<unknown>(`/vacancies/${id}`, input);

  return parseEntityResponse(response.data, vacancySchema);
};

export const deleteVacancy = async (id: string): Promise<void> => {
  await apiClient.delete(`/vacancies/${id}`);
};

export const getRanking = async (
  vacancyId: string,
  query: RankingQuery,
  signal?: AbortSignal,
): Promise<Ranking> => {
  const response = await apiClient.get<unknown>(`/vacancies/${vacancyId}/ranking`, {
    params: query,
    signal,
  });

  return parseEntityResponse(response.data, rankingSchema);
};
