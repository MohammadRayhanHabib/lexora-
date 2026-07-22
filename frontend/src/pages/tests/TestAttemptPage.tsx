import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../hooks/useAppStore";
import {
  submitPracticeAnswers,
  submitMockAnswers,
} from "../../store/slices/testSlice";
import Button from "../../components/ui/Button";
import {
  enableTestSecurity,
  disableTestSecurity,
  createWatermark,
  removeWatermark,
  onVisibilityChange,
} from "../../utils/security";

const TestAttemptPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [searchParams] = useSearchParams();
  const testType = searchParams.get("type") || "practice";
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);
  const watermarkRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Security setup ─────────────────────────────── */
  useEffect(() => {
    if (testType === "mock") {
      enableTestSecurity();
      watermarkRef.current = createWatermark(user?.email || "LEXORA");
    }

    // Track tab switches
    const cleanup = onVisibilityChange((hidden) => {
      if (hidden && testType === "mock") {
        setTabSwitches((prev) => {
          const next = prev + 1;
          if (next >= 3) {
            toast.error("Too many tab switches. Test will be auto-submitted.");
            handleSubmit();
          } else {
            toast.error(`Warning: Tab switch detected (${next}/3)`);
          }
          return next;
        });
      }
    });

    return () => {
      if (testType === "mock") {
        disableTestSecurity();
        if (watermarkRef.current) removeWatermark(watermarkRef.current);
      }
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testType, user]);

  /* ── Timer ──────────────────────────────────────── */
  useEffect(() => {
    // Default durations per type (in seconds)
    const duration = testType === "mock" ? 170 * 60 : 40 * 60;
    setTimeLeft(duration);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          toast.error("Time is up! Auto-submitting...");
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testType]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0)
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = useCallback(async () => {
    if (submitting || !attemptId) return;
    setSubmitting(true);

    try {
      const action =
        testType === "mock"
          ? submitMockAnswers({ attemptId, answers })
          : submitPracticeAnswers({ attemptId, answers });

      const result = await dispatch(action);
      if (
        submitPracticeAnswers.fulfilled.match(result) ||
        submitMockAnswers.fulfilled.match(result)
      ) {
        toast.success("Test submitted successfully!");
        navigate(`/results/${attemptId}`);
      } else {
        toast.error("Failed to submit test");
      }
    } catch {
      toast.error("Failed to submit test");
    } finally {
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitting, attemptId, answers, testType, dispatch, navigate]);

  const answeredCount = Object.keys(answers).length;
  const isUrgent = timeLeft < 300; // < 5 min

  return (
    <>
      <Helmet>
        <title>
          {testType === "mock" ? "Mock Test" : "Practice Test"} – Lexora
        </title>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Fixed top bar */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="font-semibold text-gray-900">
                {testType === "mock" ? "Mock Test" : "Practice Test"}
              </h2>
              <span className="text-sm text-gray-500">
                {answeredCount} answered
              </span>
              {testType === "mock" && tabSwitches > 0 && (
                <span className="text-sm text-red-600 font-medium">
                  Tab switches: {tabSwitches}/3
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div
                className={`font-mono text-lg font-bold ${
                  isUrgent ? "text-red-600 animate-pulse" : "text-gray-900"
                }`}
              >
                {formatTime(timeLeft)}
              </div>
              <Button
                onClick={handleSubmit}
                loading={submitting}
                variant={isUrgent ? "danger" : "primary"}
              >
                Submit Test
              </Button>
            </div>
          </div>
        </div>

        {/* Question area */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="space-y-8">
              {/* Placeholder questions — real questions come from test content */}
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="space-y-3">
                  <label className="block text-sm font-medium text-gray-900">
                    Question {i + 1}
                  </label>
                  <p className="text-gray-600 text-sm">
                    [Question content loaded from test data]
                  </p>
                  <input
                    type="text"
                    value={answers[`q${i + 1}`] || ""}
                    onChange={(e) =>
                      handleAnswerChange(`q${i + 1}`, e.target.value)
                    }
                    placeholder="Type your answer..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                  />
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
              <Button onClick={handleSubmit} loading={submitting} size="lg">
                Submit Test
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TestAttemptPage;
