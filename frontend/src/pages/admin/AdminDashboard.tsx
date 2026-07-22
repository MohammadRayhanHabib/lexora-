import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { adminApi } from "../../api/admin";
import Card, { CardBody } from "../../components/ui/Card";
import { PageLoader } from "../../components/ui/Spinner";
import {
  FiUsers,
  FiFileText,
  FiDollarSign,
  FiMessageSquare,
  FiBookOpen,
  FiCalendar,
  FiClipboard,
  FiActivity,
  FiBook,
  FiEdit,
  FiVideo,
  FiHeadphones,
  FiMic,
  FiGrid,
} from "react-icons/fi";

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getDashboardStats()
      .then((res) => setStats(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <>
      <Helmet>
        <title>Admin Dashboard – Lexora</title>
      </Helmet>

      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Platform overview and management</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<FiUsers />}
            label="Total Users"
            value={stats?.totalUsers ?? "–"}
            color="red"
          />
          <StatCard
            icon={<FiFileText />}
            label="Total Attempts"
            value={stats?.totalAttempts ?? "–"}
            color="green"
          />
          <StatCard
            icon={<FiDollarSign />}
            label="Revenue"
            value={stats?.totalRevenue ? `$${stats.totalRevenue}` : "–"}
            color="purple"
          />
          <StatCard
            icon={<FiClipboard />}
            label="Pending Reviews"
            value={stats?.pendingReviews ?? "–"}
            color="yellow"
          />
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminLink
            to="/admin/users"
            icon={<FiUsers />}
            label="User Management"
          />
          <AdminLink
            to="/admin/reviews"
            icon={<FiBookOpen />}
            label="Review Queue"
          />
          <AdminLink
            to="/admin/payments"
            icon={<FiDollarSign />}
            label="Payment Ledger"
          />
          <AdminLink
            to="/admin/support"
            icon={<FiMessageSquare />}
            label="Support Tickets"
          />
          <AdminLink
            to="/admin/bookings"
            icon={<FiCalendar />}
            label="Booking Management"
          />
          <AdminLink
            to="/admin/audit"
            icon={<FiActivity />}
            label="Audit Logs"
          />
          <AdminLink
            to="/admin/reading"
            icon={<FiBook />}
            label="Reading Tests"
          />
          <AdminLink
            to="/admin/writing"
            icon={<FiEdit />}
            label="Writing Modules"
          />
          <AdminLink
            to="/admin/courses"
            icon={<FiVideo />}
            label="Course Videos"
          />
          <AdminLink
            to="/admin/listening"
            icon={<FiHeadphones />}
            label="Listening Tests"
          />
          <AdminLink
            to="/admin/speaking"
            icon={<FiMic />}
            label="Speaking Tests"
          />
          <AdminLink
            to="/admin/mock-exam"
            icon={<FiGrid />}
            label="Mock Exams"
          />
        </div>
      </div>
    </>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: "red" | "green" | "purple" | "yellow";
}> = ({ icon, label, value, color }) => {
  const colors = {
    red: "bg-red-50 text-red-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    yellow: "bg-yellow-50 text-yellow-600",
  };
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <div className={`p-3 rounded-lg text-xl ${colors[color]}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </CardBody>
    </Card>
  );
};

const AdminLink: React.FC<{
  to: string;
  icon: React.ReactNode;
  label: string;
}> = ({ to, icon, label }) => (
  <Link to={to}>
    <Card hover>
      <CardBody className="flex items-center gap-3 py-5">
        <div className="text-primary-600 text-xl">{icon}</div>
        <span className="font-medium text-gray-900">{label}</span>
      </CardBody>
    </Card>
  </Link>
);

export default AdminDashboard;
