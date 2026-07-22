import api from "./axios";

const LISTENING_UPLOAD_TIMEOUT_MS = 5 * 60 * 1000; // large audio files

// ─── Admin ─────────────────────────────────────────────────────────────────

export const adminListListeningTests = (page = 1, limit = 20) =>
  api.get(`/listening/admin/tests?page=${page}&limit=${limit}`);

export const adminGetListeningTest = (id: string) =>
  api.get(`/listening/admin/tests/${id}`);

export const adminCreateListeningTest = (formData: FormData) =>
  api.post("/listening/admin/tests", formData, {
    timeout: LISTENING_UPLOAD_TIMEOUT_MS,
  });

export const adminUpdateListeningTest = (id: string, formData: FormData) =>
  api.put(`/listening/admin/tests/${id}`, formData, {
    timeout: LISTENING_UPLOAD_TIMEOUT_MS,
  });

/** Map image for listening map-labelling questions → object storage */
export const adminUploadListeningMapImage = (file: File) => {
  const fd = new FormData();
  fd.append("image", file);
  return api.post("/listening/admin/map-image", fd, {
    timeout: 120_000,
  });
};

export const adminDeleteListeningTest = (id: string) =>
  api.delete(`/listening/admin/tests/${id}`);

export const adminGetListeningAttempts = (testId: string) =>
  api.get(`/listening/admin/tests/${testId}/attempts`);

// ─── Student ───────────────────────────────────────────────────────────────

export const getActiveListeningTests = () => api.get("/listening/active");

export const getListeningTest = (id: string) =>
  api.get(`/listening/tests/${id}`);

export const startListeningAttempt = (
  testId: string,
  mode: "practice" | "exam",
) => api.post("/listening/start", { testId, mode });

export const getListeningTimer = (testId: string) =>
  api.get(`/listening/timer/${testId}`);

export const autosaveListeningAnswers = (
  testId: string,
  answers: Record<string, string>,
  opts?: { attemptId?: string; mode?: "practice" | "exam" },
) => api.post("/listening/autosave", { testId, answers, ...opts });

export const submitListeningAttempt = (
  testId: string,
  answers: Record<string, string>,
  opts?: { attemptId?: string; mode?: "practice" | "exam" },
) => api.post("/listening/submit", { testId, answers, ...opts });

export const getMyListeningAttempts = () => api.get("/listening/my-attempts");

export const getListeningAttemptDetail = (id: string) =>
  api.get(`/listening/attempts/${id}`);
