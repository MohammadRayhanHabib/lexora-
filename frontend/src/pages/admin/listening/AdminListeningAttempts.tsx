import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { FiArrowLeft } from "react-icons/fi";
import { adminGetListeningAttempts } from "../../../api/listening";
import type { IListeningAttempt } from "../../../types";
import Button from "../../../components/ui/Button";
import Card, { CardBody } from "../../../components/ui/Card";
import { PageLoader } from "../../../components/ui/Spinner";
import Badge from "../../../components/ui/Badge";

const bandFromPercentage = (pct: number): string => {
  if (pct >= 97) return "9.0";
  if (pct >= 93) return "8.5";
  if (pct >= 87) return "8.0";
  if (pct >= 80) return "7.5";
  if (pct >= 72) return "7.0";
  if (pct >= 62) return "6.5";
  if (pct >= 52) return "6.0";
  if (pct >= 42) return "5.5";
  if (pct >= 32) return "5.0";
  if (pct >= 22) return "4.5";
  if (pct >= 12) return "4.0";
  return "3.5";
};

const AdminListeningAttempts: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<{
    attempts: IListeningAttempt[];
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    adminGetListeningAttempts(id)
      .then((r) => setData(r.data.data ?? null))
      .catch(() => toast.error("Failed to load attempts"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader />;

  const attempts = data?.attempts ?? [];

  return (
    <>
      <Helmet>
        <title>Attempts – Listening Test – Lexora Admin</title>
      </Helmet>

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/listening")}
          >
            <FiArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Student Attempts
            </h1>
            <p className="text-gray-500 text-sm">
              {data?.total ?? 0} total attempt
              {(data?.total ?? 0) !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {attempts.length === 0 ? (
          <Card>
            <CardBody className="text-center py-12">
              <p className="text-gray-500">
                No attempts yet for this listening test.
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    User ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Mode
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Band
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attempts.map((a) => (
                  <tr
                    key={a._id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-gray-600 max-w-32 truncate">
                      {a.userId}
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={a.mode === "exam" ? "danger" : "info"}>
                        {a.mode}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      {a.status === "submitted" ? (
                        <span className="font-medium">
                          {a.score}/{a.totalQuestions}
                          <span className="text-xs text-gray-400 ml-1">
                            ({a.percentage?.toFixed(0)}%)
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {a.status === "submitted" && a.percentage != null ? (
                        <span className="font-semibold text-indigo-600">
                          {bandFromPercentage(a.percentage)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Badge
                        variant={
                          a.status === "submitted"
                            ? "success"
                            : a.status === "in_progress"
                              ? "warning"
                              : "gray"
                        }
                      >
                        {a.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-gray-500 text-xs">
                      {a.status === "submitted"
                        ? new Date(a.updatedAt).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminListeningAttempts;
