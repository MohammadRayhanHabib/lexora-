import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiUsers,
  FiClock,
  FiMic,
  FiMessageSquare,
} from "react-icons/fi";
import {
  adminListSpeakingTests,
  adminDeleteSpeakingTest,
} from "../../../api/speaking";
import type { ISpeakingTest } from "../../../types";
import Button from "../../../components/ui/Button";
import Card, { CardBody } from "../../../components/ui/Card";
import { PageLoader } from "../../../components/ui/Spinner";
import Badge from "../../../components/ui/Badge";

const AdminSpeakingTests: React.FC = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState<ISpeakingTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTests = () => {
    setLoading(true);
    adminListSpeakingTests()
      .then((r) => setTests(r.data.data?.tests ?? []))
      .catch(() => toast.error("Failed to load speaking tests"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await adminDeleteSpeakingTest(id);
      toast.success("Speaking test deleted");
      fetchTests();
    } catch {
      toast.error("Failed to delete test");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <>
      <Helmet>
        <title>Speaking Tests – Admin – Lexora</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              IELTS Speaking Tests
            </h1>
            <p className="text-gray-500 mt-1">
              Manage IELTS computer-based speaking modules (3-part format)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => navigate("/admin/speaking/sessions")}
              className="gap-2"
            >
              <FiUsers className="w-4 h-4" />
              Review Sessions
            </Button>
            <Button
              onClick={() => navigate("/admin/speaking/new")}
              className="gap-2"
            >
              <FiPlus className="w-4 h-4" />
              New Speaking Test
            </Button>
          </div>
        </div>

        {/* Content */}
        {tests.length === 0 ? (
          <Card>
            <CardBody className="text-center py-16">
              <FiMic className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">
                No speaking tests yet
              </p>
              <p className="text-gray-400 mt-1">
                Create your first 3-part IELTS speaking test to get started.
              </p>
              <Button
                className="mt-6 gap-2"
                onClick={() => navigate("/admin/speaking/new")}
              >
                <FiPlus className="w-4 h-4" />
                Create Test
              </Button>
            </CardBody>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Cue Card Topic
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Questions
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tests.map((test) => (
                  <tr
                    key={test._id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {test.title}
                      </div>
                      {test.description && (
                        <div className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">
                          {test.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      <div className="flex items-center gap-1 max-w-xs">
                        <FiMessageSquare className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate text-xs">
                          {test.cueCardTopic || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      <div className="flex items-center gap-1">
                        <FiClock className="w-3.5 h-3.5 text-gray-400" />
                        {test.totalDuration ?? 15} min
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-700 text-xs">
                      <div>P1: {test.part1Questions?.length ?? 0}</div>
                      <div>P3: {test.part3Questions?.length ?? 0}</div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={test.isActive ? "success" : "gray"}>
                        {test.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            navigate(`/admin/speaking/${test._id}/edit`)
                          }
                          className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Edit test"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(test._id, test.title)}
                          disabled={deletingId === test._id}
                          className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                          title="Delete test"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
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

export default AdminSpeakingTests;
