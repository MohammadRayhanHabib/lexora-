import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  writingApi,
  WritingSessionMode,
  WritingSessionStatus,
  type IWritingSession,
  type IWritingModule,
} from "../../api/writing";
import Card, { CardBody } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { PageLoader } from "../../components/ui/Spinner";
import { FiArrowLeft, FiStar, FiClock, FiFileText } from "react-icons/fi";

function formatDuration(start: string, end?: string) {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function countWords(text: string) {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

const statusVariant = (
  s: WritingSessionStatus,
): "success" | "warning" | "danger" | "info" | "gray" => {
  switch (s) {
    case WritingSessionStatus.SUBMITTED:
      return "success";
    case WritingSessionStatus.AUTO_SUBMITTED:
      return "warning";
    default:
      return "gray";
  }
};

const WritingResultPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<IWritingSession | null>(null);
  const [mod, setMod] = useState<IWritingModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const sRes = await writingApi.getSession(sessionId);
        const s = sRes.data.data;
        setSession(s);
        const mRes = await writingApi.getModule(s.moduleId);
        setMod(mRes.data.data);
      } catch {
        setError("Failed to load result");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  if (loading) return <PageLoader />;
  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <p className="text-gray-500">{error || "Session not found."}</p>
        <Link to="/writing">
          <Button variant="outline">Back to Writing</Button>
        </Link>
      </div>
    );
  }

  const words = countWords(session.essayText ?? "");
  const isReviewed = session.score !== undefined;

  return (
    <>
      <Helmet>
        <title>Writing Result – Lexora</title>
      </Helmet>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back */}
        <Link
          to="/writing"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <FiArrowLeft className="h-4 w-4" />
          Back to Writing
        </Link>

        {/* Status header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {mod?.title ?? "Writing Task"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {session.mode === WritingSessionMode.EXAM
                ? "Exam Mode"
                : "Practice Mode"}
            </p>
          </div>
          <Badge variant={statusVariant(session.status)}>
            {session.status.replace("_", " ")}
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardBody className="text-center py-5">
              <FiFileText className="mx-auto mb-2 text-primary-600 text-xl" />
              <p className="text-2xl font-bold text-gray-900">{words}</p>
              <p className="text-xs text-gray-500 mt-1">Words Written</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center py-5">
              <FiClock className="mx-auto mb-2 text-blue-500 text-xl" />
              <p className="text-lg font-bold text-gray-900">
                {formatDuration(session.startTime, session.endTime)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Time Taken</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center py-5">
              <FiStar className="mx-auto mb-2 text-yellow-500 text-xl" />
              <p className="text-2xl font-bold text-gray-900">
                {isReviewed ? `${session.score} / 9` : "—"}
              </p>
              <p className="text-xs text-gray-500 mt-1">Band Score</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center py-5">
              <p className="text-xs text-gray-500 mb-1">Submitted</p>
              <p className="text-sm font-medium text-gray-700">
                {session.endTime
                  ? new Date(session.endTime).toLocaleDateString()
                  : "—"}
              </p>
            </CardBody>
          </Card>
        </div>

        {/* Feedback */}
        {isReviewed && session.feedback && (
          <Card>
            <CardBody>
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FiStar className="text-yellow-500" />
                Examiner Feedback
              </h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {session.feedback}
              </p>
            </CardBody>
          </Card>
        )}

        {!isReviewed && (
          <Card>
            <CardBody className="py-8 text-center text-gray-500">
              <FiStar className="mx-auto mb-2 text-gray-300 text-3xl" />
              <p className="font-medium text-gray-600">Awaiting Review</p>
              <p className="text-sm mt-1">
                Your essay has been submitted and will be reviewed by an
                examiner soon.
              </p>
            </CardBody>
          </Card>
        )}

        {/* Essay */}
        <Card>
          <CardBody>
            <h2 className="font-semibold text-gray-800 mb-3">Your Essay</h2>
            {session.essayText ? (
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed min-h-[150px]">
                {session.essayText}
              </div>
            ) : (
              <p className="text-gray-400 italic">No essay submitted.</p>
            )}
          </CardBody>
        </Card>

        {/* History link */}
        <div className="flex justify-center">
          <Link to="/writing">
            <Button variant="outline">Practice Another Task</Button>
          </Link>
        </div>
      </div>
    </>
  );
};

export default WritingResultPage;
