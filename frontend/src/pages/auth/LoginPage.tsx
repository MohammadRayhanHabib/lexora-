import React, { useState, useEffect } from "react";
import Lottie from "lottie-react";
import rocketAnimation from "../../assets/rocket-loader.json";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { GoogleLogin } from "@react-oauth/google";
import { useAppDispatch, useAppSelector } from "../../hooks/useAppStore";
import {
  loginUser,
  verifyOtp,
  clearError,
  resetOtp,
  googleLogin,
} from "../../store/slices/authSlice";
import { FiMail, FiLock, FiShield } from "react-icons/fi";
import { getFingerprint } from "../../utils/security";

/* ── Cloud SVG decoration ───────────────────────────── */
const Cloud: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 120 70"
    fill="white"
    className={`opacity-80 ${className}`}
    xmlns="http://www.w3.org/2000/svg"
  >
    <ellipse cx="60" cy="50" rx="55" ry="22" />
    <ellipse cx="35" cy="38" rx="28" ry="22" />
    <ellipse cx="75" cy="35" rx="32" ry="24" />
    <ellipse cx="55" cy="28" rx="22" ry="18" />
  </svg>
);

/* ── Styled auth input ──────────────────────────────── */
const AuthInput: React.FC<{
  type?: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ReactNode;
  required?: boolean;
  maxLength?: number;
}> = ({
  type = "text",
  placeholder,
  value,
  onChange,
  icon,
  required,
  maxLength,
}) => (
  <div className="relative">
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      maxLength={maxLength}
      className="w-full rounded-xl border-2 border-gray-200 px-4 py-3.5 pr-12 text-sm text-gray-700 placeholder-gray-400
        focus:outline-none focus:border-primary-400 focus:ring-0 transition-colors bg-white"
    />
    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
      {icon}
    </span>
  </div>
);

/* ── Main component ─────────────────────────────────── */
const LoginPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error, otpSent, otpEmail, isAuthenticated } = useAppSelector(
    (s) => s.auth,
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [googleButtonWidth, setGoogleButtonWidth] = useState(360);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || "";
  const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(
    window.location.hostname,
  );
  const canUseGoogleSignIn =
    Boolean(googleClientId) && (window.isSecureContext || isLocalhost);

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard");
  }, [isAuthenticated, navigate]);
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);
  useEffect(() => {
    const updateWidth = () => {
      const availableWidth = window.innerWidth - 48;
      setGoogleButtonWidth(Math.max(280, Math.min(360, availableWidth)));
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const fingerprint = await getFingerprint().catch(
      () => "browser-fingerprint-unavailable",
    );
    dispatch(loginUser({ email, password, fingerprint }));
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fingerprint = await getFingerprint().catch(
      () => "browser-fingerprint-unavailable",
    );
    const result = await dispatch(
      verifyOtp({ email: otpEmail!, otp, fingerprint }),
    );
    if (verifyOtp.fulfilled.match(result)) {
      toast.success("Login successful!");
      navigate("/dashboard");
    }
  };

  return (
    <>
      <Helmet>
        <title>Sign In – Lexora</title>
      </Helmet>

      <div className="min-h-screen flex bg-white">
        {/* ── LEFT GRADIENT PANEL ── */}
        <div
          className="hidden lg:flex flex-col relative w-[42%] shrink-0 overflow-hidden
          bg-gradient-to-br from-[#F79191] via-[#E25858] to-[#7C3030]"
        >
          {/* Cloud decorations */}
          <Cloud className="absolute -left-6 -top-4 w-44" />
          <Cloud className="absolute right-4 top-10 w-32" />
          <Cloud className="absolute -left-4 bottom-24 w-40 rotate-6" />
          <Cloud className="absolute right-2 bottom-16 w-36" />

          {/* Logo */}
          <div className="relative z-10 flex items-center gap-2.5 p-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm shrink-0">
              <span className="text-xs font-black text-white">LO</span>
            </div>
            <div className="leading-tight">
              <span className="block text-[11px] font-black tracking-widest text-white uppercase">
                Lexora
              </span>
              <span className="block text-[9px] font-semibold tracking-widest text-white/70 uppercase">
                Academy
              </span>
            </div>
          </div>

          {/* Illustration */}
          <div className="flex-1 flex flex-col items-center justify-center relative z-10">
            <Lottie
              animationData={rocketAnimation}
              loop
              style={{ width: 240, height: 240 }}
            />
            <p className="text-white/70 text-sm font-medium mt-2">
              Your IELTS journey starts here
            </p>
          </div>
        </div>

        {/* ── RIGHT FORM PANEL ── */}
        <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
          <div className="w-full max-w-md">
            {/* Header line */}
            <div className="border-b-2 border-primary-600 pb-3 mb-8">
              <h1 className="text-2xl font-bold text-gray-900">
                Account Sign In
              </h1>
            </div>

            {!otpSent ? (
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-6">
                  Welcome Back
                </h2>

                {/* Google SSO */}
                <div className="mb-5">
                  {canUseGoogleSignIn ? (
                    <GoogleLogin
                      onSuccess={(credentialResponse) => {
                        if (credentialResponse.credential) {
                          dispatch(googleLogin(credentialResponse.credential));
                        }
                      }}
                      onError={() => toast.error("Google sign-in failed")}
                      useOneTap={false}
                      width={googleButtonWidth}
                      text="signin_with"
                      shape="rectangular"
                      theme="outline"
                      size="large"
                    />
                  ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      Google sign-in requires HTTPS and a configured Google
                      client ID. Password login is still available here.
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-semibold text-gray-400 tracking-widest">
                    OR
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <AuthInput
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    icon={<FiMail className="h-4.5 w-4.5" />}
                    required
                  />
                  <AuthInput
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    icon={<FiLock className="h-4.5 w-4.5" />}
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-primary-800 py-3.5 text-sm font-bold text-white hover:bg-primary-900 transition-colors disabled:opacity-60 mt-2"
                  >
                    {loading ? "Signing in…" : "Sign In"}
                  </button>
                </form>

                <p className="text-center text-sm text-gray-500 mt-5">
                  Don&apos;t have an account?{" "}
                  <Link
                    to="/register"
                    className="font-semibold text-primary-600 hover:text-primary-700"
                  >
                    Create one
                  </Link>
                </p>
              </>
            ) : (
              /* ── TOTP form ── */
              <>
                <h2 className="text-lg font-bold text-gray-800 mb-2">
                  Two-Factor Authentication
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  Open <strong>Google Authenticator</strong> and enter the
                  6-digit code for <strong>Lexora</strong>.
                </p>
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="h-12 w-12 rounded-full bg-primary-50 flex items-center justify-center">
                      <FiShield className="h-6 w-6 text-primary-600" />
                    </div>
                  </div>
                  <AuthInput
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    icon={<FiShield className="h-4 w-4" />}
                    required
                    maxLength={6}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-primary-800 py-3.5 text-sm font-bold text-white hover:bg-primary-900 transition-colors disabled:opacity-60"
                  >
                    {loading ? "Verifying…" : "Verify & Sign In"}
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch(resetOtp())}
                    className="w-full text-sm text-gray-500 hover:text-gray-700"
                  >
                    &larr; Back to login
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
