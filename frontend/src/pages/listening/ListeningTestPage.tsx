import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Headphones, Clock, Send, Save } from "lucide-react";
import { getListeningTest } from "../../api/listening";
import {
  startListeningAttempt,
  getListeningTimer,
  autosaveListeningAnswers,
  submitListeningAttempt,
} from "../../api/listening";
import { IListeningTest, IListeningAttempt } from "../../types";
import { useCountdown } from "../../hooks/useCountdown";
import toast from "react-hot-toast";
import ListeningWorkspace from "../../components/listening/ListeningWorkspace";

function parseListeningStartPayload(raw: unknown): IListeningAttempt | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  if (d.attempt && typeof d.attempt === "object") {
    return d.attempt as IListeningAttempt;
  }
  if (typeof d._id === "string" && d.userId && d.status) {
    return raw as IListeningAttempt;
  }
  return null;
}

function listeningAttemptId(a: IListeningAttempt | null): string | undefined {
  if (!a?._id) return undefined;
  return typeof a._id === "string" ? a._id : String(a._id);
}

const ListeningTestPage: React.FC = () => {
  const { testId: id } = useParams<{ testId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = (searchParams.get("mode") ?? "practice") as "practice" | "exam";

  const [test, setTest] = useState<IListeningTest | null>(null);
  const [attempt, setAttempt] = useState<IListeningAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const autosaveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const attemptRef = useRef<IListeningAttempt | null>(null);
  attemptRef.current = attempt;

  const countdown = useCountdown({
    warningThreshold: 300,
    onExpire: () => {
      if (!submitted) handleAutoSubmit();
    },
  });

  // ── Load test & start attempt ─────────────────────────────────────────────
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const testRes = await getListeningTest(id);
        const testData: IListeningTest = testRes.data.data;
        setTest(testData);

        const { data } = await startListeningAttempt(id, mode);
        const att = parseListeningStartPayload(data.data);
        if (!att) {
          throw new Error("Invalid start session response");
        }
        setAttempt(att);
        if (att.answers) setAnswers(att.answers);

        // Sync timer
        const timerRes = await getListeningTimer(id);
        if (timerRes.data.data) {
          countdown.startFromExpiry(timerRes.data.data.expiresAt);
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message ?? "Failed to load test");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, mode]);

  // ── Autosave every 15s ────────────────────────────────────────────────────
  useEffect(() => {
    if (!attempt || !id) return;
    autosaveIntervalRef.current = setInterval(() => {
      const att = attemptRef.current;
      autosaveListeningAnswers(id, answersRef.current, {
        attemptId: listeningAttemptId(att),
        mode,
      }).catch(() => {});
    }, 15000);
    return () => {
      if (autosaveIntervalRef.current)
        clearInterval(autosaveIntervalRef.current);
    };
  }, [attempt, id, mode]);

  // ── Answer update ─────────────────────────────────────────────────────────
  const updateAnswer = (qId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!id) return;
    setSubmitting(true);
    countdown.stop();
    if (autosaveIntervalRef.current) clearInterval(autosaveIntervalRef.current);
    try {
      const { data } = await submitListeningAttempt(id, answersRef.current, {
        attemptId: listeningAttemptId(attemptRef.current),
        mode,
      });
      setSubmitted(true);
      const raw = data?.data?._id;
      const resultId =
        raw != null
          ? typeof raw === "string"
            ? raw
            : String(raw)
          : "";
      if (!resultId) {
        toast.error("Submitted, but could not open results. Check My attempts.");
        return;
      }
      navigate(`/listening/result/${resultId}`);
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ??
          "Failed to submit. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = useCallback(async () => {
    if (!id || submitted) return;
    toast("Time's up! Submitting automatically...", { icon: "⏰" });
    setSubmitting(true);
    countdown.stop();
    if (autosaveIntervalRef.current) clearInterval(autosaveIntervalRef.current);
    try {
      const { data } = await submitListeningAttempt(id, answersRef.current, {
        attemptId: listeningAttemptId(attemptRef.current),
        mode,
      });
      setSubmitted(true);
      const raw = data?.data?._id;
      const resultId =
        raw != null
          ? typeof raw === "string"
            ? raw
            : String(raw)
          : "";
      if (!resultId) {
        toast.error("Submitted, but could not open results. Check My attempts.");
        return;
      }
      navigate(`/listening/result/${resultId}`);
    } catch {
      toast.error("Auto-submit failed. Please submit manually.");
    } finally {
      setSubmitting(false);
    }
  }, [id, submitted, navigate, countdown, mode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading test…</p>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4 px-4">
        <p className="text-gray-600 text-center">
          {id
            ? "This test could not be loaded."
            : "Invalid test link — missing test id."}
        </p>
        <button
          type="button"
          onClick={() => navigate("/listening")}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          Back to listening tests
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Headphones className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-semibold text-gray-900 text-sm leading-tight">
                {test.title}
              </p>
              <p className="text-xs text-gray-400 capitalize">{mode} Mode</p>
            </div>
          </div>

          {/* Timer */}
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-sm ${
              countdown.warning
                ? "bg-red-50 text-red-600"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            <Clock className="w-4 h-4" />
            {countdown.formattedTime}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                autosaveListeningAnswers(id!, answersRef.current, {
                  attemptId: listeningAttemptId(attemptRef.current),
                  mode,
                })
              }
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-1.5 transition-colors disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 overflow-hidden px-4 py-6">
        <ListeningWorkspace
          test={test}
          answers={answers}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onAnswerChange={updateAnswer}
          mode={mode}
        />
      </div>
    </div>
  );
};

export default ListeningTestPage;
