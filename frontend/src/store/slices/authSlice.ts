import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { authApi } from "../../api/auth";
import type {
  IUser,
  LoginPayload,
  RegisterPayload,
  VerifyOtpPayload,
} from "../../types";
import { getFingerprint } from "../../utils/security";

interface AuthState {
  user: IUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  otpSent: boolean;
  otpEmail: string | null;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem("lexora_token"),
  isAuthenticated: !!localStorage.getItem("lexora_token"),
  loading: false,
  otpSent: false,
  otpEmail: null,
  error: null,
};

/* ── Thunks ─────────────────────────────────────────── */
export const registerUser = createAsyncThunk(
  "auth/register",
  async (data: RegisterPayload, { rejectWithValue }) => {
    try {
      const res = await authApi.register(data);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "Registration failed",
      );
    }
  },
);

export const loginUser = createAsyncThunk(
  "auth/login",
  async (data: LoginPayload, { rejectWithValue }) => {
    try {
      const res = await authApi.login(data);
      return res.data.data;
    } catch (err: any) {
      const status = err.response?.status as number | undefined;
      if (!err.response) {
        return rejectWithValue(
          err.message?.includes("Network Error")
            ? "Cannot reach the server. Check your connection and that the site URL is correct."
            : err.message || "Login failed",
        );
      }
      if (status === 502 || status === 503) {
        return rejectWithValue(
          "API unavailable (bad gateway). Rebuild/restart the stack so the frontend container can reach the backend on the same Docker network.",
        );
      }
      return rejectWithValue(err.response?.data?.message || "Login failed");
    }
  },
);

export const verifyOtp = createAsyncThunk(
  "auth/verifyOtp",
  async (data: VerifyOtpPayload, { rejectWithValue }) => {
    try {
      const res = await authApi.verifyOtp(data);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "OTP verification failed",
      );
    }
  },
);

export const googleLogin = createAsyncThunk(
  "auth/googleLogin",
  async (idToken: string, { rejectWithValue }) => {
    try {
      const fingerprint = await getFingerprint().catch(
        () => "browser-fingerprint-unavailable",
      );
      const res = await authApi.googleAuth(idToken, fingerprint);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "Google login failed",
      );
    }
  },
);

export const fetchProfile = createAsyncThunk(
  "auth/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const res = await authApi.getProfile();
      return res.data.data;
    } catch (err: any) {
      // Pass the HTTP status so the reducer can decide whether to log out
      return rejectWithValue({
        status: err.response?.status ?? 0,
        message: err.response?.data?.message || "Failed to fetch profile",
      });
    }
  },
);

export const logoutUser = createAsyncThunk("auth/logout", async () => {
  try {
    await authApi.logout();
  } catch {
    /* ignore */
  }
});

/* ── Slice ──────────────────────────────────────────── */
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.otpSent = false;
      state.otpEmail = null;
      localStorage.removeItem("lexora_token");
    },
    resetOtp(state) {
      state.otpSent = false;
      state.otpEmail = null;
    },
  },
  extraReducers: (builder) => {
    /* register */
    builder.addCase(registerUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(registerUser.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(registerUser.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    /* login */
    builder.addCase(loginUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loginUser.fulfilled, (state, action) => {
      state.loading = false;
      const payload = action.payload as any;
      if (payload && "token" in payload) {
        // 2FA disabled – direct login
        state.token = payload.token;
        state.user = payload.user;
        state.isAuthenticated = true;
        localStorage.setItem("lexora_token", payload.token);
      } else {
        // 2FA enabled – show OTP form
        state.otpSent = true;
        state.otpEmail = payload.email;
      }
    });
    builder.addCase(loginUser.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    /* googleLogin */
    builder.addCase(googleLogin.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(
      googleLogin.fulfilled,
      (state, action: PayloadAction<{ token: string; user: IUser }>) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        localStorage.setItem("lexora_token", action.payload.token);
      },
    );
    builder.addCase(googleLogin.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    /* verifyOtp */
    builder.addCase(verifyOtp.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(
      verifyOtp.fulfilled,
      (state, action: PayloadAction<{ token: string; user: IUser }>) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.otpSent = false;
        state.otpEmail = null;
        localStorage.setItem("lexora_token", action.payload.token);
      },
    );
    builder.addCase(verifyOtp.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    /* fetchProfile */
    builder.addCase(
      fetchProfile.fulfilled,
      (state, action: PayloadAction<IUser>) => {
        state.user = action.payload;
      },
    );
    builder.addCase(fetchProfile.rejected, (state, action) => {
      const payload = action.payload as { status?: number } | undefined;
      // Only clear auth on a real 401 (invalid/expired token).
      // 429 (rate limit) or network errors must NOT log the user out.
      if (payload?.status === 401) {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        localStorage.removeItem("lexora_token");
      }
    });

    /* logout */
    builder.addCase(logoutUser.fulfilled, (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.otpSent = false;
      state.otpEmail = null;
      localStorage.removeItem("lexora_token");
    });
  },
});

export const { clearError, logout, resetOtp } = authSlice.actions;
export default authSlice.reducer;
