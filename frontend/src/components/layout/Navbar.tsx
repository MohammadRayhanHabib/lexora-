import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../hooks/useAppStore";
import { logoutUser } from "../../store/slices/authSlice";
import { UserRole } from "../../types";
import {
  FiHome,
  FiBookOpen,
  FiFileText,
  FiDollarSign,
  FiUser,
  FiLogOut,
  FiHelpCircle,
  FiVideo,
  FiCalendar,
  FiShield,
} from "react-icons/fi";

const Navbar: React.FC = () => {
  const { user, isAuthenticated } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate("/login");
  };

  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Lexora</span>
          </Link>

          {/* Nav links */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-1">
              <NavLink to="/dashboard" icon={<FiHome />} label="Dashboard" />
              <NavLink to="/practice" icon={<FiBookOpen />} label="Practice" />
              <NavLink
                to="/mock-tests"
                icon={<FiFileText />}
                label="Mock Tests"
              />
              <NavLink to="/courses" icon={<FiVideo />} label="Courses" />
              <NavLink to="/bookings" icon={<FiCalendar />} label="1-on-1" />
              <NavLink to="/payments" icon={<FiDollarSign />} label="Credits" />
              <NavLink to="/support" icon={<FiHelpCircle />} label="Support" />
              {isAdmin && (
                <NavLink to="/admin" icon={<FiShield />} label="Admin" />
              )}
            </nav>
          )}

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {user && (
                  <div className="hidden sm:flex items-center gap-2 mr-2">
                    <span className="text-sm text-gray-500">Credits:</span>
                    <span className="text-sm font-semibold text-primary-600">
                      {user.creditBalance}
                    </span>
                  </div>
                )}
                <Link
                  to="/profile"
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <FiUser className="h-5 w-5" />
                  <span className="hidden sm:inline text-sm font-medium">
                    {user?.name}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-red-600 transition-colors p-2"
                  title="Logout"
                >
                  <FiLogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

const NavLink: React.FC<{
  to: string;
  icon: React.ReactNode;
  label: string;
}> = ({ to, icon, label }) => (
  <Link
    to={to}
    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200"
  >
    {icon}
    {label}
  </Link>
);

export default Navbar;
