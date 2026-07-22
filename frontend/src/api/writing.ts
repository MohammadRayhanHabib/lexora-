import api from "./axios";
import type { ApiResponse } from "../types";

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum WritingTaskType {
  TASK1 = "task1",
  TASK2 = "task2",
}

export enum WritingSessionMode {
  PRACTICE = "practice",
  EXAM = "exam",
}

export enum WritingSessionStatus {
  ACTIVE = "active",
  PAUSED = "paused",
  SUBMITTED = "submitted",
  AUTO_SUBMITTED = "auto_submitted",
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface IWritingModule {
  _id: string;
  title: string;
  taskType: WritingTaskType;
  instruction: string;
  imageUrl?: string;
  duration: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface IWritingSession {
  _id: string;
  userId: string;
  moduleId: string;
  mode: WritingSessionMode;
  status: WritingSessionStatus;
  essayText?: string;
  wordCount: number;
  startTime: string;
  endTime?: string;
  remainingTime?: number;
  score?: number;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Admin API ────────────────────────────────────────────────────────────────

export const writingAdminApi = {
  listModules: () =>
    api.get<ApiResponse<IWritingModule[]>>("/writing/admin/modules"),

  getModule: (id: string) =>
    api.get<ApiResponse<IWritingModule>>(`/writing/admin/modules/${id}`),

  createModule: (data: FormData) =>
    api.post<ApiResponse<IWritingModule>>("/writing/admin/modules", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  updateModule: (id: string, data: FormData) =>
    api.put<ApiResponse<IWritingModule>>(`/writing/admin/modules/${id}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  deleteModule: (id: string) =>
    api.delete<ApiResponse<{ message: string }>>(
      `/writing/admin/modules/${id}`,
    ),

  getSubmissions: (moduleId: string) =>
    api.get<ApiResponse<IWritingSession[]>>(
      `/writing/admin/modules/${moduleId}/submissions`,
    ),

  getSubmission: (sessionId: string) =>
    api.get<ApiResponse<IWritingSession>>(
      `/writing/admin/submissions/${sessionId}`,
    ),

  scoreSession: (sessionId: string, score: number, feedback: string) =>
    api.post<ApiResponse<IWritingSession>>(
      `/writing/admin/submissions/${sessionId}/score`,
      { score, feedback },
    ),
};

// ─── Student API ──────────────────────────────────────────────────────────────

export const writingApi = {
  listModules: (taskType?: WritingTaskType) =>
    api.get<ApiResponse<IWritingModule[]>>("/writing/modules", {
      params: taskType ? { taskType } : {},
    }),

  getModule: (id: string) =>
    api.get<ApiResponse<IWritingModule>>(`/writing/modules/${id}`),

  startSession: (moduleId: string, mode: WritingSessionMode) =>
    api.post<ApiResponse<IWritingSession>>("/writing/sessions", {
      moduleId,
      mode,
    }),

  getSession: (sessionId: string) =>
    api.get<ApiResponse<IWritingSession>>(`/writing/sessions/${sessionId}`),

  getTimer: (sessionId: string) =>
    api.get<ApiResponse<{ remainingSeconds: number }>>(
      `/writing/sessions/${sessionId}/timer`,
    ),

  getDraft: (sessionId: string) =>
    api.get<ApiResponse<{ essayText: string; wordCount: number }>>(
      `/writing/sessions/${sessionId}/draft`,
    ),

  autoSave: (sessionId: string, essayText: string) =>
    api.post<ApiResponse<{ wordCount: number }>>(
      `/writing/sessions/${sessionId}/autosave`,
      { essayText },
    ),

  pause: (sessionId: string) =>
    api.post<ApiResponse<IWritingSession>>(
      `/writing/sessions/${sessionId}/pause`,
    ),

  resume: (sessionId: string) =>
    api.post<ApiResponse<IWritingSession>>(
      `/writing/sessions/${sessionId}/resume`,
    ),

  submit: (sessionId: string, essayText: string) =>
    api.post<ApiResponse<IWritingSession>>(
      `/writing/sessions/${sessionId}/submit`,
      { essayText },
    ),

  getHistory: () =>
    api.get<ApiResponse<IWritingSession[]>>("/writing/sessions/history"),
};
