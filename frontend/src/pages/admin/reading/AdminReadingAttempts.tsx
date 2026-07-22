import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { FiArrowLeft } from "react-icons/fi";
import { readingApi, IReadingAttempt } from "../../../api/reading";
import { PageLoader } from "../../../components/ui/Spinner";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import Card, { CardBody } from "../../../components/ui/Card";

const AdminReadingAttempts: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<{
    attempts: IReadingAttempt[];
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!testId) return;
    readingApi
      .adminGetAttempts(testId)
      .then((r) => setData(r.data.data ?? null))
      .catch(() => toast.error("Failed to load attempts"))
      .finally(() => setLoading(false));
  }, [testId]);

  if (loading) return <PageLoader />;

  const attempts = data?.attempts ?? [];

  return (
    <>
      <Helmet>
        <title>Attempts – Reading Test – Lexora Admin</title>
      </Helmet>

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/reading")}
          >
            <FiArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Student Attempts
            </h1>
            <p className="text-gray-500 text-sm">
              {data?.total ?? 0} total attempts
            </p>
          </div>
        </div>

        {attempts.length === 0 ? (
          <Card>
            <CardBody className="text-center py-12">
              <p className="text-gray-500">
                No attempts yet for this reading test.
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
                    Score
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Band
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Started
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
                    <td className="px-4 py-4 text-gray-900 font-medium">
                      {a.status === "completed"
                        ? `${a.score}/${a.totalScore}`
                        : "–"}
                    </td>
                    <td className="px-4 py-4">
                      {a.bandScore != null ? (
                        <span
                          className={`font-bold ${
                            a.bandScore >= 7
                              ? "text-green-600"
                              : a.bandScore >= 5
                                ? "text-yellow-600"
                                : "text-red-500"
                          }`}
                        >
                          {a.bandScore.toFixed(1)}
                        </span>
                      ) : (
                        "–"
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Badge
                        variant={
                          a.status === "completed"
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
                      {new Date(a.startedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-gray-500 text-xs">
                      {a.submittedAt
                        ? new Date(a.submittedAt).toLocaleString()
                        : "–"}
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

export default AdminReadingAttempts;
