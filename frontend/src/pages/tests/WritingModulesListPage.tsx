import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import {
  FiPenTool,
  FiClock,
  FiPlay,
  FiChevronLeft,
  FiLock,
  FiFilter,
} from "react-icons/fi";
import {
  writingApi,
  WritingTaskType,
  WritingSessionMode,
  type IWritingModule,
} from "../../api/writing";
import {
  enrollmentApi,
  EnrollmentType,
  EnrolledModule,
} from "../../api/enrollment";
import Card, { CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { PageLoader } from "../../components/ui/Spinner";

const WritingModulesListPage: React.FC = () => {
  const navigate = useNavigate();
  const [modules, setModules] = useState<IWritingModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<"all" | WritingTaskType>("all");
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const enrollments = await enrollmentApi.getMyEnrollments();
        const hasAccess = enrollments.some(
          (e) =>
            e.type === EnrollmentType.INDIVIDUAL_MODULE &&
            e.module === EnrolledModule.WRITING &&
            e.isActive,
        );
        setEnrolled(hasAccess);

        if (hasAccess) {
          const res = await writingApi.listModules();
          setModules(res.data.data ?? []);
        }
      } catch {
        toast.error("Failed to load writing modules");
        setEnrolled(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleStart = async (moduleId: string, mode: WritingSessionMode) => {
    setStarting(`${moduleId}-${mode}`);
    try {
      const res = await writingApi.startSession(moduleId, mode);
      const session = res.data.data;
      navigate(`/writing/session/${session._id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to start session");
    } finally {
      setStarting(null);
    }
  };

  if (loading) return <PageLoader />;

  if (!enrolled) {
    return (
      <>
        <Helmet>
          <title>Writing Practice – Lexora</title>
        </Helmet>
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="p-4 bg-gray-100 rounded-full">
            <FiLock className="h-10 w-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Access Restricted</h2>
          <p className="text-gray-500 max-w-sm">
            You need to enroll in the <strong>Writing</strong> module under
            Individual Module Practice to access these tasks.
          </p>
          <Button onClick={() => navigate("/practice/individual")}>
            Go to Individual Module
          </Button>
        </div>
      </>
    );
  }

  const filtered =
    filter === "all" ? modules : modules.filter((m) => m.taskType === filter);

  return (
    <>
      <Helmet>
        <title>Writing Practice – Lexora</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => navigate("/practice/individual")}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3 transition-colors"
          >
            <FiChevronLeft className="h-4 w-4" />
            Back to Individual Module
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-yellow-50">
              <FiPenTool className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Writing Practice
              </h1>
              <p className="text-sm text-gray-500">
                {modules.length} module{modules.length !== 1 ? "s" : ""}{" "}
                available
              </p>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <FiFilter className="text-gray-400" />
          {(["all", WritingTaskType.TASK1, WritingTaskType.TASK2] as const).map(
            (t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                  filter === t
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-primary-400"
                }`}
              >
                {t === "all"
                  ? "All"
                  : t === WritingTaskType.TASK1
                    ? "Task 1"
                    : "Task 2"}
              </button>
            ),
          )}
        </div>

        {/* Module cards */}
        {filtered.length === 0 ? (
          <Card>
            <CardBody className="py-16 text-center text-gray-500">
              No writing modules available yet.
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((mod) => (
              <Card key={mod._id} hover>
                <CardBody className="space-y-4">
                  {/* Task type badge + title */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
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
                      <h3 className="mt-2 font-semibold text-gray-900 leading-tight">
                        {mod.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500 shrink-0">
                      <FiClock className="h-4 w-4" />
                      <span>{mod.duration} min</span>
                    </div>
                  </div>

                  {/* Instruction preview */}
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {mod.instruction}
                  </p>

                  {/* Image thumbnail */}
                  {mod.imageUrl && (
                    <img
                      src={mod.imageUrl}
                      alt={mod.title}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      loading={
                        starting === `${mod._id}-${WritingSessionMode.PRACTICE}`
                      }
                      onClick={() =>
                        handleStart(mod._id, WritingSessionMode.PRACTICE)
                      }
                    >
                      <FiPlay className="mr-1" />
                      Practice
                    </Button>
                    <Button
                      size="sm"
                      loading={
                        starting === `${mod._id}-${WritingSessionMode.EXAM}`
                      }
                      onClick={() =>
                        handleStart(mod._id, WritingSessionMode.EXAM)
                      }
                    >
                      Start Exam
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default WritingModulesListPage;
