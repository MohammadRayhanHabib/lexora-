import api from "./axios";

// ─── Admin ─────────────────────────────────────────────────────────────────

export const adminListSpeakingTests = (page = 1, limit = 20) =>
  api.get(`/speaking/admin/tests?page=${page}&limit=${limit}`);

export const adminGetSpeakingTest = (id: string) =>
  api.get(`/speaking/admin/tests/${id}`);

export const adminCreateSpeakingTest = (data: object) =>
  api.post("/speaking/admin/tests", data);

export const adminUpdateSpeakingTest = (id: string, data: object) =>
  api.put(`/speaking/admin/tests/${id}`, data);

export const adminDeleteSpeakingTest = (id: string) =>
  api.delete(`/speaking/admin/tests/${id}`);

export const adminListSpeakingSessions = (testId?: string) =>
  api.get(`/speaking/admin/sessions${testId ? `?testId=${testId}` : ""}`);

export const adminGetSpeakingSession = (id: string) =>
  api.get(`/speaking/admin/sessions/${id}`);

export const adminScoreSpeakingSession = (
  id: string,
  data: {
    score: number;
    feedback: string;
    partScores: { part1?: number; part2?: number; part3?: number };
  },
) => api.post(`/speaking/admin/sessions/${id}/score`, data);

// ─── Student ───────────────────────────────────────────────────────────────

export const getActiveSpeakingTests = () => api.get("/speaking/active");

export const getSpeakingTest = (id: string) => api.get(`/speaking/tests/${id}`);

export const startSpeakingSession = (
  testId: string,
  mode: "practice" | "exam",
) => api.post("/speaking/start", { testId, mode });

export const getSpeakingTimer = (testId: string) =>
  api.get(`/speaking/timer/${testId}`);

export const setPartTimer = (
  testId: string,
  part: number,
  durationSeconds: number,
) => api.post("/speaking/part-timer", { testId, part, durationSeconds });

export const getPartTimer = (testId: string, part: number) =>
  api.get(`/speaking/part-timer/${testId}/${part}`);

export const uploadSpeakingAudio = (
  formData: FormData,
  onUploadProgress?: (progress: number) => void,
) =>
  api.post("/speaking/upload-audio", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (onUploadProgress && e.total) {
        onUploadProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });

export const submitSpeakingSession = (testId: string) =>
  api.post("/speaking/submit", { testId });

export const getMySpeakingSessions = () => api.get("/speaking/my-sessions");

export const getSpeakingSessionDetail = (id: string) =>
  api.get(`/speaking/sessions/${id}`);
