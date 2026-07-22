import React, { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import {
  FiCheckCircle,
  FiClock,
  FiMic,
  FiStar,
  FiXCircle,
  FiChevronDown,
  FiChevronUp,
  FiPlay,
  FiPause,
} from "react-icons/fi";
import {
  adminListSpeakingSessions,
  adminScoreSpeakingSession,
} from "../../../api/speaking";
import type { ISpeakingSession, ISpeakingRecording } from "../../../types";
import Card, { CardBody } from "../../../components/ui/Card";
import Badge from "../../../components/ui/Badge";
import { PageLoader } from "../../../components/ui/Spinner";
import Button from "../../../components/ui/Button";

/* ---------- small audio player ---------- */
const AudioPlayer: React.FC<{ src: string; label: string }> = ({
  src,
  label,
}) => {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    if (!ref.current) return;
    if (playing) {
      ref.current.pause();
    } else {
      ref.current.play();
    }
    setPlaying(!playing);
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200">
      <button
        onClick={toggle}
        className="p-1.5 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors"
      >
        {playing ? (
          <FiPause className="w-3.5 h-3.5" />
        ) : (
          <FiPlay className="w-3.5 h-3.5" />
        )}
      </button>
      <span className="text-xs text-gray-600 flex-1 truncate">{label}</span>
      <audio
        ref={ref}
        src={src}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
    </div>
  );
};

/* ---------- Score form ---------- */
interface ScoreFormProps {
  session: ISpeakingSession;
  onDone: () => void;
}

const ScoreForm: React.FC<ScoreFormProps> = ({ session, onDone }) => {
  const [overallScore, setOverallScore] = useState<number>(
    session.score ?? 6.0,
  );
  const [part1Score, setPart1Score] = useState<number>(
    session.partScores?.part1 ?? 6.0,
  );
  const [part2Score, setPart2Score] = useState<number>(
    session.partScores?.part2 ?? 6.0,
  );
  const [part3Score, setPart3Score] = useState<number>(
    session.partScores?.part3 ?? 6.0,
  );
  const [feedback, setFeedback] = useState(session.feedback ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminScoreSpeakingSession(session._id, {
        score: overallScore,
        partScores: { part1: part1Score, part2: part2Score, part3: part3Score },
        feedback,
      });
      toast.success("Session scored successfully");
      onDone();
    } catch {
      toast.error("Failed to save score");
    } finally {
      setSaving(false);
    }
  };

  const bandOptions = [
    3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0,
  ];

  const ScoreSelect = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
  }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
      >
        {bandOptions.map((b) => (
          <option key={b} value={b}>
            Band {b}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 pt-3 border-t border-gray-100"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ScoreSelect
          label="Overall Band"
          value={overallScore}
          onChange={setOverallScore}
        />
        <ScoreSelect
          label="Part 1 Score"
          value={part1Score}
          onChange={setPart1Score}
        />
        <ScoreSelect
          label="Part 2 Score"
          value={part2Score}
          onChange={setPart2Score}
        />
        <ScoreSelect
          label="Part 3 Score"
          value={part3Score}
          onChange={setPart3Score}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Examiner Feedback
        </label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={4}
          placeholder="Provide detailed feedback on fluency, vocabulary, grammar, and pronunciation…"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} size="sm" className="gap-2">
          <FiStar className="w-4 h-4" />
          {saving ? "Saving…" : "Submit Score"}
        </Button>
      </div>
    </form>
  );
};

