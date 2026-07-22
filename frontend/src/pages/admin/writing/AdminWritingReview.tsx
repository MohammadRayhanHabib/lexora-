import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  writingAdminApi,
  type IWritingSession,
  WritingSessionStatus,
} from "../../../api/writing";
import Card, { CardBody } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import { PageLoader } from "../../../components/ui/Spinner";
import { FiArrowLeft, FiSave } from "react-icons/fi";

const statusVariant = (
  status: WritingSessionStatus,
): "success" | "warning" | "danger" | "info" | "gray" => {
  switch (status) {
    case WritingSessionStatus.SUBMITTED:
      return "success";
    case WritingSessionStatus.AUTO_SUBMITTED:
      return "warning";
    default:
      return "gray";
  }
};

const AdminWritingReview: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<IWritingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    writingAdminApi
      .getSubmission(sessionId)
      .then((res) => {
        const s = res.data.data;
        setSession(s);
        if (s.score !== undefined) setScore(String(s.score));
        if (s.feedback) setFeedback(s.feedback);
      })
      .catch(() => setError("Failed to load session"))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handleSave = async () => {
    if (!sessionId) return;
    const numScore = parseFloat(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 9) {
      setError("Score must be between 0 and 9");
      return;
    }
    if (!feedback.trim()) {
      setError("Feedback is required");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await writingAdminApi.scoreSession(sessionId, numScore, feedback.trim());
      setSuccess(true);
      setTimeout(() => navigate(-1), 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to save score");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!session) {
    return (
      <div className="text-center py-24 text-gray-500">Session not found.</div>
    );
  }

  const wordCount = session.essayText
    ? session.essayText.trim().split(/\s+/).length
    : 0;

  return (
    <>
      <Helmet>
        <title>Review Essay – Admin – Lexora</title>
      </Helmet>

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-500 hover:text-gray-700"
          >
            <FiArrowLeft className="text-xl" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Review Essay</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Session ID: {session._id}
            </p>
          </div>
        </div>

        {/* Meta info */}
        <Card>
          <CardBody>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Status</p>
                <Badge variant={statusVariant(session.status)}>
                  {session.status.replace("_", " ")}
                </Badge>
              </div>
              <div>
                <p className="text-gray-500">Mode</p>
                <p className="font-medium capitalize">{session.mode}</p>
              </div>
              <div>
                <p className="text-gray-500">Word Count</p>
                <p className="font-medium">{wordCount}</p>
              </div>
              <div>
                <p className="text-gray-500">Submitted</p>
                <p className="font-medium">
                  {session.endTime
                    ? new Date(session.endTime).toLocaleString()
                    : "—"}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Essay */}
        <Card>
          <CardBody>
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              Student Essay
            </h2>
            {session.essayText ? (
              <div className="bg-gray-50 border rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed min-h-[200px]">
                {session.essayText}
              </div>
            ) : (
              <p className="text-gray-400 italic">No essay submitted.</p>
            )}
          </CardBody>
        </Card>

        {/* Scoring */}
        <Card>
          <CardBody className="space-y-4">
            <h2 className="text-base font-semibold text-gray-800">
              Score & Feedback
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Band Score (0 – 9)
              </label>
              <input
                type="number"
                min={0}
                max={9}
                step={0.5}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g. 6.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Feedback
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Provide detailed feedback on Task Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range..."
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded">
                Score saved successfully! Redirecting…
              </p>
            )}

            <Button onClick={handleSave} loading={saving}>
              <FiSave className="mr-2" />
              Save Score & Feedback
            </Button>
          </CardBody>
        </Card>
      </div>
    </>
  );
};

export default AdminWritingReview;
