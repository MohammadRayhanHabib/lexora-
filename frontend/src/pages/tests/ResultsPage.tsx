import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { testApi } from "../../api/tests";
import { reviewApi } from "../../api/reviews";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { PageLoader } from "../../components/ui/Spinner";
import type { IAttempt, IReviewFeedback } from "../../types";
import { FiClock, FiAward, FiStar, FiArrowLeft, FiSend } from "react-icons/fi";

const ResultsPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [attempt, setAttempt] = useState<IAttempt | null>(null);
  const [feedback] = useState<IReviewFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestingReview, setRequestingReview] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  const loadData = async () => {
    try {
      const res = await testApi.getAttempt(attemptId!);
      setAttempt(res.data.data);
    } catch {
      toast.error("Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReview = async (module: string) => {
    setRequestingReview(true);
    try {
      await reviewApi.requestReview({ attemptId: attemptId!, module });
      toast.success("Review requested! 1 credit deducted.");
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to request review");
    } finally {
      setRequestingReview(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!attempt)
    return (
      <div className="text-center py-16 text-gray-500">Result not found.</div>
    );

  return (
    <>
      <Helmet>
        <title>Results – Lexora</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-gray-400 hover:text-gray-600">
            <FiArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Test Results</h1>
            <p className="text-gray-500 text-sm">
              {attempt.testType === "mock"
                ? "Mock Test"
                : `Practice – ${attempt.module}`}{" "}
              • {new Date(attempt.startedAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Overall band */}
        {attempt.overallBand != null && (
          <Card>
            <CardBody className="text-center py-8">
              <FiAward className="h-10 w-10 text-primary-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-1">Overall Band Score</p>
              <p className="text-5xl font-bold text-primary-600">
                {attempt.overallBand.toFixed(1)}
              </p>
            </CardBody>
          </Card>
        )}

        {/* Score breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Auto scores */}
          {attempt.autoScores && (
            <>
              {attempt.autoScores.listening != null && (
                <ScoreCard
                  label="Listening"
                  score={attempt.autoScores.listening}
                  type="auto"
                />
              )}
              {attempt.autoScores.reading != null && (
                <ScoreCard
                  label="Reading"
                  score={attempt.autoScores.reading}
                  type="auto"
                />
              )}
            </>
          )}

          {/* Manual scores */}
          {attempt.manualScores?.writing != null ? (
            <ScoreCard
              label="Writing"
              score={attempt.manualScores.writing}
              type="manual"
            />
          ) : attempt.testType === "mock" || attempt.module === "writing" ? (
            <PendingReviewCard
              label="Writing"
              onRequest={() => handleRequestReview("writing")}
              loading={requestingReview}
              status={attempt.status}
            />
          ) : null}

          {attempt.manualScores?.speaking != null ? (
            <ScoreCard
              label="Speaking"
              score={attempt.manualScores.speaking}
              type="manual"
            />
          ) : attempt.testType === "mock" || attempt.module === "speaking" ? (
            <PendingReviewCard
              label="Speaking"
              onRequest={() => handleRequestReview("speaking")}
              loading={requestingReview}
              status={attempt.status}
            />
          ) : null}
        </div>

        {/* Test details */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Test Details</h3>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Status</dt>
                <dd className="mt-1">
                  <Badge
                    variant={
                      attempt.status === "reviewed" ||
                      attempt.status === "completed"
                        ? "success"
                        : attempt.status === "under_review"
                          ? "warning"
                          : "gray"
                    }
                  >
                    {attempt.status.replace("_", " ")}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Time Taken</dt>
                <dd className="mt-1 flex items-center gap-1 text-sm font-medium text-gray-900">
                  <FiClock className="h-4 w-4" />
                  {Math.round(attempt.timeTaken / 60)} min
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Completion</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {attempt.completionPercentage}%
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Type</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 capitalize">
                  {attempt.testType}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        {/* Review feedback */}
        {feedback && (
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Expert Feedback</h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex items-center gap-2">
                <FiStar className="h-5 w-5 text-yellow-500" />
                <span className="font-semibold">
                  Band Score: {feedback.bandScore}
                </span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">
                {feedback.feedback}
              </p>
              {feedback.criteriaScores && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {Object.entries(feedback.criteriaScores).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="text-gray-600 capitalize">
                        {key.replace(/_/g, " ")}
                      </span>
                      <span className="font-medium text-gray-900">{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
};

const ScoreCard: React.FC<{
  label: string;
  score: number;
  type: "auto" | "manual";
}> = ({ label, score, type }) => (
  <Card>
    <CardBody className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">
          {score.toFixed(1)}
        </p>
      </div>
      <Badge variant={type === "auto" ? "info" : "success"}>
        {type === "auto" ? "Auto-scored" : "Expert Review"}
      </Badge>
    </CardBody>
  </Card>
);

const PendingReviewCard: React.FC<{
  label: string;
  onRequest: () => void;
  loading: boolean;
  status: string;
}> = ({ label, onRequest, loading, status }) => (
  <Card>
    <CardBody className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-sm text-amber-600 mt-1">
          {status === "under_review"
            ? "Under expert review..."
            : "Pending review"}
        </p>
      </div>
      {status !== "under_review" && (
        <Button
          onClick={onRequest}
          loading={loading}
          size="sm"
          variant="secondary"
        >
          <FiSend className="h-4 w-4 mr-1" />
          Request Review (1 credit)
        </Button>
      )}
    </CardBody>
  </Card>
);

export default ResultsPage;
