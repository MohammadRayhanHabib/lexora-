import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { FiArrowLeft, FiClock, FiStar } from "react-icons/fi";
import { mockExamApi, IMockExamAttempt } from "../../api/mockExam";
import Badge from "../../components/ui/Badge";
import { PageLoader } from "../../components/ui/Spinner";

const MockExamHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<IMockExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mockExamApi
      .myAttempts()
      .then((r) => setAttempts(r.data.data ?? []))
      .catch(() => toast.error("Failed to load history"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <>
      <Helmet>
        <title>Mock Exam History – Lexora</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/mock-tests" className="text-gray-400 hover:text-gray-600">
            <FiArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Mock Exam History
            </h1>
            <p className="text-gray-500 mt-1">
              Your past IELTS mock exam attempts and results
            </p>
          </div>
        </div>

        {attempts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <p className="text-3xl mb-3">📝</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              No attempts yet
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              You haven't taken any mock exams yet.
            </p>
            <button
              onClick={() => navigate("/mock-tests")}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition"
            >
              Take a Mock Exam
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-xs">Date</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-xs">Status</th>
                  <th className="px-5 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-xs">Listening</th>
                  <th className="px-5 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-xs">Reading</th>
                  <th className="px-5 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-xs">Writing</th>
                  <th className="px-5 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-xs">Speaking</th>
                  <th className="px-5 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-xs">Overall</th>
                  <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-xs">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attempts.map((a) => (
                  <tr key={a._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <FiClock className="w-3.5 h-3.5" />
                        {new Date(a.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <Badge variant={a.status === "completed" ? "success" : "warning"}>
                        {a.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <BandCell band={a.listeningBand} />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <BandCell band={a.readingBand} />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <BandCell band={a.writingBand} pending={!!a.writingSessionId && !a.writingBand} />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <BandCell band={a.speakingBand} pending={!!a.speakingSessionId && !a.speakingBand} />
                    </td>
                    <td className="px-5 py-4 text-center">
                      {a.overallBand != null ? (
                        <span className="inline-flex items-center justify-center bg-indigo-50 text-indigo-700 font-bold px-3 py-1 rounded-full text-sm">
                          {a.overallBand.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {a.status === "completed" || a.resultPublishedAt ? (
                        <button
                          onClick={() => navigate(`/exam/result/${a._id}`)}
                          className="text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
                        >
                          View Result
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">In Progress</span>
                      )}
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

const BandCell: React.FC<{ band?: number; pending?: boolean }> = ({ band, pending }) => {
  if (band != null)
    return (
      <span className="inline-flex items-center justify-center gap-1 font-bold text-gray-800">
        <FiStar className="w-3 h-3 text-yellow-400" />
        {band.toFixed(1)}
      </span>
    );
  if (pending)
    return <span className="text-xs text-amber-500 font-medium whitespace-nowrap">Reviewing</span>;
  return <span className="text-gray-300">—</span>;
};

export default MockExamHistoryPage;