/* ---------- Session row ---------- */
const SessionCard: React.FC<{
  session: ISpeakingSession;
  onRefresh: () => void;
}> = ({ session, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);

  const recordingsByPart = (part: number) =>
    (session.recordings ?? []).filter(
      (r: ISpeakingRecording) => r.part === part,
    );

  return (
    <Card>
      {/* Row header */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors rounded-xl"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-gray-500 truncate max-w-40">
              {session.userId?.slice(-10) ?? "—"}
            </span>
            <Badge variant={session.mode === "exam" ? "danger" : "info"}>
              {session.mode}
            </Badge>
            <Badge
              variant={
                session.status === "submitted"
                  ? "success"
                  : session.status === "active"
                    ? "warning"
                    : "gray"
              }
            >
              {session.status}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <FiMic className="w-3 h-3" />
              {session.recordings?.length ?? 0} recordings
            </span>
            {session.submittedAt && (
              <span className="flex items-center gap-1">
                <FiClock className="w-3 h-3" />
                {new Date(session.submittedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {session.score != null ? (
            <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-lg">
              <FiStar className="w-4 h-4 text-indigo-500" />
              <span className="font-bold text-indigo-700 text-sm">
                Band {session.score}
              </span>
            </div>
          ) : session.status === "submitted" ? (
            <span className="text-xs text-orange-500 font-medium bg-orange-50 px-2 py-1 rounded-full">
              Awaiting score
            </span>
          ) : null}
          {expanded ? (
            <FiChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <FiChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 space-y-5">
          {/* Recordings by part */}
          {[1, 2, 3].map((part) => {
            const recs = recordingsByPart(part);
            if (recs.length === 0) return null;
            return (
              <div key={part}>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Part {part} Recordings
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {recs.map((rec: ISpeakingRecording, ri: number) => (
                    <AudioPlayer
                      key={ri}
                      src={rec.audioUrl}
                      label={
                        rec.questionText
                          ? rec.questionText.slice(0, 50)
                          : `Recording ${ri + 1}`
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Part scores if already scored */}
          {session.score != null && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Part 1", val: session.partScores?.part1 },
                { label: "Part 2", val: session.partScores?.part2 },
                { label: "Part 3", val: session.partScores?.part3 },
              ].map(({ label, val }) => (
                <div
                  key={label}
                  className="text-center p-3 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <div className="text-lg font-bold text-gray-800">
                    {val != null ? `Band ${val}` : "—"}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Feedback */}
          {session.feedback && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs font-semibold text-blue-700 mb-1">
                Examiner Feedback
              </p>
              <p className="text-sm text-blue-800 whitespace-pre-line">
                {session.feedback}
              </p>
            </div>
          )}

          {/* Score form (show for submitted sessions) */}
          {session.status === "submitted" && (
            <ScoreForm session={session} onDone={onRefresh} />
          )}
        </div>
      )}
    </Card>
  );
};

/* ---------- Main page ---------- */
const AdminSpeakingSessions: React.FC = () => {
  const [sessions, setSessions] = useState<ISpeakingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "scored">("pending");

  const fetchSessions = () => {
    setLoading(true);
    adminListSpeakingSessions()
      .then((r) => setSessions(r.data.data?.sessions ?? []))
      .catch(() => toast.error("Failed to load sessions"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  if (loading) return <PageLoader />;

  const filtered = sessions.filter((s) => {
    if (filter === "pending")
      return s.status === "submitted" && s.score == null;
    if (filter === "scored") return s.score != null;
    return true;
  });

  const pendingCount = sessions.filter(
    (s) => s.status === "submitted" && s.score == null,
  ).length;
  const scoredCount = sessions.filter((s) => s.score != null).length;

  return (
    <>
      <Helmet>
        <title>Speaking Sessions – Admin – Lexora</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Speaking Sessions
            </h1>
            <p className="text-gray-500 mt-1">
              Review student recordings and assign band scores
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {pendingCount > 0 && (
              <span className="px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full font-medium">
                {pendingCount} pending
              </span>
            )}
            {scoredCount > 0 && (
              <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                {scoredCount} scored
              </span>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
          {(["all", "pending", "scored"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors capitalize ${
                filter === f
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f}
              {f === "pending" && pendingCount > 0 && (
                <span className="ml-1.5 w-5 h-5 bg-orange-500 text-white text-xs rounded-full inline-flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Sessions */}
        {filtered.length === 0 ? (
          <Card>
            <CardBody className="text-center py-16">
              {filter === "pending" ? (
                <>
                  <FiCheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">
                    No pending sessions — all caught up!
                  </p>
                </>
              ) : (
                <>
                  <FiXCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">
                    No sessions found for this filter.
                  </p>
                </>
              )}
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => (
              <SessionCard key={s._id} session={s} onRefresh={fetchSessions} />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default AdminSpeakingSessions;
