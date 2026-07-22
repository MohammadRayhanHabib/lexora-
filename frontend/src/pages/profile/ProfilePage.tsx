import React, { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { useAppSelector, useAppDispatch } from "../../hooks/useAppStore";
import { fetchProfile } from "../../store/slices/authSlice";
import { authApi } from "../../api/auth";
import { PageLoader } from "../../components/ui/Spinner";
import {
  FiUser,
  FiShield,
  FiCamera,
  FiLock,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";

function splitName(full: string): [string, string] {
  const idx = full.indexOf(" ");
  if (idx === -1) return [full, ""];
  return [full.slice(0, idx), full.slice(idx + 1)];
}

type Tab = "personal" | "security";

interface FieldProps {
  label: string;
  value: string;
  editing: boolean;
  type?: string;
  disabled?: boolean;
  onChange?: (v: string) => void;
  placeholder?: string;
}

const Field: React.FC<FieldProps> = ({
  label, value, editing, type = "text", disabled = false, onChange, placeholder,
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-gray-500">{label}</label>
    <input
      type={type}
      value={value}
      disabled={!editing || disabled}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-lg border px-3.5 py-2.5 text-sm transition-colors outline-none ${
        !editing || disabled
          ? "border-gray-200 bg-gray-50 text-gray-700 cursor-default"
          : "border-gray-300 bg-white text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
      }`}
    />
  </div>
);

const PasswordField: React.FC<{
  label: string; value: string; editing: boolean;
  onChange: (v: string) => void; placeholder?: string;
}> = ({ label, value, editing, onChange, placeholder }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          disabled={!editing}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm transition-colors outline-none ${
            !editing
              ? "border-gray-200 bg-gray-50 text-gray-700 cursor-default"
              : "border-gray-300 bg-white text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          }`}
        />
        {editing && (
          <button type="button" onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {show ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
};

const ProfilePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, loading } = useAppSelector((s) => s.auth);
  const [tab, setTab] = useState<Tab>("personal");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", country: "", website: "" });
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [pwForm, setPwForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [changingPw, setChangingPw] = useState(false);
  const [toggling2fa, setToggling2fa] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [totpToken, setTotpToken] = useState("");
  const [verifyingTotp, setVerifyingTotp] = useState(false);

  useEffect(() => { dispatch(fetchProfile()); }, [dispatch]);

  useEffect(() => {
    if (user) {
      const [first, last] = splitName(user.name || "");
      setForm({
        firstName: first, lastName: last,
        phone: (user as any).phone || "",
        country: (user as any).country || "",
        website: (user as any).website || "",
      });
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim()) { toast.error("First name is required"); return; }
    setSaving(true);
    try {
      await authApi.updateProfile({
        name: [form.firstName, form.lastName].filter(Boolean).join(" "),
        phone: form.phone || undefined,
        country: form.country || undefined,
        website: form.website || undefined,
      });
      toast.success("Profile updated!");
      setEditing(false);
      dispatch(fetchProfile());
    } catch (err: any) { toast.error(err.response?.data?.message || "Update failed"); }
    setSaving(false);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File too large. Max 5 MB."); return; }
    setPhotoUploading(true);
    try {
      await authApi.uploadProfilePhoto(file);
      toast.success("Profile photo updated!");
      dispatch(fetchProfile());
    } catch (err: any) { toast.error(err.response?.data?.message || "Upload failed"); }
    setPhotoUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleRemovePhoto = async () => {
    setPhotoUploading(true);
    try { await authApi.removeProfilePhoto(); toast.success("Profile photo removed"); dispatch(fetchProfile()); }
    catch { toast.error("Failed to remove photo"); }
    setPhotoUploading(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error("Passwords do not match"); return; }
    if (pwForm.newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setChangingPw(true);
    try {
      await authApi.changePassword({ currentPassword: pwForm.oldPassword, newPassword: pwForm.newPassword });
      toast.success("Password changed!");
      setPwForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) { toast.error(err.response?.data?.message || "Failed to change password"); }
    setChangingPw(false);
  };

  const handleToggle2fa = async () => {
    if (!user) return;
    if ((user as any).twoFactorEnabled) {
      setToggling2fa(true);
      try { await authApi.toggle2fa(false); toast.success("2FA disabled"); dispatch(fetchProfile()); }
      catch (err: any) { toast.error(err.response?.data?.message || "Failed to disable 2FA"); }
      setToggling2fa(false);
    } else {
      setToggling2fa(true);
      try {
        const res = await authApi.setup2fa();
        setQrCodeUrl(res.data.data!.qrCodeUrl);
        setTotpToken("");
        setQrModalOpen(true);
      } catch (err: any) { toast.error(err.response?.data?.message || "Failed to start 2FA setup"); }
      setToggling2fa(false);
    }
  };

  const handleVerifySetup2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyingTotp(true);
    try {
      await authApi.verifySetup2fa(totpToken);
      toast.success("2FA enabled!");
      setQrModalOpen(false);
      dispatch(fetchProfile());
    } catch (err: any) { toast.error(err.response?.data?.message || "Invalid code. Try again."); }
    setVerifyingTotp(false);
  };

  if (loading || !user) return <PageLoader />;

  const avatarSrc = (user as any).profileImage || null;
  const [firstName, lastName] = splitName(user.name || "");
  const isTwoFactorEnabled = !!(user as any).twoFactorEnabled;

  return (
    <>
      <Helmet><title>Profile – Lexora</title></Helmet>

      <div className="max-w-2xl mx-auto">
        {/* Tab bar */}
        <div className="flex border-b border-gray-200 mb-6">
          {(["personal", "security"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                tab === t ? "border-primary-600 text-primary-700" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {t === "personal" ? <FiUser className="h-4 w-4" /> : <FiShield className="h-4 w-4" />}
              {t === "personal" ? "Personal Info" : "Security"}
            </button>
          ))}
        </div>

        {/* PERSONAL INFO TAB */}
        {tab === "personal" && (
          <div className="space-y-5">
            {/* Profile Photo */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-5">
                <div className="relative shrink-0">
                  <div className="h-20 w-20 rounded-full bg-gray-200 overflow-hidden ring-4 ring-white shadow">
                    {avatarSrc
                      ? <img src={avatarSrc} alt="Profile" className="h-full w-full object-cover" />
                      : <div className="h-full w-full flex items-center justify-center bg-primary-100 text-primary-600 text-2xl font-bold">
                          {(user.name || "U")[0].toUpperCase()}
                        </div>
                    }
                  </div>
                  {photoUploading && (
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 mb-0.5">Profile Photo</p>
                  <p className="text-xs text-gray-500 mb-3">Upload a new profile picture. JPG or PNG, max 5MB.</p>
                  <div className="flex items-center gap-3">
                    <button type="button" disabled={photoUploading} onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                      <FiCamera className="h-3.5 w-3.5" /> Upload Photo
                    </button>
                    {avatarSrc && (
                      <button type="button" disabled={photoUploading} onClick={handleRemovePhoto}
                        className="text-sm text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
            </div>

            {/* Personal Information */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-bold text-gray-900 tracking-wide">Personal Information</h2>
                {!editing
                  ? <button onClick={() => setEditing(true)} className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors">Edit</button>
                  : <button
                      onClick={() => {
                        setEditing(false);
                        const [f, l] = splitName(user.name || "");
                        setForm({ firstName: f, lastName: l, phone: (user as any).phone || "", country: (user as any).country || "", website: (user as any).website || "" });
                      }}
                      className="text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
                }
              </div>
              <form onSubmit={handleSave}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="First Name" value={editing ? form.firstName : firstName} editing={editing} onChange={(v) => setForm({ ...form, firstName: v })} placeholder="First name" />
                  <Field label="Last Name" value={editing ? form.lastName : lastName} editing={editing} onChange={(v) => setForm({ ...form, lastName: v })} placeholder="Last name" />
                  <Field label="Email Address" value={user.email} editing={false} disabled />
                  <Field label="Phone Number" value={editing ? form.phone : ((user as any).phone || "")} editing={editing} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+1 (555) 000-0000" />
                  <Field label="Location" value={editing ? form.country : ((user as any).country || "")} editing={editing} onChange={(v) => setForm({ ...form, country: v })} placeholder="City, Country" />
                  <Field label="Website" value={editing ? form.website : ((user as any).website || "")} editing={editing} onChange={(v) => setForm({ ...form, website: v })} placeholder="www.yoursite.com" />
                  <div className="sm:col-span-2">
                    <PasswordField label="Password" value="••••••••••" editing={false} onChange={() => {}} />
                  </div>
                </div>
                {editing && (
                  <div className="mt-5 flex justify-end">
                    <button type="submit" disabled={saving}
                      className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-60">
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* SECURITY TAB */}
        {tab === "security" && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <FiLock className="h-4 w-4 text-primary-600" />
                <h2 className="text-sm font-bold text-gray-900 tracking-wide">Change Password</h2>
              </div>
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
                {([
                  ["Current Password", "oldPassword"],
                  ["New Password", "newPassword"],
                  ["Confirm New Password", "confirmPassword"],
                ] as [string, keyof typeof pwForm][]).map(([label, key]) => (
                  <div key={key} className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">{label}</label>
                    <input type="password" value={pwForm[key]} onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })} required
                      className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
                  </div>
                ))}
                <button type="submit" disabled={changingPw}
                  className="mt-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-60">
                  {changingPw ? "Updating…" : "Update Password"}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <FiShield className="h-4 w-4 text-primary-600" />
                <h2 className="text-sm font-bold text-gray-900 tracking-wide">Two-Factor Authentication</h2>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Google Authenticator (TOTP)</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {isTwoFactorEnabled
                      ? "You'll be asked for a 6-digit code from your authenticator app each time you sign in."
                      : "Enable to require a Google Authenticator code when signing in."}
                  </p>
                  <p className="text-xs mt-2">
                    {isTwoFactorEnabled
                      ? <span className="text-green-600 font-medium">✓ 2FA is ON — protected</span>
                      : <span className="text-gray-400">2FA is OFF — enable for extra security</span>}
                  </p>
                </div>
                <button onClick={handleToggle2fa} disabled={toggling2fa}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    isTwoFactorEnabled ? "bg-primary-600" : "bg-gray-200"
                  } ${toggling2fa ? "opacity-50 cursor-not-allowed" : ""}`}
                  role="switch" aria-checked={isTwoFactorEnabled}>
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${isTwoFactorEnabled ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiShield className="h-5 w-5 text-primary-600" />
              <h3 className="text-base font-semibold">Set Up Google Authenticator</h3>
            </div>
            <ol className="text-sm text-gray-600 space-y-1.5 mb-4 list-decimal list-inside">
              <li>Install <strong>Google Authenticator</strong> on your phone.</li>
              <li>Tap <strong>+</strong> → <strong>Scan a QR code</strong>.</li>
              <li>Scan the QR code below.</li>
              <li>Enter the 6-digit code to confirm.</li>
            </ol>
            {qrCodeUrl && (
              <div className="flex justify-center mb-5">
                <img src={qrCodeUrl} alt="TOTP QR Code" className="rounded-lg border border-gray-200" width={192} height={192} />
              </div>
            )}
            <form onSubmit={handleVerifySetup2fa} className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">6-digit code</label>
                <input type="text" inputMode="numeric" value={totpToken}
                  onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000" maxLength={6} required
                  className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-center tracking-[0.5em] font-mono outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setQrModalOpen(false)} disabled={verifyingTotp}
                  className="flex-1 rounded-lg border-2 border-gray-200 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60">
                  Cancel
                </button>
                <button type="submit" disabled={verifyingTotp || totpToken.length !== 6}
                  className="flex-1 rounded-lg bg-primary-600 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors disabled:opacity-60">
                  {verifyingTotp ? "Verifying…" : "Activate 2FA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfilePage;
