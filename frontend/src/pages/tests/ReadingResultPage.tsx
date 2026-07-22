import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { FiCheck, FiX, FiBookOpen, FiAward, FiArrowLeft } from "react-icons/fi";
import {
  readingApi,
  IReadingAttempt,
  IReadingAnswerResult,
} from "../../api/reading";
import { PageLoader } from "../../components/ui/Spinner";
import Card, { CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";

const ReadingResultPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [attempt, setAttempt] = useState<IReadingAttempt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!attemptId) return;
    readingApi
      .getAttempt(attemptId)
      .then((r) => setAttempt(r.data.data ?? null))
      .catch(() => toast.error("Failed to load result"))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) return <PageLoader />;
  if (!attempt)
    return <p className="text-center text-gray-500 mt-20">Result not found.</p>;

  const { score, totalScore, bandScore, results } = attempt;
  const pct = totalScore > 0 ? Math.round((score / totalScore) * 100) : 0;
  const correct = results?.filter((r) => r.isCorrect).length ?? 0;
  const total = results?.length ?? 0;
  const wrong = total - correct;

  const bandColor =
    (bandScore ?? 0) >= 7
      ? "text-green-600"
      : (bandScore ?? 0) >= 5
        ? "text-yellow-600"
        : "text-red-500";

  return (
    <>
      <Helmet>
        <title>Reading Result – Lexora</title>
      </Helmet>

      <div className="max-w-3xl mx-auto space-y-6 py-6">
        {/* Back */}
        <Link
          to="/reading"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800"
        >
          <FiArrowLeft className="w-4 h-4" /> Back to Tests
        </Link>

        {/* Score card */}
        <Card>
          <CardBody className="text-center py-8 space-y-4">
            <div className="flex items-center justify-center gap-2 text-primary-600">
              <FiBookOpen className="w-7 h-7" />
              <h1 className="text-2xl font-bold text-gray-900">
                Reading Test Result
              </h1>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 mt-4">
              {/* Score */}
              <div>
                <p className="text-4xl font-extrabold text-gray-900">
                  {score}
                  <span className="text-2xl text-gray-400">/{totalScore}</span>
                </p>
                <p className="text-sm text-gray-500 mt-1">Total Score</p>
              </div>

              {/* Percentage */}
              <div>
                <p className="text-4xl font-extrabold text-primary-600">
                  {pct}%
                </p>
                <p className="text-sm text-gray-500 mt-1">Accuracy</p>
              </div>

              {/* Band */}
              {bandScore != null && (
                <div>
                  <p className={`text-4xl font-extrabold ${bandColor}`}>
                    {bandScore.toFixed(1)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                    <FiAward className="w-3.5 h-3.5" /> Band Score
                  </p>
                </div>
              )}
            </div>

            {/* Correct / wrong chips */}
            <div className="flex items-center justify-center gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                <FiCheck className="w-4 h-4" /> {correct} Correct
              </span>
              <span className="flex items-center gap-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-3 py-1">
                <FiX className="w-4 h-4" /> {wrong} Wrong
              </span>
            </div>

            {/* Time info */}
            {attempt.submittedAt && (
              <p className="text-xs text-gray-400 mt-2">
                Submitted: {new Date(attempt.submittedAt).toLocaleString()}
                {attempt.timeRemaining != null &&
                  ` · ${Math.floor(attempt.timeRemaining / 60)}m remaining`}
              </p>
            )}
          </CardBody>
        </Card>

        {/* Answer review */}
        {results && results.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Answer Review
            </h2>
            {results.map((r, i) => (
              <AnswerReviewCard key={r.questionId} result={r} index={i} />
            ))}
          </div>
        )}

        {/* Try again */}
        <div className="text-center pt-2">
          <Link to="/reading">
            <Button variant="secondary">Take Another Reading Test</Button>
          </Link>
        </div>
      </div>
    </>
  );
};

/* ─── Single answer review card ─────────────────────────── */

const AnswerReviewCard: React.FC<{
  result: IReadingAnswerResult;
  index: number;
}> = ({ result, index }) => {
  const { isCorrect, answer, correctAnswer, explanation } = result;

  const fmtAnswer = (a: string | string[]) =>
    Array.isArray(a) ? a.join(", ") : a || "—";

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
            isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"
          }`}
        >
          {isCorrect ? <FiCheck /> : <FiX />}
        </div>
        <div className="flex-1 space-y-1.5 text-sm">
          <p className="font-semibold text-gray-900">Q{index + 1}</p>
          <div className="flex flex-wrap gap-4">
            <div>
              <span className="text-xs text-gray-500 block mb-0.5">
                Your answer
              </span>
              <span
                className={`font-medium ${isCorrect ? "text-green-700" : "text-red-600"}`}
              >
                {fmtAnswer(answer)}
              </span>
            </div>
            {!isCorrect && (
              <div>
                <span className="text-xs text-gray-500 block mb-0.5">
                  Correct answer
                </span>
                <span className="font-medium text-green-700">
                  {fmtAnswer(correctAnswer)}
                </span>
              </div>
            )}
          </div>
          {explanation && (
            <p className="text-xs text-gray-600 italic bg-white/60 rounded-lg px-3 py-2 mt-1">
              💡 {explanation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReadingResultPage;
