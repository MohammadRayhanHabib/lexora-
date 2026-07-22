import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  writingAdminApi,
  type IWritingSession,
  WritingSessionStatus,
  WritingSessionMode,
} from "../../../api/writing";
import Card, { CardBody } from "../../../components/ui/Card";
import Badge from "../../../components/ui/Badge";
import { PageLoader } from "../../../components/ui/Spinner";
import { FiEye, FiArrowLeft } from "react-icons/fi";

const statusVariant = (
  status: WritingSessionStatus,
): "success" | "warning" | "danger" | "info" | "gray" => {
  switch (status) {
    case WritingSessionStatus.SUBMITTED:
      return "success";
    case WritingSessionStatus.AUTO_SUBMITTED:
      return "warning";
    case WritingSessionStatus.ACTIVE:
      return "info";
    case WritingSessionStatus.PAUSED:
      return "gray";
    default:
      return "gray";
  }
};

const AdminWritingSubmissions: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [sessions, setSessions] = useState<IWritingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!moduleId) return;
    writingAdminApi
      .getSubmissions(moduleId)
      .then((res) => setSessions(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [moduleId]);

  if (loading) return <PageLoader />;

  return (
    <>
      <Helmet>
        <title>Writing Submissions – Admin – Lexora</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/writing"
            className="text-gray-500 hover:text-gray-700"
          >
            <FiArrowLeft className="text-xl" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Student Submissions
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              All writing sessions for this module
            </p>
          </div>
        </div>

        {sessions.length === 0 ? (
          <Card>
            <CardBody className="py-16 text-center text-gray-500">
              No submissions yet.
            </CardBody>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      User ID
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Mode
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Words
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Score
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Submitted At
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Review
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sessions.map((s) => (
                    <tr key={s._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {s.userId.slice(-8)}…
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            s.mode === WritingSessionMode.EXAM
                              ? "danger"
                              : "info"
                          }
                        >
                          {s.mode}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{s.wordCount}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(s.status)}>
                          {s.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {s.score !== undefined ? (
                          <span className="font-semibold text-primary-700">
                            {s.score} / 9
                          </span>
                        ) : (
                          <span className="text-gray-400">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {s.endTime ? new Date(s.endTime).toLocaleString() : "–"}
                      </td>
                      <td className="px-4 py-3">
                        {(s.status === WritingSessionStatus.SUBMITTED ||
                          s.status === WritingSessionStatus.AUTO_SUBMITTED) && (
                          <Link
                            to={`/admin/writing/review/${s._id}`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <FiEye />
                            Review
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  );
};

export default AdminWritingSubmissions;
