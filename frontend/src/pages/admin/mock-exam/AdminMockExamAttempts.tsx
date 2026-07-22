import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { FiArrowLeft, FiClock, FiStar, FiUser, FiEye } from "react-icons/fi";
import { mockExamApi, IMockExamAttempt } from "../../../api/mockExam";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import { PageLoader } from "../../../components/ui/Spinner";

const AdminMockExamAttempts: React.FC = () => {
  const { id: examId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<IMockExamAttempt[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await mockExamApi.adminListAttempts({ examId, limit: 100 });
        setAttempts(res.data.data?.attempts ?? []);
        setTotal(res.data.data?.total ?? 0);
      } catch {
        toast.error("Failed to load attempts");
      } finally {
        setLoading(false);
      }
    })();
  }, [examId]);

  if (loading) return <PageLoader />;

  return (
    <>
      <Helmet>
        <title>Mock Exam Attempts – Admin – Lexora</title>
      </Helmet>
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/mock-exam")}
          >
            <FiArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Student Attempts
            </h1>
            <p className="text-gray-500 text-sm">{total} total submissions</p>
          </div>
        </div>

        {attempts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <p className="text-gray-500">No attempts yet for this exam.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    "Student ID",
                    "Status",
                    "Listening",
                    "Reading",
                    "Writing",
                    "Speaking",
                    "Overall",
                    "Date",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attempts.map((a) => (
                  <AttemptRow
                    key={a._id}
                    attempt={a}
                    onReview={() =>
                      navigate(`/admin/mock-exam/review/${a._id}`)
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

const BandCell: React.FC<{ band?: number; pending?: boolean }> = ({
  band,
  pending,
}) => {
  if (band != null)
    return (
      <span className="inline-flex items-center gap-1 font-bold text-indigo-700">
        <FiStar className="w-3.5 h-3.5 text-yellow-400" />
        {band.toFixed(1)}
      </span>
    );
  if (pending)
    return (
      <span className="text-amber-600 text-xs font-medium">Under Review</span>
    );
  return <span className="text-gray-300">—</span>;
};

const statusVariant = (s: string) => {
  switch (s) {
    case "completed":
      return "success";
    case "writing_done":
    case "reading_done":
    case "listening_done":
      return "warning";
    default:
      return "default";
  }
};

const AttemptRow: React.FC<{
  attempt: IMockExamAttempt;
  onReview: () => void;
}> = ({ attempt: a, onReview }) => (
  <tr className="hover:bg-gray-50 transition-colors">
    <td className="px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center">
          <FiUser className="w-3.5 h-3.5 text-gray-500" />
        </div>
        <span className="font-mono text-xs text-gray-500 truncate max-w-[100px]">
          {a.userId.slice(-8)}
        </span>
      </div>
    </td>
    <td className="px-4 py-3">
      <Badge variant={statusVariant(a.status) as any}>
        {a.status.replace(/_/g, " ")}
      </Badge>
    </td>
    <td className="px-4 py-3">
      <BandCell band={a.listeningBand} />
    </td>
    <td className="px-4 py-3">
      <BandCell band={a.readingBand} />
    </td>
    <td className="px-4 py-3">
      <BandCell
        band={a.writingBand}
        pending={!!a.writingSessionId && !a.writingBand}
      />
    </td>
    <td className="px-4 py-3">
      <BandCell
        band={a.speakingBand}
        pending={!!a.speakingSessionId && !a.speakingBand}
      />
    </td>
    <td className="px-4 py-3">
      {a.overallBand != null ? (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-800 rounded-full text-xs font-bold">
          {a.overallBand.toFixed(1)}
        </span>
      ) : (
        <span className="text-gray-300 text-xs">—</span>
      )}
    </td>
    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
      <div className="flex items-center gap-1">
        <FiClock className="w-3 h-3" />
        {new Date(a.createdAt).toLocaleDateString()}
      </div>
    </td>
    <td className="px-4 py-3">
      <Button
        size="sm"
        variant="secondary"
        onClick={onReview}
        className="gap-1"
      >
        <FiEye className="w-3.5 h-3.5" />
        Review
      </Button>
    </td>
  </tr>
);

export default AdminMockExamAttempts;
