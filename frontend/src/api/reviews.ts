import api from "./axios";
import type { ApiResponse, IReviewRequest, IReviewFeedback } from "../types";

export const reviewApi = {
  requestReview: (data: { attemptId: string; module: string }) =>
    api.post<ApiResponse<IReviewRequest>>("/reviews/request", data),

  getMyReviews: () => api.get<ApiResponse<IReviewRequest[]>>("/reviews/my"),

  getFeedback: (reviewRequestId: string) =>
    api.get<ApiResponse<IReviewFeedback>>(
      `/reviews/${reviewRequestId}/feedback`,
    ),
};
