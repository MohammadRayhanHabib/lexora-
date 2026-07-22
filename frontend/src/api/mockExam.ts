import api from "./axios";
import type { ApiResponse } from "../types";

// ─── Interfaces ────────────────────────────────────────────────

export interface IMockExam {
  _id: string;
  title: string;
  description?: string;
  listeningTestId?: string;
  readingPart1Id?: string;
  readingPart2Id?: string;
  readingPart3Id?: string;
  writingTask1Id?: string;
  writingTask2Id?: string;
  speakingTestId?: string;
  listeningDuration: number;
  readingDuration: number;
  writingDuration: number;
  speakingDuration: number;
  isActive: boolean;
  examType?: "mock" | "practice";
  academicNumber?: number;
  testNumber?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type MockExamAttemptStatus =
  | "in_progress"
  | "listening_done"
  | "reading_done"
  | "writing_done"
  | "completed";

export interface IMockExamAttempt {
  _id: string;
  userId: string;
  examId: string;
  status: MockExamAttemptStatus;
  // Section attempt IDs
  listeningAttemptId?: string;
  readingAttempt1Id?: string;
  readingAttempt2Id?: string;
  readingAttempt3Id?: string;
  writingSessionId?: string;
  speakingSessionId?: string;
  // Auto-graded
  listeningScore?: number;
  listeningTotalScore?: number;
  listeningBand?: number;
  readingScore?: number;
  readingTotalScore?: number;
  readingBand?: number;
  // Manual grades
  writingBand?: number;
  writingTask1Band?: number;
  writingTask2Band?: number;
  writingFeedback?: string;
  writingReviewedAt?: string;
  speakingBand?: number;
  speakingPart1Band?: number;
  speakingPart2Band?: number;
  speakingPart3Band?: number;
  speakingFeedback?: string;
  speakingReviewedAt?: string;
  // Result
  overallBand?: number;
  resultPublishedAt?: string;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
}

export interface IMockExamAnalytics {
  totalAttempts: number;
  completedAttempts: number;
  avgListeningBand: number | null;
  avgReadingBand: number | null;
  avgWritingBand: number | null;
  avgSpeakingBand: number | null;
  avgOverallBand: number | null;
  pendingWritingReviews: number;
  pendingSpeakingReviews: number;
  publishedResults: number;
}

// ─── API ───────────────────────────────────────────────────────

export const mockExamApi = {
  // ── Admin ──────────────────────────────────────────────

  adminListExams: (page = 1, limit = 50) =>
    api.get<ApiResponse<{ exams: IMockExam[]; total: number }>>(
      "/mock-exam/admin/exams",
      { params: { page, limit } },
    ),

  adminGetExam: (id: string) =>
    api.get<ApiResponse<IMockExam>>(`/mock-exam/admin/exams/${id}`),

  adminCreateExam: (data: Partial<IMockExam>) =>
    api.post<ApiResponse<IMockExam>>("/mock-exam/admin/exams", data),

  adminUpdateExam: (id: string, data: Partial<IMockExam>) =>
    api.put<ApiResponse<IMockExam>>(`/mock-exam/admin/exams/${id}`, data),

  adminDeleteExam: (id: string) =>
    api.delete<ApiResponse<null>>(`/mock-exam/admin/exams/${id}`),

  adminListAttempts: (params?: {
    examId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get<ApiResponse<{ attempts: IMockExamAttempt[]; total: number }>>(
      "/mock-exam/admin/attempts",
      { params },
    ),

  adminGetPendingReviews: () =>
    api.get<ApiResponse<IMockExamAttempt[]>>(
      "/mock-exam/admin/attempts/pending",
    ),

  adminGetAttempt: (id: string) =>
    api.get<ApiResponse<IMockExamAttempt>>(`/mock-exam/admin/attempts/${id}`),

  adminGradeWriting: (
    id: string,
    data: {
      writingBand: number;
      writingTask1Band?: number;
      writingTask2Band?: number;
      writingFeedback?: string;
    },
  ) =>
    api.post<ApiResponse<IMockExamAttempt>>(
      `/mock-exam/admin/attempts/${id}/grade-writing`,
      data,
    ),

  adminGradeSpeaking: (
    id: string,
    data: {
      speakingBand: number;
      speakingPart1Band?: number;
      speakingPart2Band?: number;
      speakingPart3Band?: number;
      speakingFeedback?: string;
    },
  ) =>
    api.post<ApiResponse<IMockExamAttempt>>(
      `/mock-exam/admin/attempts/${id}/grade-speaking`,
      data,
    ),

  adminPublishResult: (id: string) =>
    api.post<ApiResponse<IMockExamAttempt>>(
      `/mock-exam/admin/attempts/${id}/publish`,
    ),

  adminGetAnalytics: (examId?: string) =>
    api.get<ApiResponse<IMockExamAnalytics>>("/mock-exam/admin/analytics", {
      params: examId ? { examId } : undefined,
    }),

  // ── Student ────────────────────────────────────────────

  listExams: () =>
    api.get<ApiResponse<IMockExam[]>>("/mock-exam/exams"),

  getExam: (id: string) =>
    api.get<ApiResponse<IMockExam>>(`/mock-exam/exams/${id}`),

  startAttempt: (examId: string) =>
    api.post<ApiResponse<{ attempt: IMockExamAttempt; resumed: boolean }>>(
      `/mock-exam/exams/${examId}/attempt`,
    ),

  updateAttempt: (
    id: string,
    patch: Partial<IMockExamAttempt> & { status?: string },
  ) =>
    api.patch<ApiResponse<IMockExamAttempt>>(
      `/mock-exam/attempts/${id}`,
      patch,
    ),

  getAttempt: (id: string) =>
    api.get<ApiResponse<IMockExamAttempt>>(`/mock-exam/attempts/${id}`),

  myAttempts: () =>
    api.get<ApiResponse<IMockExamAttempt[]>>("/mock-exam/my-attempts"),
};
