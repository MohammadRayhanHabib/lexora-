import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { FiArrowLeft, FiClock, FiAward, FiStar, FiCheckCircle } from "react-icons/fi";
import { mockExamApi, IMockExamAttempt, IMockExam } from "../../api/mockExam";
import { PageLoader } from "../../components/ui/Spinner";

const IELTSExamResultPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<IMockExamAttempt | null>(null);
  const [exam, setExam] = useState<IMockExam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!attemptId) return;
    mockExamApi
      .getAttempt(attemptId)
      .then(async (res) => {
        const a = res.data.data!;
        setAttempt(a);
        const examRes = await mockExamApi.getExam(a.examId);
        setExam(examRes.data.data!);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) return <PageLoader />;
  if (!attempt) return null;

  const isPublished = !!attempt.resultPublishedAt;

  const sections = [
    {
      label: "Listening",
      icon: "🎧",
      band: attempt.listeningBand,
      score: attempt.listeningScore,
      total: attempt.listeningTotalScore,
      auto: true,
      color: "from-blue-500 to-cyan-500",
    },
    {
      label: "Reading",
      icon: "📖",
      band: attempt.readingBand,
      score: attempt.readingScore,
      total: attempt.readingTotalScore,
      auto: true,
      color: "from-emerald-500 to-teal-500",
    },
    {
      label: "Writing",
      icon: "✍️",
      band: attempt.writingBand,
      feedback: attempt.writingFeedback,
      auto: false,
      color: "from-violet-500 to-purple-600",
    },
    {
      label: "Speaking",
      icon: "🎙️",
      band: attempt.speakingBand,
      feedback: attempt.speakingFeedback,
      auto: false,
      color: "from-orange-500 to-amber-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
      <Helmet>
        <title>Exam Results – {exam?.title} – Lexora</title>
      </Helmet>

      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate("/mock-tests")}
          className="flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" /> Back to Mock Tests
        </button>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <FiClock className="w-4 h-4 text-white/40" />
          <span className="text-white/40">
            {new Date(attempt.createdAt).toLocaleDateString("en-GB", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Exam title + overall */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-black">{exam?.title ?? "IELTS Mock Exam"}</h1>

          {isPublished && attempt.overallBand != null ? (
            <div className="inline-flex flex-col items-center">
              <p className="text-white/50 text-sm mb-1">Overall Band Score</p>
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-2xl shadow-orange-500/40">
                  <span className="text-5xl font-black text-white">
                    {attempt.overallBand.toFixed(1)}
                  </span>
                </div>
                <div className="absolute -top-2 -right-2">
                  <FiAward className="w-8 h-8 text-yellow-400" />
                </div>
              </div>
            </div>
          ) : !isPublished ? (
            <div className="inline-block bg-amber-500/20 border border-amber-500/30 text-amber-300 px-6 py-3 rounded-xl text-sm font-medium">
              ⏳ Results being reviewed — available within 48 hours
            </div>
          ) : null}
        </div>

        {/* Section bands */}
        <div className="grid grid-cols-2 gap-4">
          {sections.map(({ label, icon, band, score, total, feedback, auto, color }) => (
            <div
              key={label}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{icon}</span>
                <span className="font-semibold">{label}</span>
                {auto && (
                  <span className="ml-auto text-xs text-green-400 flex items-center gap-1">
                    <FiCheckCircle className="w-3 h-3" /> Auto-graded
                  </span>
                )}
              </div>

              {band != null ? (
                <div>
                  <div className={`inline-flex items-center gap-2 bg-gradient-to-r ${color} px-4 py-2 rounded-xl`}>
                    <FiStar className="w-4 h-4" />
                    <span className="text-2xl font-black">{band.toFixed(1)}</span>
                    <span className="text-sm opacity-80">/ 9.0</span>
                  </div>
                  {score != null && total != null && (
                    <p className="text-white/40 text-xs mt-2">
                      {score} / {total} correct ({Math.round((score / total) * 100)}%)
                    </p>
                  )}

                  {/* Band score bar */}
                  <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${color} rounded-full transition-all`}
                      style={{ width: `${(band / 9) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-400 text-sm">
                  <span className="animate-pulse">⏳</span>
                  <span>Under Review</span>
                </div>
              )}

              {feedback && (
                <div className="mt-2 bg-white/5 rounded-xl p-3">
                  <p className="text-xs text-white/40 mb-1 uppercase tracking-wide">Feedback</p>
                  <p className="text-sm text-white/70 leading-relaxed">{feedback}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Band descriptor */}
        {isPublished && attempt.overallBand != null && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="font-semibold mb-2">Band {attempt.overallBand.toFixed(1)} — {getBandLabel(attempt.overallBand)}</p>
            <p className="text-white/60 text-sm leading-relaxed">
              {getBandDescription(attempt.overallBand)}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate("/mock-tests")}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-sm transition-colors border border-white/20"
          >
            Take Another Test
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

function getBandLabel(band: number): string {
  if (band >= 8.5) return "Expert";
  if (band >= 7.5) return "Very Good";
  if (band >= 6.5) return "Good";
  if (band >= 5.5) return "Competent";
  if (band >= 4.5) return "Modest";
  if (band >= 3.5) return "Limited";
  return "Extremely Limited";
}

function getBandDescription(band: number): string {
  if (band >= 8.5)
    return "You have fully operational command of the language with only occasional unsystematic inaccuracies.";
  if (band >= 7.5)
    return "You have operational command of the language, though with occasional inaccuracies and misunderstandings in some situations.";
  if (band >= 6.5)
    return "You have an effective command of the language despite some inaccuracies and misunderstandings.";
  if (band >= 5.5)
    return "You have partial command of the language, coping with overall meaning in most situations.";
  if (band >= 4.5)
    return "Your basic competence is limited to familiar situations. You frequently show problems in understanding and expression.";
  return "You have great difficulty understanding spoken and written English.";
}

export default IELTSExamResultPage;
