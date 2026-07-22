import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { adminApi } from "../../api/admin";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import { PageLoader } from "../../components/ui/Spinner";
import type { IUser } from "../../types";
import { UserRole, UserStatus } from "../../types";
import { FiSearch, FiEdit2, FiShield, FiDollarSign } from "react-icons/fi";

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  /* Modal state */
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const [modalMode, setModalMode] = useState<
    "status" | "role" | "credit" | null
  >(null);
  const [modalValue, setModalValue] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDesc, setCreditDesc] = useState("");
  const [creditAction, setCreditAction] = useState<"add" | "deduct">("add");

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, roleFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.listUsers(page, 50, roleFilter || undefined);
      setUsers(res.data.data);
      setTotal(res.data.pagination?.total ?? 0);
    } catch {
      toast.error("Failed to load users");
    }
    setLoading(false);
  };

  const handleUpdateStatus = async () => {
    if (!selectedUser || !modalValue) return;
    try {
      await adminApi.updateUserStatus(selectedUser._id, modalValue);
      toast.success("User status updated");
      setModalMode(null);
      loadUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed");
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !modalValue) return;
    try {
      await adminApi.updateUserRole(selectedUser._id, modalValue);
      toast.success("User role updated");
      setModalMode(null);
      loadUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed");
    }
  };

  const handleCreditAdjust = async () => {
    if (!selectedUser || !creditAmount) return;
    const parsedAmount = parseInt(creditAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Amount must be a positive number");
      return;
    }
    try {
      await adminApi.manualCreditAdjustment({
        userId: selectedUser._id,
        amount: parsedAmount,
        action: creditAction,
        reason: creditDesc || "Admin adjustment",
      });
      toast.success(
        `Credits ${creditAction === "add" ? "added" : "deducted"} successfully`,
      );
      setModalMode(null);
      loadUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed");
    }
  };

  const filteredUsers = search
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()),
      )
    : users;

  if (loading && users.length === 0) return <PageLoader />;

  return (
    <>
      <Helmet>
        <title>User Management – Admin – Lexora</title>
      </Helmet>

      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          >
            <option value="">All Roles</option>
            {Object.values(UserRole).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Role
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Credits
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-3 text-gray-600">{user.email}</td>
                    <td className="px-6 py-3">
                      <Badge variant="info">{user.role}</Badge>
                    </td>
                    <td className="px-6 py-3">
                      <Badge
                        variant={
                          user.status === UserStatus.ACTIVE
                            ? "success"
                            : user.status === UserStatus.SUSPENDED
                              ? "warning"
                              : "danger"
                        }
                      >
                        {user.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 font-medium">
                      {user.creditBalance}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setModalValue(user.status);
                            setModalMode("status");
                          }}
                          className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors"
                          title="Change Status"
                        >
                          <FiEdit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setModalValue(user.role);
                            setModalMode("role");
                          }}
                          className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors"
                          title="Change Role"
                        >
                          <FiShield className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setCreditAmount("");
                            setCreditDesc("");
                            setCreditAction("add");
                            setModalMode("credit");
                          }}
                          className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors"
                          title="Adjust Credits"
                        >
                          <FiDollarSign className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Pagination */}
        {total > 50 && (
          <div className="flex justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="px-3 py-1.5 text-sm text-gray-600">
              Page {page} of {Math.ceil(total / 50)}
            </span>
            <Button
              size="sm"
              variant="secondary"
              disabled={page * 50 >= total}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Status modal */}
      <Modal
        isOpen={modalMode === "status"}
        onClose={() => setModalMode(null)}
        title="Update User Status"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">User: {selectedUser?.name}</p>
          <select
            value={modalValue}
            onChange={(e) => setModalValue(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {Object.values(UserStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Button onClick={handleUpdateStatus} fullWidth>
            Update Status
          </Button>
        </div>
      </Modal>

      {/* Role modal */}
      <Modal
        isOpen={modalMode === "role"}
        onClose={() => setModalMode(null)}
        title="Update User Role"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">User: {selectedUser?.name}</p>
          <select
            value={modalValue}
            onChange={(e) => setModalValue(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {Object.values(UserRole).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <Button onClick={handleUpdateRole} fullWidth>
            Update Role
          </Button>
        </div>
      </Modal>

      {/* Credit modal */}
      <Modal
        isOpen={modalMode === "credit"}
        onClose={() => setModalMode(null)}
        title="Adjust Credits"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            User: {selectedUser?.name} (Current: {selectedUser?.creditBalance})
          </p>
          {/* Add / Deduct toggle */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Action
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCreditAction("add")}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                  creditAction === "add"
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                + Add Credits
              </button>
              <button
                type="button"
                onClick={() => setCreditAction("deduct")}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                  creditAction === "deduct"
                    ? "bg-red-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                − Deduct Credits
              </button>
            </div>
          </div>
          <Input
            label="Amount"
            type="number"
            value={creditAmount}
            onChange={(e) => setCreditAmount(e.target.value)}
            placeholder="e.g. 5"
          />
          <Input
            label="Reason"
            value={creditDesc}
            onChange={(e) => setCreditDesc(e.target.value)}
            placeholder="Reason for adjustment"
          />
          <Button
            onClick={handleCreditAdjust}
            fullWidth
            variant={creditAction === "add" ? "primary" : "danger"}
          >
            {creditAction === "add" ? "Add Credits" : "Deduct Credits"}
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default UserManagement;
