import api from "./axios";
import type { ApiResponse, IPayment, ICreditLedger } from "../types";

export const paymentApi = {
  createPayment: (data: {
    transactionId: string;
    amount: number;
    currency?: string;
    method: string;
    packageType: string;
    packageId: string;
  }) => api.post<ApiResponse<IPayment>>("/payments/create", data),

  verifyPayment: (data: { paymentId: string; gatewayRef: string }) =>
    api.post<ApiResponse<IPayment>>("/payments/verify", data),

  getMyPayments: (page = 1, limit = 20) =>
    api.get<ApiResponse<IPayment[]>>("/payments/my", {
      params: { page, limit },
    }),

  getCreditLedger: (page = 1, limit = 50) =>
    api.get<ApiResponse<ICreditLedger[]>>("/payments/credits", {
      params: { page, limit },
    }),
};
