import api from "./axios";
import type { ApiResponse, ISupportTicket } from "../types";

export const supportApi = {
  createTicket: (data: {
    subject: string;
    category: string;
    message: string;
  }) => api.post<ApiResponse<ISupportTicket>>("/support/tickets", data),

  getMyTickets: () =>
    api.get<ApiResponse<ISupportTicket[]>>("/support/tickets"),

  getTicket: (id: string) =>
    api.get<ApiResponse<ISupportTicket>>(`/support/tickets/${id}`),

  replyToTicket: (id: string, data: { message: string }) =>
    api.post<ApiResponse<ISupportTicket>>(`/support/tickets/${id}/reply`, data),
};
