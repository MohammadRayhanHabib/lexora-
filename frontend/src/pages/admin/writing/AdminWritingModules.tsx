import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  writingAdminApi,
  type IWritingModule,
  WritingTaskType,
} from "../../../api/writing";
import Card, { CardBody } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import { PageLoader } from "../../../components/ui/Spinner";
import { FiPlus, FiEdit2, FiTrash2, FiEye } from "react-icons/fi";

const AdminWritingModules: React.FC = () => {
  const navigate = useNavigate();
  const [modules, setModules] = useState<IWritingModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await writingAdminApi.listModules();
      setModules(res.data.data ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this writing module? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await writingAdminApi.deleteModule(id);
      setModules((prev) => prev.filter((m) => m._id !== id));
    } catch {
      alert("Failed to delete module");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <>
      <Helmet>
        <title>Writing Modules – Admin – Lexora</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Writing Modules
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage IELTS Writing Task 1 & Task 2 practice modules
            </p>
          </div>
          <Button onClick={() => navigate("/admin/writing/new")}>
            <FiPlus className="mr-2" />
            New Module
          </Button>
        </div>

        {modules.length === 0 ? (
          <Card>
            <CardBody className="py-16 text-center text-gray-500">
              No writing modules yet. Create the first one!
            </CardBody>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Title
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Type
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Duration
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Image
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {modules.map((mod) => (
                    <tr key={mod._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {mod.title}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            mod.taskType === WritingTaskType.TASK1
                              ? "info"
                              : "warning"
                          }
                        >
                          {mod.taskType === WritingTaskType.TASK1
                            ? "Task 1"
                            : "Task 2"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {mod.duration} min
                      </td>
                      <td className="px-4 py-3">
                        {mod.imageUrl ? (
                          <img
                            src={mod.imageUrl}
                            alt="chart"
                            className="h-10 w-14 object-cover rounded"
                          />
                        ) : (
                          <span className="text-gray-400">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={mod.isActive ? "success" : "gray"}>
                          {mod.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/admin/writing/${mod._id}/submissions`}
                            className="text-blue-600 hover:text-blue-800"
                            title="View submissions"
                          >
                            <FiEye />
                          </Link>
                          <button
                            onClick={() =>
                              navigate(`/admin/writing/${mod._id}/edit`)
                            }
                            className="text-gray-600 hover:text-gray-900"
                            title="Edit"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            onClick={() => handleDelete(mod._id)}
                            disabled={deleting === mod._id}
                            className="text-red-500 hover:text-red-700 disabled:opacity-50"
                            title="Delete"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
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

export default AdminWritingModules;
