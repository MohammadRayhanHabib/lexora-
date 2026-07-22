import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiUsers,
  FiBarChart2,
  FiClock,
  FiHeadphones,
  FiBook,
  FiEdit,
  FiMic,
} from "react-icons/fi";
import { mockExamApi, IMockExam } from "../../../api/mockExam";
import Card, { CardBody } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import { PageLoader } from "../../../components/ui/Spinner";

const AdminMockExams: React.FC = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState<IMockExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadExams = async () => {
    try {
      const res = await mockExamApi.adminListExams();
      setExams(res.data.data?.exams ?? []);
    } catch {
      toast.error("Failed to load mock exams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this mock exam? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await mockExamApi.adminDeleteExam(id);
      toast.success("Exam deleted");
      setExams((prev) => prev.filter((e) => e._id !== id));
    } catch {
      toast.error("Failed to delete exam");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <>
      <Helmet>
        <title>Mock Exams – Admin – Lexora</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mock Exams</h1>
            <p className="text-gray-500 mt-0.5 text-sm">
              Create and manage full IELTS mock exam bundles
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate("/admin/mock-exam/analytics")}
              className="gap-2"
            >
              <FiBarChart2 className="w-4 h-4" />
              Analytics
            </Button>
            <Button
              onClick={() => navigate("/admin/mock-exam/new")}
              className="gap-2"
            >
              <FiPlus className="w-4 h-4" />
              New Mock Exam
            </Button>
          </div>
        </div>

        {/* Pending reviews alert */}
        <PendingReviewsAlert />

        {/* Exams list */}
        {exams.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FiBook className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              No mock exams yet
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              Create your first full IELTS mock exam bundle
            </p>
            <Button onClick={() => navigate("/admin/mock-exam/new")}>
              <FiPlus className="w-4 h-4 mr-2" />
              Create Mock Exam
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {exams.map((exam) => (
              <ExamCard
                key={exam._id}
                exam={exam}
                onEdit={() => navigate(`/admin/mock-exam/${exam._id}/edit`)}
                onAttempts={() =>
                  navigate(`/admin/mock-exam/${exam._id}/attempts`)
                }
                onDelete={() => handleDelete(exam._id)}
                deleting={deleting === exam._id}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

/* ─── Pending Reviews Alert ────────────────────────────────── */

const PendingReviewsAlert: React.FC = () => {
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [firstPendingAttemptId, setFirstPendingAttemptId] = useState<
    string | null
  >(null);

  useEffect(() => {
    mockExamApi
      .adminGetPendingReviews()
      .then((res) => {
        const pending = res.data.data ?? [];
        setCount(pending.length);
        setFirstPendingAttemptId(pending[0]?._id ?? null);
      })
      .catch(() => {});
  }, []);

  if (!count) return null;

  return (
    <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
          <FiClock className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-800">
            {count} attempt{count !== 1 ? "s" : ""} need manual grading
          </p>
          <p className="text-xs text-amber-600">
            Writing & Speaking sections require review
          </p>
        </div>
      </div>
      <Button
        size="sm"
        onClick={() => {
          if (firstPendingAttemptId) {
            navigate(`/admin/mock-exam/review/${firstPendingAttemptId}`);
            return;
          }
          navigate("/admin/mock-exam");
        }}
        className="bg-amber-600 hover:bg-amber-700 text-white border-0"
      >
        Review Now
      </Button>
    </div>
  );
};

/* ─── Exam Card ─────────────────────────────────────────────── */

const SectionIcon: React.FC<{
  has: boolean;
  icon: React.ReactNode;
  label: string;
}> = ({ has, icon, label }) => (
  <div
    className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
      has
        ? "bg-green-50 text-green-700 border border-green-200"
        : "bg-gray-100 text-gray-400 border border-gray-200"
    }`}
  >
    {icon}
    <span>{label}</span>
  </div>
);

const ExamCard: React.FC<{
  exam: IMockExam;
  onEdit: () => void;
  onAttempts: () => void;
  onDelete: () => void;
  deleting: boolean;
}> = ({ exam, onEdit, onAttempts, onDelete, deleting }) => {
  const totalDuration =
    (exam.listeningTestId ? exam.listeningDuration : 0) +
    (exam.readingPart1Id ? exam.readingDuration : 0) +
    (exam.writingTask1Id ? exam.writingDuration : 0) +
    (exam.speakingTestId ? exam.speakingDuration : 0);

  return (
    <Card>
      <CardBody className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-bold text-gray-900 truncate">
                {exam.title}
              </h3>
              <Badge variant={exam.isActive ? "success" : "gray"}>
                {exam.isActive ? "Active" : "Inactive"}
              </Badge>
              <Badge
                variant={exam.examType === "practice" ? "warning" : "info"}
              >
                {exam.examType === "practice" ? "Practice Test" : "Mock Test"}
              </Badge>
              {exam.academicNumber && (
                <Badge variant="info">
                  C{exam.academicNumber}
                  {exam.testNumber ? ` Test ${exam.testNumber}` : ""}
                </Badge>
              )}
            </div>
            {exam.description && (
              <p className="text-sm text-gray-500 mb-3 line-clamp-1">
                {exam.description}
              </p>
            )}

            {/* Section pills */}
            <div className="flex flex-wrap gap-2 mb-3">
              <SectionIcon
                has={!!exam.listeningTestId}
                icon={<FiHeadphones className="w-3.5 h-3.5" />}
                label={`Listening ${exam.listeningDuration}m`}
              />
              <SectionIcon
                has={
                  !!(
                    exam.readingPart1Id ||
                    exam.readingPart2Id ||
                    exam.readingPart3Id
                  )
                }
                icon={<FiBook className="w-3.5 h-3.5" />}
                label={`Reading ${exam.readingDuration}m`}
              />
              <SectionIcon
                has={!!(exam.writingTask1Id || exam.writingTask2Id)}
                icon={<FiEdit className="w-3.5 h-3.5" />}
                label={`Writing ${exam.writingDuration}m`}
              />
              <SectionIcon
                has={!!exam.speakingTestId}
                icon={<FiMic className="w-3.5 h-3.5" />}
                label={`Speaking ${exam.speakingDuration}m`}
              />
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <FiClock className="w-3.5 h-3.5" />~{totalDuration} min total
              </span>
              <span>
                Created {new Date(exam.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={onAttempts}
              className="gap-1.5"
            >
              <FiUsers className="w-3.5 h-3.5" />
              Attempts
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onEdit}
              className="gap-1.5"
            >
              <FiEdit2 className="w-3.5 h-3.5" />
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={onDelete}
              loading={deleting}
            >
              <FiTrash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default AdminMockExams;
