import api from "./axios";
import type {
  ApiResponse,
  PaginatedResponse,
  IUser,
  IAttempt,
  IPayment,
  ICreditLedger,
  IReviewRequest,
  ISupportTicket,
  IBooking,
} from "../types";

export const adminApi = {
  /* Users */
  listUsers: (page = 1, limit = 50, role?: string) =>
    api.get<PaginatedResponse<IUser>>("/admin/users", {
      params: { page, limit, role },
    }),

  updateUserStatus: (userId: string, status: string) =>
    api.put<ApiResponse<IUser>>(`/admin/users/${userId}/status`, { status }),

  updateUserRole: (userId: string, role: string) =>
    api.put<ApiResponse<IUser>>(`/admin/users/${userId}/role`, { role }),

  /* Subscriptions */
  manageSubscription: (
    userId: string,
    data: { action: string; plan?: string; days?: number },
  ) => api.put<ApiResponse>(`/admin/users/${userId}/subscription`, data),

  /* Reviews */
  getReviewQueue: (status?: string) =>
    api.get<ApiResponse<IReviewRequest[]>>("/admin/reviews/queue", {
      params: { status },
    }),

  assignReviewer: (reviewId: string, reviewerId: string) =>
    api.put<ApiResponse>(`/admin/reviews/${reviewId}/assign`, { reviewerId }),

  /* Attempts */
  getUserAttempts: (userId: string) =>
    api.get<ApiResponse<IAttempt[]>>(`/admin/users/${userId}/attempts`),

  /* Payments */
  getAllPayments: (page = 1, limit = 50) =>
    api.get<PaginatedResponse<IPayment>>("/admin/payments", {
      params: { page, limit },
    }),

  getPaymentLedger: (userId: string) =>
    api.get<ApiResponse<ICreditLedger[]>>(`/admin/users/${userId}/credits`),

  manualCreditAdjustment: (data: {
    userId: string;
    amount: number;
    action: "add" | "deduct";
    reason: string;
  }) => api.post<ApiResponse>("/admin/credits/adjust", data),

  /* Support */
  getAllTickets: (status?: string) =>
    api.get<ApiResponse<ISupportTicket[]>>("/admin/support/tickets", {
      params: { status },
    }),

  /* Bookings */
  getAllBookings: (status?: string) =>
    api.get<PaginatedResponse<IBooking>>("/bookings/admin/all", {
      params: { status },
    }),

  confirmBooking: (
    id: string,
    data: { confirmedDate: string; confirmedTimeSlot: string },
  ) => api.put<ApiResponse<IBooking>>(`/bookings/${id}/confirm`, data),

  completeBooking: (id: string) =>
    api.put<ApiResponse<IBooking>>(`/bookings/${id}/complete`),

  /* Dashboard */
  getDashboardStats: () => api.get<ApiResponse<any>>("/admin/dashboard"),

  /* Audit */
  getAuditLogs: (page = 1, limit = 100) =>
    api.get<PaginatedResponse<any>>("/admin/audit-logs", {
      params: { page, limit },
    }),

  /* Notifications */
  sendNotification: (data: {
    userId: string;
    subject: string;
    message: string;
  }) => api.post<ApiResponse>("/admin/notify", data),

  sendBulkNotification: (data: {
    subject: string;
    message: string;
    role?: string;
  }) => api.post<ApiResponse>("/admin/notify/bulk", data),
};
