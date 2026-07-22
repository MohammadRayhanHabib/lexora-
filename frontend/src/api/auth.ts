import api from "./axios";
import type {
  LoginPayload,
  RegisterPayload,
  VerifyOtpPayload,
  ApiResponse,
  IUser,
} from "../types";

type LoginResponse =
  | { token: string; user: IUser }
  | { otpRequired: true; email: string };

export const authApi = {
  register: (data: RegisterPayload) =>
    api.post<ApiResponse<IUser>>("/auth/register", data),

  login: (data: LoginPayload) =>
    api.post<ApiResponse<LoginResponse>>("/auth/login", data),

  verifyOtp: (data: VerifyOtpPayload) =>
    api.post<ApiResponse<{ token: string; user: IUser }>>(
      "/auth/verify-otp",
      data,
    ),

  logout: () => api.post<ApiResponse>("/auth/logout"),

  getProfile: () => api.get<ApiResponse<IUser>>("/auth/profile"),

  updateProfile: (data: Partial<IUser>) =>
    api.put<ApiResponse<IUser>>("/auth/profile", data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put<ApiResponse>("/auth/change-password", data),

  toggle2fa: (enabled: boolean) =>
    api.put<ApiResponse<{ twoFactorEnabled: boolean }>>("/auth/toggle-2fa", {
      enabled,
    }),

  setup2fa: () =>
    api.post<ApiResponse<{ qrCodeUrl: string; secret: string }>>(
      "/auth/2fa/setup",
    ),

  verifySetup2fa: (token: string) =>
    api.post<ApiResponse<{ twoFactorEnabled: boolean }>>(
      "/auth/2fa/verify-setup",
      { token },
    ),

  uploadProfilePhoto: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("photo", file);
    const { data } = await api.post<ApiResponse<{ profileImage: string }>>(
      "/auth/profile/photo",
      formData,
    );
    return data.data!.profileImage;
  },

  removeProfilePhoto: async (): Promise<void> => {
    await api.delete("/auth/profile/photo");
  },

  googleAuth: (idToken: string, fingerprint?: string) =>
    api.post<ApiResponse<{ token: string; user: IUser }>>("/auth/google", {
      idToken,
      fingerprint,
    }),
};
