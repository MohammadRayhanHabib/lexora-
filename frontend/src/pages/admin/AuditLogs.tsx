import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { adminApi } from "../../api/admin";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { PageLoader } from "../../components/ui/Spinner";
import { FiActivity } from "react-icons/fi";

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadLogs();
  }, [page]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAuditLogs(page, 100);
      setLogs(res.data.data);
      setTotal(res.data.pagination?.total ?? 0);
    } catch {
      toast.error("Failed to load audit logs");
    }
    setLoading(false);
  };

  if (loading && logs.length === 0) return <PageLoader />;

  return (
    <>
      <Helmet>
        <title>Audit Logs – Admin – Lexora</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FiActivity className="h-6 w-6 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Action
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    User
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Resource
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    IP
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log: any) => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {log.action}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {log.userId || "—"}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {log.resourceType}{" "}
                      {log.resourceId ? `#${log.resourceId}` : ""}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-gray-500">
                      {log.ipAddress || "—"}
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      No audit logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {total > 100 && (
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
              Page {page}
            </span>
            <Button
              size="sm"
              variant="secondary"
              disabled={page * 100 >= total}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default AuditLogs;
