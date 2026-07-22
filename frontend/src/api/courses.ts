import api from "./axios";
import type {
  ApiResponse,
  IBooking,
  ICourseNote,
  ICourseVideo,
} from "../types";

export const courseApi = {
  listVideos: (category?: string) =>
    api.get<ApiResponse<ICourseVideo[]>>("/courses/videos", {
      params: { category },
    }),

  getVideo: (id: string) =>
    api.get<ApiResponse<ICourseVideo>>(`/courses/videos/${id}`),

  streamVideo: (id: string) =>
    api.get<ApiResponse<{ streamUrl: string }>>(`/courses/videos/${id}/stream`),

  purchaseVideo: (videoId: string, transactionId: string) =>
    api.post<ApiResponse>(`/courses/videos/${videoId}/purchase`, {
      paymentId: transactionId,
    }),

  getMyPurchasedVideos: () =>
    api.get<ApiResponse<ICourseVideo[]>>("/courses/purchased"),

  adminListVideos: () =>
    api.get<ApiResponse<ICourseVideo[]>>("/courses/admin/videos"),

  adminCreateVideo: (data: FormData) =>
    api.post<ApiResponse<ICourseVideo>>("/courses/videos", data),

  adminUpdateVideo: (id: string, data: FormData) =>
    api.put<ApiResponse<ICourseVideo>>(`/courses/videos/${id}`, data),

  adminDeleteVideo: (id: string) =>
    api.delete<ApiResponse>(`/courses/videos/${id}`),

  getVideoNotes: (id: string) =>
    api.get<ApiResponse<ICourseNote[]>>(`/courses/videos/${id}/notes`),

  createVideoNote: (
    id: string,
    data: { content: string; videoTimestamp?: number },
  ) => api.post<ApiResponse<ICourseNote>>(`/courses/videos/${id}/notes`, data),

  deleteVideoNote: (noteId: string) =>
    api.delete<ApiResponse>(`/courses/notes/${noteId}`),
};

export const bookingApi = {
  createBooking: (data: {
    preferredDate: string;
    preferredTimeSlot: string;
    notes?: string;
    transactionId: string;
  }) => api.post<ApiResponse<IBooking>>("/bookings", data),

  getMyBookings: () => api.get<ApiResponse<IBooking[]>>("/bookings"),

  getBooking: (id: string) => api.get<ApiResponse<IBooking>>(`/bookings/${id}`),

  cancelBooking: (id: string) =>
    api.put<ApiResponse<IBooking>>(`/bookings/${id}/cancel`),
};
