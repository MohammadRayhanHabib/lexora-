import React, { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../hooks/useAppStore";
import { logoutUser } from "../../store/slices/authSlice";
import { UserRole } from "../../types";
import {
  FiHome,
  FiFileText,
  FiBookOpen,
  FiVideo,
  FiCalendar,
  FiUser,
  FiLogOut,
  FiBell,
  FiSettings,
  FiSearch,
  FiShield,
  FiMenu,
} from "react-icons/fi";

/* ── page title map ─────────────────────────────────── */
const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/mock-tests": "Mock Tests",
  "/practice": "Practice",
  "/courses": "Courses",
  "/bookings": "Schedule",
  "/schedule": "Schedule",
  "/profile": "Profile",
  "/payments": "Credits",
  "/support": "Support",
  "/admin": "Admin",
  "/admin/courses": "Course Videos",
};

export const IELTS_TYPES = [
  { label: "IELTS", sub: "Academic" },
  { label: "IELTS", sub: "General" },
  { label: "UKVI", sub: "Academic" },
  { label: "UKVI", sub: "General" },
] as const;

export interface MainLayoutOutletContext {
  practiceExamVariant: (typeof IELTS_TYPES)[number];
}

const MainLayout: React.FC = () => {
  const { user } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [search, setSearch] = useState("");
  const [ieltsType, setIeltsType] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;
  const pageTitle = PAGE_TITLES[location.pathname] ?? "Lexora";

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-[#fef2f2]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ════════ SIDEBAR ════════ */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-[240px] flex flex-col
          bg-white lg:rounded-3xl lg:m-4 lg:h-[calc(100vh-32px)]
          shadow-sm transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 shrink-0">
            <span className="text-xs font-black text-white">LO</span>
          </div>
          <div className="leading-tight">
            <span className="block text-[11px] font-black tracking-widest text-primary-600 uppercase">
              Lexora
            </span>
            <span className="block text-[9px] font-semibold tracking-widest text-gray-400 uppercase">
              Academy
            </span>
          </div>
        </div>

        {/* IELTS type grid */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-1.5">
            {IELTS_TYPES.map((t, i) => (
              <button
                key={i}
                onClick={() => setIeltsType(i)}
                className={`rounded-lg px-2 py-1.5 text-center transition-all ${
                  ieltsType === i
                    ? "bg-primary-50 ring-1 ring-primary-300"
                    : "bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <span
                  className={`block text-[10px] font-bold ${ieltsType === i ? "text-primary-600" : "text-gray-700"}`}
                >
                  {t.label}
                </span>
                <span
                  className={`block text-[9px] ${ieltsType === i ? "text-primary-400" : "text-gray-400"}`}
                >
                  {t.sub}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mx-5 border-t border-gray-100 mb-2" />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
          <SideNavItem
            to="/dashboard"
            icon={<FiHome />}
            label="Dashboard"
            active={location.pathname === "/dashboard"}
          />
          <SideNavItem
            to="/mock-tests"
            icon={<FiFileText />}
            label="Mock Test"
            active={location.pathname.startsWith("/mock")}
          />
          <SideNavItem
            to="/practice"
            icon={<FiBookOpen />}
            label="Practice"
            active={location.pathname.startsWith("/practice")}
          />
          <SideNavItem
            to="/courses"
            icon={<FiVideo />}
            label="Courses"
            active={location.pathname.startsWith("/courses")}
          />
          <SideNavItem
            to="/schedule"
            icon={<FiCalendar />}
            label="Schedule"
            active={location.pathname.startsWith("/schedule")}
          />
          <SideNavItem
            to="/profile"
            icon={<FiUser />}
            label="Profile"
            active={location.pathname.startsWith("/profile")}
          />
          {isAdmin && (
            <SideNavItem
              to="/admin"
              icon={<FiShield />}
              label="Admin"
              active={location.pathname.startsWith("/admin")}
            />
          )}
        </nav>

        {/* Upgrade card */}
        <div className="mx-4 mb-5 mt-3 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 p-4 text-center">
          <p className="text-sm font-bold text-white mb-1">Upgrade your Plan</p>
          <p className="text-[10px] text-primary-200 mb-3 leading-snug">
            Explore our new features
            <br />
            by subscribing our package
          </p>
          <Link
            to="/payments"
            className="inline-block rounded-lg bg-white px-4 py-1.5 text-xs font-bold text-primary-700 hover:bg-primary-50 transition-colors"
          >
            Get Pro Now
          </Link>
        </div>
      </aside>

      {/* ════════ MAIN AREA ════════ */}
      <div className="flex-1 flex flex-col lg:ml-[calc(240px+32px)] min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center gap-3 px-4 lg:px-6 py-4 bg-[#fef2f2]">
          <button
            className="lg:hidden p-2 rounded-lg bg-white shadow-sm text-gray-600"
            onClick={() => setSidebarOpen(true)}
          >
            <FiMenu className="h-5 w-5" />
          </button>

          <h2 className="text-xl font-bold text-gray-900 shrink-0">
            {pageTitle}
          </h2>

          {/* Search */}
          <div className="flex-1 max-w-sm hidden sm:block">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full bg-white border border-gray-100 pl-9 pr-10 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-300 shadow-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Bell */}
            <button className="relative h-9 w-9 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-500 hover:text-primary-600 transition-colors">
              <FiBell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary-500 ring-2 ring-white" />
            </button>
            {/* Settings */}
            <button className="h-9 w-9 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-500 hover:text-primary-600 transition-colors">
              <FiSettings className="h-4 w-4" />
            </button>
            {/* Avatar */}
            <div
              className="h-9 w-9 rounded-full bg-gradient-to-br from-rose-300 to-primary-500 flex items-center justify-center shadow-sm cursor-pointer overflow-hidden"
              onClick={() => navigate("/profile")}
              title={user?.name ?? "Profile"}
            >
              <span className="text-sm font-bold text-white">
                {user?.name?.charAt(0).toUpperCase() ?? "U"}
              </span>
            </div>
            {/* Logout */}
            <button
              onClick={handleLogout}
              className="h-9 w-9 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-400 hover:text-red-500 transition-colors"
              title="Logout"
            >
              <FiLogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 lg:px-6 pb-8">
          <Outlet
            context={{
              practiceExamVariant: IELTS_TYPES[ieltsType],
            } satisfies MainLayoutOutletContext}
          />
        </main>
      </div>
    </div>
  );
};

/* ── Sidebar nav item ───────────────────────────────── */
const SideNavItem: React.FC<{
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}> = ({ to, icon, label, active }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
      active
        ? "bg-primary-600 text-white shadow-sm"
        : "text-gray-500 hover:bg-primary-50 hover:text-primary-700"
    }`}
  >
    <span className={`shrink-0 ${active ? "text-white" : "text-gray-400"}`}>
      {icon}
    </span>
    {label}
  </Link>
);

export default MainLayout;
