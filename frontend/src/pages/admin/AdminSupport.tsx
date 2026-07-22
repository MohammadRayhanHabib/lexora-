import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { adminApi } from "../../api/admin";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";

import { PageLoader } from "../../components/ui/Spinner";
import type { ISupportTicket } from "../../types";
import { TicketStatus } from "../../types";

const AdminSupport: React.FC = () => {
  const [tickets, setTickets] = useState<ISupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    loadTickets();
  }, [statusFilter]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAllTickets(statusFilter || undefined);
      setTickets(res.data.data);
    } catch {
      toast.error("Failed to load tickets");
    }
    setLoading(false);
  };

  if (loading && tickets.length === 0) return <PageLoader />;

  return (
    <>
      <Helmet>
        <title>Support Tickets – Admin – Lexora</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {Object.values(TicketStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Subject
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Category
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    User
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Messages
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tickets.map((t) => (
                  <tr key={t._id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {t.subject}
                    </td>
                    <td className="px-6 py-3 capitalize text-gray-600">
                      {t.category}
                    </td>
                    <td className="px-6 py-3 text-gray-600">{t.userId}</td>
                    <td className="px-6 py-3">
                      <Badge
                        variant={
                          t.status === TicketStatus.RESOLVED ||
                          t.status === TicketStatus.CLOSED
                            ? "success"
                            : t.status === TicketStatus.OPEN
                              ? "warning"
                              : "info"
                        }
                      >
                        {t.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {t.messages.length}
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {tickets.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      No tickets found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
};

export default AdminSupport;
