import api from "./axios";
import type {
  ApiResponse,
  PaginatedResponse,
  IPracticeTest,
  IMockTest,
  IAttempt,
} from "../types";

export const testApi = {
  /* Practice */
  listPracticeTests: (module?: string) =>
    api.get<ApiResponse<IPracticeTest[]>>("/tests/practice", {
      params: { module },
    }),

  getPracticeTest: (id: string) =>
    api.get<ApiResponse<IPracticeTest>>(`/tests/practice/${id}`),

  startPractice: (data: { testId: string; module: string }) =>
    api.post<ApiResponse<IAttempt>>("/tests/practice/start", data),

  submitPractice: (attemptId: string, data: { answers: any }) =>
    api.post<ApiResponse<IAttempt>>(
      `/tests/practice/${attemptId}/submit`,
      data,
    ),

  /* Mock */
  listMockTests: () => api.get<ApiResponse<IMockTest[]>>("/tests/mock"),

  getMockTest: (id: string) =>
    api.get<ApiResponse<IMockTest>>(`/tests/mock/${id}`),

  startMock: (data: { testId: string }) =>
    api.post<ApiResponse<IAttempt>>("/tests/mock/start", data),

  submitMock: (attemptId: string, data: { answers: any }) =>
    api.post<ApiResponse<IAttempt>>(`/tests/mock/${attemptId}/submit`, data),

  /* Attempts */
  getAttempt: (id: string) =>
    api.get<ApiResponse<IAttempt>>(`/tests/attempts/${id}`),

  getMyAttempts: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<IAttempt>>("/tests/attempts", {
      params: { page, limit },
    }),

  getRecentAttempts: (testId: string) =>
    api.get<ApiResponse<IAttempt[]>>(`/tests/practice/${testId}/recent`),
};
