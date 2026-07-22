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
  FiVolume2,
  FiFileText,
  FiSearch,
} from "react-icons/fi";
import {
  adminListListeningTests,
  adminDeleteListeningTest,
} from "../../../api/listening";
import type { IListeningTest } from "../../../types";
import Button from "../../../components/ui/Button";
import Card, { CardBody } from "../../../components/ui/Card";
import { PageLoader } from "../../../components/ui/Spinner";
import Badge from "../../../components/ui/Badge";

function truthyFlag(v: unknown): boolean {
  return v === true || v === "true";
}

const AdminListeningTests: React.FC = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState<IListeningTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const fetchTests = () => {
    setLoading(true);
    adminListListeningTests(1, 500)
      .then((r) => setTests(r.data.data?.tests ?? []))
      .catch(() => toast.error("Failed to load listening tests"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await adminDeleteListeningTest(id);
      toast.success("Listening test deleted");
      fetchTests();
    } catch {
      toast.error("Failed to delete test");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <PageLoader />;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? tests.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description ?? "").toLowerCase().includes(q),
      )
    : tests;

  return (
    <>
      <Helmet>
        <title>Listening Tests – Admin – Lexora</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              IELTS Listening Tests
            </h1>
            <p className="text-gray-500 mt-1">
              Manage IELTS computer-based listening modules
            </p>
          </div>
          <Button
            onClick={() => navigate("/admin/listening/new")}
            className="gap-2"
          >
            <FiPlus className="w-4 h-4" />
            New Listening Test
          </Button>
        </div>

        {!loading && tests.length > 0 && (
          <div className="relative max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or description…"
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
              aria-label="Search listening tests"
            />
          </div>
        )}

        {/* Content */}
        {tests.length === 0 ? (
          <Card>
            <CardBody className="text-center py-16">
              <FiVolume2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">
                No listening tests yet
              </p>
              <p className="text-gray-400 mt-1">
                Create your first IELTS listening test to get started.
              </p>
              <Button
                className="mt-6 gap-2"
                onClick={() => navigate("/admin/listening/new")}
              >
                <FiPlus className="w-4 h-4" />
                Create Test
              </Button>
            </CardBody>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardBody className="text-center py-12">
              <FiSearch className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No tests match your search</p>
              <p className="text-gray-400 text-sm mt-1">
                Try a different keyword or clear the search box.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setQuery("")}
              >
                Clear search
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
                    Sections
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Replay
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
                {filtered.map((test) => {
                  const replayOn = truthyFlag(test.allowReplay);
                  const activeOn = truthyFlag(test.isActive);
                  return (
                  <tr
                    key={String(test._id)}
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
                      <div className="flex items-center gap-1">
                        <FiFileText className="w-3.5 h-3.5 text-gray-400" />
                        {test.sections?.length ?? 0} sections
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      <div className="flex items-center gap-1">
                        <FiClock className="w-3.5 h-3.5 text-gray-400" />
                        {test.duration} min
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={replayOn ? "success" : "gray"}>
                        {replayOn ? "Yes" : "No"}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={activeOn ? "success" : "gray"}>
                        {activeOn ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            navigate(`/admin/listening/${test._id}/attempts`)
                          }
                          className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="View attempts"
                        >
                          <FiUsers className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            navigate(`/admin/listening/${test._id}/edit`)
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminListeningTests;
