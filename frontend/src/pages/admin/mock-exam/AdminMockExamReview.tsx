import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiSend,
  FiCheckCircle,
  FiFileText,
  FiMic,
} from "react-icons/fi";
import { mockExamApi, IMockExamAttempt } from "../../../api/mockExam";
import { writingApi, IWritingSession } from "../../../api/writing";
import Button from "../../../components/ui/Button";
import Card, { CardBody } from "../../../components/ui/Card";
import { PageLoader } from "../../../components/ui/Spinner";

const AdminMockExamReview: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<IMockExamAttempt | null>(null);
  const [writingSession, setWritingSession] = useState<IWritingSession | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Grading state
  const [wBand, setWBand] = useState<number>(0);
  const [wTask1Band, setWTask1Band] = useState<number>(0);
  const [wTask2Band, setWTask2Band] = useState<number>(0);
  const [wFeedback, setWFeedback] = useState("");
  const [sBand, setSBand] = useState<number>(0);
  const [sP1Band, setSP1Band] = useState<number>(0);
  const [sP2Band, setSP2Band] = useState<number>(0);
  const [sP3Band, setSP3Band] = useState<number>(0);
  const [sFeedback, setSFeedback] = useState("");

  useEffect(() => {
    if (!attemptId) return;
    (async () => {
      try {
        const res = await mockExamApi.adminGetAttempt(attemptId);
        const a = res.data.data!;
        setAttempt(a);
        // Pre-fill existing grades
        if (a.writingBand) setWBand(a.writingBand);
        if (a.writingTask1Band) setWTask1Band(a.writingTask1Band);
        if (a.writingTask2Band) setWTask2Band(a.writingTask2Band);
        if (a.writingFeedback) setWFeedback(a.writingFeedback);
        if (a.speakingBand) setSBand(a.speakingBand);
        if (a.speakingPart1Band) setSP1Band(a.speakingPart1Band);
        if (a.speakingPart2Band) setSP2Band(a.speakingPart2Band);
        if (a.speakingPart3Band) setSP3Band(a.speakingPart3Band);
        if (a.speakingFeedback) setSFeedback(a.speakingFeedback);

        if (a.writingSessionId) {
          const ws = await writingApi.getSession(a.writingSessionId);
          setWritingSession(ws.data.data ?? null);
        }
      } catch {
        toast.error("Failed to load attempt");
      } finally {
        setLoading(false);
      }
    })();
  }, [attemptId]);

  const handleGradeWriting = async () => {
    if (!attempt || wBand < 1) {
      toast.error("Enter a valid writing band (1–9)");
      return;
    }
    setSaving(true);
    try {
      const res = await mockExamApi.adminGradeWriting(attempt._id, {
        writingBand: wBand,
        writingTask1Band: wTask1Band || undefined,
        writingTask2Band: wTask2Band || undefined,
        writingFeedback: wFeedback || undefined,
      });
      setAttempt(res.data.data!);
      toast.success("Writing graded");
    } catch {
      toast.error("Failed to save writing grade");
    } finally {
      setSaving(false);
    }
  };

  const handleGradeSpeaking = async () => {
    if (!attempt || sBand < 1) {
      toast.error("Enter a valid speaking band (1–9)");
      return;
    }
    setSaving(true);
    try {
      const res = await mockExamApi.adminGradeSpeaking(attempt._id, {
        speakingBand: sBand,
        speakingPart1Band: sP1Band || undefined,
        speakingPart2Band: sP2Band || undefined,
        speakingPart3Band: sP3Band || undefined,
        speakingFeedback: sFeedback || undefined,
      });
      setAttempt(res.data.data!);
      toast.success("Speaking graded");
    } catch {
      toast.error("Failed to save speaking grade");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!attempt) return;
    if (!confirm("Publish this result? The student will be able to see it.")) return;
    setPublishing(true);
    try {
      const res = await mockExamApi.adminPublishResult(attempt._id);
      setAttempt(res.data.data!);
      toast.success("Result published!");
    } catch {
      toast.error("Failed to publish result");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!attempt) return null;

  const isPublished = !!attempt.resultPublishedAt;

  return (
    <>
      <Helmet>
        <title>Review Attempt – Admin – Lexora</title>
      </Helmet>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <FiArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Manual Grading
              </h1>
              <p className="text-sm text-gray-500">
                Attempt ID: {attempt._id.slice(-8)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isPublished ? (
              <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                <FiCheckCircle className="w-4 h-4" />
                Published
              </div>
            ) : (
              <Button
                onClick={handlePublish}
                loading={publishing}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white border-0"
              >
                <FiSend className="w-4 h-4" />
                Publish Result
              </Button>
            )}
          </div>
        </div>

        {/* Auto-graded summary */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Listening", band: attempt.listeningBand, score: attempt.listeningScore, total: attempt.listeningTotalScore },
            { label: "Reading", band: attempt.readingBand, score: attempt.readingScore, total: attempt.readingTotalScore },
            { label: "Writing", band: attempt.writingBand },
            { label: "Speaking", band: attempt.speakingBand },
          ].map(({ label, band, score, total }) => (
            <div
              key={label}
              className="bg-white border border-gray-200 rounded-xl p-4 text-center"
            >
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              {band != null ? (
                <>
                  <p className="text-2xl font-black text-indigo-700">
                    {band.toFixed(1)}
                  </p>
                  {score != null && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {score}/{total} correct
                    </p>
                  )}
                </>
              ) : (
                <p className="text-gray-400 text-sm mt-2">Pending</p>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Writing grading */}
          {attempt.writingSessionId && (
            <Card>
              <CardBody className="space-y-4">
                <div className="flex items-center gap-2">
                  <FiFileText className="w-5 h-5 text-purple-600" />
                  <h2 className="font-semibold text-gray-800">
                    Writing Evaluation
                  </h2>
                  {attempt.writingReviewedAt && (
                    <span className="ml-auto text-xs text-green-600 font-medium">
                      ✓ Graded
                    </span>
                  )}
                </div>

                {/* Student's essay */}
                {writingSession?.essayText && (
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 max-h-48 overflow-y-auto">
                    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                      Student's Essay
                    </p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {writingSession.essayText}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {writingSession.wordCount} words
                    </p>
                  </div>
                )}

                {/* IELTS Writing criteria mini-reference */}
                <div className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-1">
                  <p className="font-semibold text-blue-700">Scoring Criteria</p>
                  <p>• Task Achievement / Response</p>
                  <p>• Coherence & Cohesion</p>
                  <p>• Lexical Resource</p>
                  <p>• Grammatical Range & Accuracy</p>
                </div>

                {/* Grade inputs */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Task 1", val: wTask1Band, set: setWTask1Band },
                    { label: "Task 2", val: wTask2Band, set: setWTask2Band },
                    { label: "Overall Writing", val: wBand, set: setWBand },
                  ].map(({ label, val, set }) => (
                    <BandInput key={label} label={label} value={val} onChange={set} />
                  ))}
                </div>

                <textarea
                  value={wFeedback}
                  onChange={(e) => setWFeedback(e.target.value)}
                  rows={3}
                  placeholder="Feedback for student (optional)…"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                />

                <Button
                  onClick={handleGradeWriting}
                  loading={saving}
                  fullWidth
                  className="gap-2"
                >
                  <FiCheckCircle className="w-4 h-4" />
                  Save Writing Grade
                </Button>
              </CardBody>
            </Card>
          )}

          {/* Speaking grading */}
          {attempt.speakingSessionId && (
            <Card>
              <CardBody className="space-y-4">
                <div className="flex items-center gap-2">
                  <FiMic className="w-5 h-5 text-orange-500" />
                  <h2 className="font-semibold text-gray-800">
                    Speaking Evaluation
                  </h2>
                  {attempt.speakingReviewedAt && (
                    <span className="ml-auto text-xs text-green-600 font-medium">
                      ✓ Graded
                    </span>
                  )}
                </div>

                <div className="text-xs text-gray-500 bg-orange-50 border border-orange-100 rounded-lg p-3 space-y-1">
                  <p className="font-semibold text-orange-700">Scoring Criteria</p>
                  <p>• Fluency & Coherence</p>
                  <p>• Lexical Resource</p>
                  <p>• Grammatical Range & Accuracy</p>
                  <p>• Pronunciation</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Part 1", val: sP1Band, set: setSP1Band },
                    { label: "Part 2", val: sP2Band, set: setSP2Band },
                    { label: "Part 3", val: sP3Band, set: setSP3Band },
                    { label: "Overall Speaking", val: sBand, set: setSBand },
                  ].map(({ label, val, set }) => (
                    <BandInput key={label} label={label} value={val} onChange={set} />
                  ))}
                </div>

                <textarea
                  value={sFeedback}
                  onChange={(e) => setSFeedback(e.target.value)}
                  rows={3}
                  placeholder="Feedback for student (optional)…"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                />

                <Button
                  onClick={handleGradeSpeaking}
                  loading={saving}
                  fullWidth
                  className="gap-2"
                >
                  <FiCheckCircle className="w-4 h-4" />
                  Save Speaking Grade
                </Button>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
};

/* Band score input (0, 0.5, 1, 1.5 … 9) */
const BAND_OPTIONS = Array.from({ length: 19 }, (_, i) => i * 0.5);

const BandInput: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
}> = ({ label, value, onChange }) => (
  <div>
    <label className="block text-xs font-medium text-gray-600 mb-1">
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="block w-full rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
    >
      <option value={0}>— band —</option>
      {BAND_OPTIONS.filter((b) => b > 0).map((b) => (
        <option key={b} value={b}>
          {b.toFixed(1)}
        </option>
      ))}
    </select>
  </div>
);

export default AdminMockExamReview;
