import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { FiClock, FiChevronLeft, FiChevronRight, FiSend, FiX } from "react-icons/fi";
import {
  readingApi,
  IReadingTest,
  IReadingQuestionStudent,
  IReadingAnswerEntry,
  ReadingQuestionType,
  QUESTION_TYPE_LABELS,
  countFlowchartGapTokens,
  countNoteCompletionGaps,
  countTableGapTokens,
  FLOWCHART_GAP_TOKEN,
} from "../../api/reading";
import TableCompletionPanel from "../../components/reading/TableCompletionPanel";
import { PageLoader } from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import MatchingInformationGrid from "../../components/reading/MatchingInformationGrid";
import StatementMatchingPanel from "../../components/reading/StatementMatchingPanel";
import ListMatchingPanel from "../../components/reading/ListMatchingPanel";
import DiagramLabelCompletionPanel from "../../components/reading/DiagramLabelCompletionPanel";
import NoteCompletionGaps from "../../components/reading/NoteCompletionGaps";

/* ──────────────────────────────────────────────────────── */

const AUTO_SAVE_INTERVAL = 30_000; // 30 s

/* Group questions by their pageNumber, preserving question order within each
 * page and sorting pages numerically. */
function buildPageGroups(
  questions: IReadingQuestionStudent[],
): { pageNum: number; questions: IReadingQuestionStudent[] }[] {
  const map = new Map<number, IReadingQuestionStudent[]>();
  for (const q of questions) {
    const p = q.pageNumber ?? 1;
    if (!map.has(p)) map.set(p, []);
    map.get(p)!.push(q);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([pageNum, qs]) => ({ pageNum, questions: qs }));
}

/* ──────────────────────────────────────────────────────── */

const ReadingTestPage: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  const [pageState, setPageState] = useState<"loading" | "test" | "review">(
    "loading",
  );
  const [test, setTest] = useState<IReadingTest | null>(null);
  const [questions, setQuestions] = useState<IReadingQuestionStudent[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [activePage, setActivePage] = useState(0); // index into pageGroups
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  // Group questions by page
  const pageGroups = useMemo(() => buildPageGroups(questions), [questions]);

  // Build a lookup: questionId → global 1-indexed number
  const questionNumberMap = useMemo(() => {
    const map: Record<string, number> = {};
    questions.forEach((q, i) => {
      map[q._id] = i + 1;
    });
    return map;
  }, [questions]);

  // ── Load test + start attempt ──────────────────────────

  const initTest = useCallback(async () => {
    if (!testId) return;
    try {
      const [testRes, startRes] = await Promise.all([
        readingApi.getTest(testId),
        readingApi.startAttempt(testId),
      ]);
      const t = testRes.data.data!.test;
      const qs = testRes.data.data!.questions;
      const { attempt, timeRemaining } = startRes.data.data!;

      setTest(t);
      setQuestions(qs);
      setAttemptId(attempt._id);
      setSecondsLeft(timeRemaining);

      // Restore draft answers from Redis
      try {
        const draftRes = await readingApi.getDraft(attempt._id);
        const draft: IReadingAnswerEntry[] = draftRes.data.data?.answers ?? [];
        const saved: Record<string, string | string[]> = {};
        draft.forEach((e) => {
          saved[e.questionId] = e.answer;
        });
        setAnswers(saved);
      } catch {
        /* no draft */
      }

      setPageState("test");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to load reading test",
      );
    }
  }, [testId]);

  useEffect(() => {
    initTest();
  }, [initTest]);

  // ── Timer countdown ────────────────────────────────────

  useEffect(() => {
    if (pageState !== "test" || secondsLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [pageState]); // eslint-disable-line

  // ── Auto-save ──────────────────────────────────────────

  useEffect(() => {
    if (pageState !== "test" || !attemptId) return;
    autoSaveRef.current = setInterval(() => {
      const entries = buildAnswerEntries(answersRef.current);
      readingApi.autoSave(attemptId, entries).catch(() => {});
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(autoSaveRef.current!);
  }, [pageState, attemptId]);

  // ── Answer helpers ─────────────────────────────────────

  const buildAnswerEntries = (
    a: Record<string, string | string[]>,
  ): IReadingAnswerEntry[] =>
    Object.entries(a).map(([questionId, answer]) => ({ questionId, answer }));

  const setAnswer = (qId: string, val: string | string[]) =>
    setAnswers((prev) => ({ ...prev, [qId]: val }));

  const clearAnswer = (qId: string) =>
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[qId];
      return next;
    });

  // ── Submit ──────────────────────────────────────────────

  const handleSubmitFinal = async () => {
    if (!attemptId) return;
    setSubmitting(true);
    clearInterval(timerRef.current!);
    clearInterval(autoSaveRef.current!);
    try {
      const entries = buildAnswerEntries(answersRef.current);
      await readingApi.submitAttempt(attemptId, entries);
      navigate(`/reading/result/${attemptId}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Submission failed");
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = async () => {
    toast("Time's up! Auto-submitting…", { icon: "⏰" });
    await handleSubmitFinal();
  };

  // ── Format timer ───────────────────────────────────────

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const timerColor =
    secondsLeft < 120
      ? "text-red-500"
      : secondsLeft < 300
        ? "text-yellow-500"
        : "text-white";

  // ── Answered helpers ───────────────────────────────────

  const isAnswered = (qId: string) => {
    const a = answers[qId];
    if (!a) return false;
    if (Array.isArray(a)) return a.some((v) => v?.trim());
    return a.trim().length > 0;
  };

  const answeredCount = questions.filter((q) => isAnswered(q._id)).length;

  if (pageState === "loading") return <PageLoader />;
  if (!test || !attemptId) return null;

  // ── Review screen ──────────────────────────────────────

  if (pageState === "review") {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
        <Helmet>
          <title>Review Answers – {test.title}</title>
        </Helmet>
        <div className="max-w-2xl mx-auto py-12 px-4 space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Review Your Answers
          </h1>
          <p className="text-gray-500">
            {answeredCount} of {questions.length} questions answered.
            <span className="text-gray-400 ml-2">Time remaining: </span>
            <span
              className={
                secondsLeft < 120 ? "text-red-500 font-bold" : "text-gray-700"
              }
            >
              {formatTime(secondsLeft)}
            </span>
          </p>

          {/* Per-page breakdown */}
          <div className="space-y-4">
            {pageGroups.map((group, pgIdx) => {
              const groupAnswered = group.questions.filter((q) =>
                isAnswered(q._id),
              ).length;
              return (
                <div key={group.pageNum}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">
                      Page {group.pageNum}
                    </span>
                    <span className="text-xs text-gray-500">
                      {groupAnswered}/{group.questions.length} answered
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.questions.map((q) => {
                      const qNum = questionNumberMap[q._id];
                      return (
                        <button
                          key={q._id}
                          onClick={() => {
                            setActivePage(pgIdx);
                            setPageState("test");
                          }}
                          className={`w-10 h-10 rounded-lg text-sm font-medium border transition-colors ${
                            isAnswered(q._id)
                              ? "bg-green-50 border-green-400 text-green-700"
                              : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                          }`}
                        >
                          {qNum}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={() => setPageState("test")}>
              Back to Test
            </Button>
            <Button
              loading={submitting}
              onClick={handleSubmitFinal}
              className="gap-2"
            >
              <FiSend className="w-4 h-4" />
              Final Submit
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main test UI ────────────────────────────────────────

  const currentGroup = pageGroups[activePage];

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 z-40">
      <Helmet>
        <title>{test.title} – Reading Test – Lexora</title>
      </Helmet>

      {/* Top bar */}
      <div className="flex items-center justify-between bg-gray-800 text-white px-6 py-2.5 shrink-0">
        <span className="font-semibold text-sm truncate max-w-xs">
          {test.title}
        </span>
        <div className="flex items-center gap-4">
          <span
            className={`flex items-center gap-1.5 font-mono font-bold text-sm ${timerColor}`}
          >
            <FiClock className="w-4 h-4" />
            {formatTime(secondsLeft)}
          </span>
          <Button
            size="sm"
            variant="secondary"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs"
            onClick={() => setPageState("review")}
          >
            Review &amp; Submit
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT – Passage + (IELTS-style) matching heading drop zones */}
        <div className="w-1/2 border-r border-gray-200 overflow-y-auto p-6 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {test.passageTitle}
          </h2>
          {test.passageImage && (
            <img
              src={test.passageImage}
              alt="Passage"
              className="w-full rounded-lg mb-4 object-cover"
            />
          )}
          <div
            className="prose prose-sm max-w-none text-gray-800 leading-relaxed text-[15px]"
            dangerouslySetInnerHTML={{ __html: test.passageContent }}
          />

          {currentGroup?.questions
            .filter(
              (q) =>
                q.questionType === ReadingQuestionType.MATCHING_HEADINGS &&
                (q.wordBank?.length ?? 0) > 0,
            )
            .map((q) => {
              const raw = answers[q._id];
              const arr = Array.isArray(raw) ? (raw as string[]) : [];
              return (
                <div
                  key={`passage-matching-${q._id}`}
                  className="mt-6 pt-5 border-t-2 border-primary-200"
                >
                  <p className="text-xs font-bold text-primary-800 uppercase tracking-wide mb-3">
                    Drop headings here · Questions{" "}
                    {questionNumberMap[q._id]}
                    {(q.options?.length ?? 0) > 1
                      ? `–${questionNumberMap[q._id] + (q.options?.length ?? 0) - 1}`
                      : ""}
                  </p>
                  <MatchingDragDrop
                    slotTexts={q.options ?? []}
                    bankTexts={q.wordBank ?? []}
                    isMatchingHeadings
                    hasSeparateHeadingBank
                    answer={arr}
                    onChange={(val) => setAnswer(q._id, val)}
                    layout="passageSlotsOnly"
                  />
                </div>
              );
            })}
        </div>

        {/* RIGHT – Questions */}
        <div className="w-1/2 flex flex-col bg-gray-50">
          {/* Page indicator header */}
          <div className="shrink-0 bg-gray-100 border-b border-gray-200 px-5 py-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Page {currentGroup?.pageNum ?? activePage + 1} of{" "}
              {pageGroups.length}
            </span>
            {currentGroup && (
              <span className="text-xs text-gray-500">
                Questions{" "}
                {questionNumberMap[currentGroup.questions[0]._id]}
                {currentGroup.questions.length > 1
                  ? ` – ${questionNumberMap[currentGroup.questions[currentGroup.questions.length - 1]._id]}`
                  : ""}
              </span>
            )}
          </div>

          {/* Question group — scrollable */}
          <div className="flex-1 overflow-y-auto px-6 pt-5 pb-4">
            {currentGroup ? (
              <div className="space-y-8">
                {/* Optional section heading for this page */}
                {currentGroup.questions[0]?.groupLabel && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                    <p className="text-sm font-semibold text-blue-800">
                      {currentGroup.questions[0].groupLabel}
                    </p>
                  </div>
                )}

                {currentGroup.questions.map((q) => (
                  <QuestionPanel
                    key={q._id}
                    question={q}
                    questionNumber={questionNumberMap[q._id]}
                    answer={answers[q._id]}
                    onAnswer={(val) => setAnswer(q._id, val)}
                    onClear={() => clearAnswer(q._id)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center mt-10">
                No questions on this page.
              </p>
            )}
          </div>

          {/* Navigation bar */}
          <div className="border-t border-gray-200 bg-white px-4 py-3 shrink-0 space-y-2.5">
            {/* Page navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="secondary"
                size="sm"
                disabled={activePage === 0}
                onClick={() => setActivePage((p) => p - 1)}
                className="gap-1"
              >
                <FiChevronLeft className="w-4 h-4" /> Prev Page
              </Button>

              <span className="text-xs text-gray-500">
                {answeredCount}/{questions.length} answered
              </span>

              <Button
                variant="secondary"
                size="sm"
                disabled={activePage === pageGroups.length - 1}
                onClick={() => setActivePage((p) => p + 1)}
                className="gap-1"
              >
                Next Page <FiChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Page tab pills */}
            {pageGroups.length > 1 && (
              <div className="flex items-center gap-1.5 justify-center flex-wrap">
                {pageGroups.map((group, pgIdx) => {
                  const groupAnswered = group.questions.filter((q) =>
                    isAnswered(q._id),
                  ).length;
                  const allDone = groupAnswered === group.questions.length;
                  const isActive = pgIdx === activePage;
                  return (
                    <button
                      key={group.pageNum}
                      onClick={() => setActivePage(pgIdx)}
                      title={`Page ${group.pageNum} — ${groupAnswered}/${group.questions.length} answered`}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                        isActive
                          ? "bg-primary-600 text-white border-primary-600"
                          : allDone
                            ? "bg-green-50 text-green-700 border-green-300"
                            : groupAnswered > 0
                              ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                              : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      Page {group.pageNum}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Question number mini-grid — only the current page's questions */}
            {currentGroup && (
              <div className="flex flex-wrap gap-1 justify-center">
                {currentGroup.questions.map((q) => {
                  const qNum = questionNumberMap[q._id];
                  const answered = isAnswered(q._id);
                  return (
                    <span
                      key={q._id}
                      title={`Question ${qNum}${answered ? " · answered" : ""}`}
                      className={`w-7 h-7 text-xs rounded font-medium flex items-center justify-center ${
                        answered
                          ? "bg-green-500 text-white"
                          : "bg-gray-100 text-gray-600 border border-gray-300"
                      }`}
                    >
                      {qNum}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Question Panel ─────────────────────────────────────── */

interface QuestionPanelProps {
  question: IReadingQuestionStudent;
  questionNumber: number;
  answer: string | string[] | undefined;
  onAnswer: (val: string | string[]) => void;
  onClear: () => void;
}

const TFNG_OPTS = ["TRUE", "FALSE", "NOT GIVEN"];
const YNNG_OPTS = ["YES", "NO", "NOT GIVEN"];

function flowchartGapsBeforeRow(rows: string[], rowIdx: number): number {
  let n = 0;
  for (let i = 0; i < rowIdx; i++) {
    const row = rows[i] ?? "";
    n += Math.max(0, row.split(FLOWCHART_GAP_TOKEN).length - 1);
  }
  return n;
}

interface FlowchartCompletionPanelProps {
  title: string;
  rows: string[];
  hints: string[];
  answer: string[];
  onChange: (next: string[]) => void;
}

const FlowchartCompletionPanel: React.FC<FlowchartCompletionPanelProps> = ({
  title,
  rows,
  hints,
  answer,
  onChange,
}) => {
  const gapCount = countFlowchartGapTokens(rows);
  const vals = Array.from({ length: gapCount }, (_, i) =>
    Array.isArray(answer) ? String(answer[i] ?? "") : "",
  );
  const setVal = (g: number, v: string) => {
    const next = [...vals];
    next[g] = v;
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {title.trim() ? (
        <h3 className="text-center text-base font-bold text-gray-900">
          {title.trim()}
        </h3>
      ) : null}
      <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm">
        {rows.map((row, ri) => {
          const parts = (row ?? "").split(FLOWCHART_GAP_TOKEN);
          return (
            <React.Fragment key={ri}>
              {ri > 0 && (
                <div
                  className="flex justify-center py-0.5 text-xl leading-none text-gray-700"
                  aria-hidden
                >
                  ↓
                </div>
              )}
              <div className="rounded-lg border border-gray-200 bg-gradient-to-b from-gray-50/90 to-white px-3 py-3 text-sm text-gray-900 leading-relaxed flex flex-wrap items-center justify-center gap-x-1 gap-y-2 text-center min-h-[2.5rem]">
                {parts.map((part, pi) => (
                  <React.Fragment key={`${ri}-${pi}`}>
                    {part ? (
                      <span className="whitespace-pre-wrap">{part}</span>
                    ) : null}
                    {pi < parts.length - 1 ? (
                      <span className="inline-flex flex-col items-center mx-1 shrink-0 align-baseline">
                        <span className="text-[11px] font-bold text-rose-900 tabular-nums leading-none mb-0.5">
                          ({flowchartGapsBeforeRow(rows, ri) + pi + 1})
                        </span>
                        <input
                          type="text"
                          value={vals[flowchartGapsBeforeRow(rows, ri) + pi] ?? ""}
                          onChange={(e) =>
                            setVal(
                              flowchartGapsBeforeRow(rows, ri) + pi,
                              e.target.value,
                            )
                          }
                          aria-label={`Flowchart gap ${flowchartGapsBeforeRow(rows, ri) + pi + 1}`}
                          className="w-[min(12rem,85vw)] min-w-[7rem] rounded-md border-2 border-dashed border-rose-300 bg-rose-50/70 px-2 py-1 text-center text-sm text-gray-900 placeholder:text-rose-400/70 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-200"
                          placeholder="······"
                          autoComplete="off"
                        />
                      </span>
                    ) : null}
                  </React.Fragment>
                ))}
              </div>
            </React.Fragment>
          );
        })}
      </div>
      {hints.length > 0 ? (
        <div className="rounded-lg border border-dashed border-rose-200 bg-rose-50/50 p-3">
          <p className="text-xs font-semibold text-rose-900/90 uppercase tracking-wide mb-2 text-center">
            Word bank
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {hints.map((h, i) => (
              <span
                key={i}
                className="text-xs rounded-full border border-rose-200 bg-white px-2.5 py-1 text-gray-800 shadow-sm"
              >
                {h}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const QuestionPanel: React.FC<QuestionPanelProps> = ({
  question: q,
  questionNumber,
  answer,
  onAnswer,
  onClear,
}) => {
  const t = q.questionType;
  const strAnswer = Array.isArray(answer) ? "" : (answer ?? "");
  const arrAnswer = Array.isArray(answer) ? answer : [];
  const flowchartGapUi =
    t === ReadingQuestionType.FLOWCHART_COMPLETION &&
    countFlowchartGapTokens(q.options ?? []) > 0;
  const tableGapCount =
    t === ReadingQuestionType.TABLE_COMPLETION
      ? countTableGapTokens(q.options ?? [])
      : 0;
  const tableGapUi =
    t === ReadingQuestionType.TABLE_COMPLETION && tableGapCount > 0;
  const diagramGapCount =
    t === ReadingQuestionType.DIAGRAM_LABEL_COMPLETION
      ? (q.options?.length ?? 0)
      : 0;
  const diagramGapUi =
    t === ReadingQuestionType.DIAGRAM_LABEL_COMPLETION && diagramGapCount > 0;
  const shortAnswerGapUi =
    t === ReadingQuestionType.SHORT_ANSWER && (q.options?.length ?? 0) > 0;
  const summaryGapUi =
    t === ReadingQuestionType.SUMMARY_COMPLETION &&
    countNoteCompletionGaps(q.options ?? []) > 0;
  const noteBlockGapCount =
    t === ReadingQuestionType.NOTE_COMPLETION ||
    (t === ReadingQuestionType.SHORT_ANSWER && shortAnswerGapUi) ||
    summaryGapUi
      ? countNoteCompletionGaps(q.options ?? [])
      : 0;

  const toggleMulti = (val: string) => {
    if (arrAnswer.includes(val)) onAnswer(arrAnswer.filter((v) => v !== val));
    else onAnswer([...arrAnswer, val]);
  };

  return (
    <div className="space-y-3 pb-6 border-b border-gray-100 last:border-0 last:pb-0">
      {/* Type badge */}
      <div className="flex items-center gap-2">
        <span className="inline-block text-xs font-medium bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
          {QUESTION_TYPE_LABELS[t]}
        </span>
      </div>

      {/* Instructions */}
      {q.instructions && (
        <p className="text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          {q.instructions}
        </p>
      )}

      {/* Question stem / note title / flowchart title */}
      {t === ReadingQuestionType.NOTE_COMPLETION ? (
        q.questionText?.trim() ? (
          <p className="text-base font-bold text-gray-900 leading-snug">
            {q.questionText}
          </p>
        ) : (
          <p className="text-sm font-semibold text-gray-700">
            Questions {questionNumber}
            {noteBlockGapCount > 1
              ? `–${questionNumber + noteBlockGapCount - 1}`
              : ""}
          </p>
        )
      ) : t === ReadingQuestionType.SHORT_ANSWER && shortAnswerGapUi ? (
        q.questionText?.trim() ? (
          <p className="text-base font-bold text-gray-900 leading-snug">
            {q.questionText}
          </p>
        ) : (
          <p className="text-sm font-semibold text-gray-700">
            Questions {questionNumber}
            {noteBlockGapCount > 1
              ? `–${questionNumber + noteBlockGapCount - 1}`
              : ""}
          </p>
        )
      ) : t === ReadingQuestionType.SUMMARY_COMPLETION && summaryGapUi ? (
        q.questionText?.trim() ? (
          <p className="text-base font-bold text-gray-900 leading-snug">
            {q.questionText}
          </p>
        ) : (
          <p className="text-sm font-semibold text-gray-700">
            Questions {questionNumber}
            {noteBlockGapCount > 1
              ? `–${questionNumber + noteBlockGapCount - 1}`
              : ""}
          </p>
        )
      ) : flowchartGapUi ? (
        !q.questionText?.trim() ? (
          <p className="text-sm font-semibold text-gray-700 text-center">
            Questions {questionNumber}
            {countFlowchartGapTokens(q.options ?? []) > 1
              ? `–${questionNumber + countFlowchartGapTokens(q.options ?? []) - 1}`
              : ""}
          </p>
        ) : null
      ) : tableGapUi ? (
        !q.questionText?.trim() ? (
          <p className="text-sm font-semibold text-gray-700 text-center">
            Questions {questionNumber}
            {tableGapCount > 1
              ? `–${questionNumber + tableGapCount - 1}`
              : ""}
          </p>
        ) : null
      ) : t === ReadingQuestionType.MATCHING_FEATURES ? (
        q.questionText?.trim() ? (
          <p className="text-base font-bold text-gray-900 text-center leading-snug">
            {q.questionText}
          </p>
        ) : (
          <p className="text-sm font-semibold text-gray-700 text-center">
            Questions {questionNumber}
            {(q.options?.length ?? 0) > 1
              ? ` – ${questionNumber + (q.options?.length ?? 0) - 1}`
              : ""}
          </p>
        )
      ) : t === ReadingQuestionType.LIST_MATCHING ||
        t === ReadingQuestionType.CLASSIFICATION ? (
        <p className="text-sm font-semibold text-gray-700 text-center">
          Questions {questionNumber}
          {(q.options?.length ?? 0) > 1
            ? ` – ${questionNumber + (q.options?.length ?? 0) - 1}`
            : ""}
        </p>
      ) : t === ReadingQuestionType.DIAGRAM_LABEL_COMPLETION ? (
        <p className="text-sm font-semibold text-gray-700 text-center">
          Questions {questionNumber}
          {diagramGapCount > 1
            ? ` – ${questionNumber + diagramGapCount - 1}`
            : ""}
        </p>
      ) : (
        <p className="text-base font-semibold text-gray-900 leading-snug">
          {questionNumber}. {q.questionText}
        </p>
      )}

      {/* ── Answer input by type ── */}

      {/* TRUE/FALSE/NOT GIVEN */}
      {(t === ReadingQuestionType.TRUE_FALSE_NOT_GIVEN ||
        t === ReadingQuestionType.YES_NO_NOT_GIVEN) && (
        <div className="flex gap-2">
          {(t === ReadingQuestionType.YES_NO_NOT_GIVEN
            ? YNNG_OPTS
            : TFNG_OPTS
          ).map((opt) => (
            <button
              key={opt}
              onClick={() => onAnswer(opt)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                strAnswer === opt
                  ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* MCQ Single */}
      {(t === ReadingQuestionType.MCQ_SINGLE ||
        t === ReadingQuestionType.TITLE_SUBTITLE_FINDING) && (
        <div className="space-y-2">
          {(q.options ?? []).map((opt, i) => (
            <label
              key={i}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                strAnswer === opt
                  ? "bg-primary-50 border-primary-400 shadow-sm"
                  : "bg-white border-gray-200 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name={`q-${q._id}`}
                checked={strAnswer === opt}
                onChange={() => onAnswer(opt)}
                className="text-primary-600"
              />
              <span className="font-mono text-xs text-gray-500">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-sm text-gray-800">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {/* MCQ Multiple */}
      {t === ReadingQuestionType.MCQ_MULTIPLE && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Select all that apply</p>
          {(q.options ?? []).map((opt, i) => (
            <label
              key={i}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                arrAnswer.includes(opt)
                  ? "bg-primary-50 border-primary-400 shadow-sm"
                  : "bg-white border-gray-200 hover:bg-gray-50"
              }`}
            >
              <input
                type="checkbox"
                checked={arrAnswer.includes(opt)}
                onChange={() => toggleMulti(opt)}
                className="text-primary-600 rounded"
              />
              <span className="font-mono text-xs text-gray-500">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-sm text-gray-800">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {t === ReadingQuestionType.NOTE_COMPLETION && (
        <NoteCompletionGaps
          lines={q.options ?? []}
          answer={arrAnswer}
          onChange={onAnswer}
          firstQuestionNumber={questionNumber}
        />
      )}

      {t === ReadingQuestionType.SHORT_ANSWER && shortAnswerGapUi && (
        <NoteCompletionGaps
          lines={q.options ?? []}
          answer={arrAnswer}
          onChange={onAnswer}
          firstQuestionNumber={questionNumber}
        />
      )}

      {t === ReadingQuestionType.SUMMARY_COMPLETION && summaryGapUi && (
        <div className="space-y-3">
          {(q.wordBank?.filter((word) => word.trim()).length ?? 0) > 0 && (
            <div className="rounded-sm bg-gray-100 p-3">
              <p className="mb-2 text-sm font-bold text-gray-950">Clue list</p>
              <div className="flex flex-wrap gap-2">
                {q.wordBank
                  ?.filter((word) => word.trim())
                  .map((word, index) => (
                    <span
                      key={`${word}-${index}`}
                      className="rounded-sm border border-gray-300 bg-white px-2.5 py-1 text-sm text-gray-900"
                    >
                      <strong className="mr-1">
                        {String.fromCharCode(65 + index)}
                      </strong>
                      {word}
                    </span>
                  ))}
              </div>
            </div>
          )}
          <NoteCompletionGaps
            lines={q.options ?? []}
            answer={arrAnswer}
            onChange={onAnswer}
            firstQuestionNumber={questionNumber}
            showBullet={false}
            appearance="summary"
            emptyLinePlaceholder="Summary paragraph…"
          />
        </div>
      )}

      {flowchartGapUi && (
        <FlowchartCompletionPanel
          title={q.questionText ?? ""}
          rows={q.options ?? []}
          hints={(q.wordBank ?? []).filter((w) => (w ?? "").trim().length > 0)}
          answer={arrAnswer}
          onChange={onAnswer}
        />
      )}

      {tableGapUi && (
        <TableCompletionPanel
          title={q.questionText ?? ""}
          firstQuestionNumber={questionNumber}
          options={q.options ?? []}
          hints={(q.wordBank ?? []).filter((w) => (w ?? "").trim().length > 0)}
          answer={arrAnswer}
          onChange={onAnswer}
        />
      )}

      {diagramGapUi && (
        <DiagramLabelCompletionPanel
          questionId={q._id}
          bankTitle={q.questionText ?? ""}
          gapHints={q.options ?? []}
          wordBank={q.wordBank ?? []}
          answer={arrAnswer}
          onChange={onAnswer}
          firstQuestionNumber={questionNumber}
        />
      )}

      {/* Fill / Sentence / Summary / Short Answer / Table / Flowchart */}
      {[
        ReadingQuestionType.FILL_IN_BLANKS,
        ReadingQuestionType.SENTENCE_COMPLETION,
        ReadingQuestionType.TABLE_COMPLETION,
        ReadingQuestionType.FLOWCHART_COMPLETION,
      ].includes(t) &&
        !flowchartGapUi &&
        !tableGapUi &&
        !diagramGapUi &&
        !(t === ReadingQuestionType.SHORT_ANSWER && shortAnswerGapUi) &&
        !(t === ReadingQuestionType.SUMMARY_COMPLETION && summaryGapUi) && (
        <input
          type="text"
          value={strAnswer}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder="Type your answer here..."
          className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
        />
      )}

      {t === ReadingQuestionType.SUMMARY_COMPLETION && !summaryGapUi && (
        <input
          type="text"
          value={strAnswer}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder="Type your answer here..."
          className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
        />
      )}

      {/* Matching sentence endings (IELTS-style: stems + ending bank) */}
      {t === ReadingQuestionType.MATCHING_SENTENCE_ENDINGS &&
        (q.wordBank?.length ?? 0) > 0 && (
          <MatchingSentenceEndings
            stems={q.options ?? []}
            endings={q.wordBank ?? []}
            answer={arrAnswer}
            onChange={onAnswer}
          />
        )}

      {/* Information matching — paragraph letter grid */}
      {t === ReadingQuestionType.MATCHING_INFORMATION && (
        <MatchingInformationGrid
          questionId={q._id}
          statements={q.options ?? []}
          columnLabels={q.wordBank ?? []}
          answer={arrAnswer}
          onChange={onAnswer}
          firstQuestionNumber={questionNumber}
        />
      )}

      {/* Statement matching — dashed letter slots + drag bank */}
      {t === ReadingQuestionType.MATCHING_FEATURES && (
        <StatementMatchingPanel
          questionId={q._id}
          statements={q.options ?? []}
          wordBank={q.wordBank ?? []}
          answer={arrAnswer}
          onChange={onAnswer}
          firstQuestionNumber={questionNumber}
        />
      )}

      {t === ReadingQuestionType.LIST_MATCHING && (
        <ListMatchingPanel
          questionId={q._id}
          purposes={q.options ?? []}
          wordBank={q.wordBank ?? []}
          bankTitle={q.questionText ?? ""}
          answer={arrAnswer}
          onChange={onAnswer}
          firstQuestionNumber={questionNumber}
        />
      )}

      {t === ReadingQuestionType.CLASSIFICATION && (
        <ListMatchingPanel
          questionId={q._id}
          purposes={q.options ?? []}
          wordBank={q.wordBank ?? []}
          bankTitle={q.questionText ?? ""}
          answer={arrAnswer}
          onChange={onAnswer}
          firstQuestionNumber={questionNumber}
          visualVariant="classification"
        />
      )}

      {/* Other matching types — drag letters from bank into slots */}
      {[
        ReadingQuestionType.MATCHING_HEADINGS,
        ReadingQuestionType.MATCHING_SENTENCE_ENDINGS,
      ].includes(t) &&
        !(
          t === ReadingQuestionType.MATCHING_SENTENCE_ENDINGS &&
          (q.wordBank?.length ?? 0) > 0
        ) && (
          <MatchingDragDrop
            slotTexts={q.options ?? []}
            bankTexts={
              t === ReadingQuestionType.MATCHING_HEADINGS &&
              (q.wordBank?.length ?? 0) > 0
                ? (q.wordBank ?? [])
                : (q.options ?? [])
            }
            isMatchingHeadings={t === ReadingQuestionType.MATCHING_HEADINGS}
            hasSeparateHeadingBank={
              t === ReadingQuestionType.MATCHING_HEADINGS &&
              (q.wordBank?.length ?? 0) > 0
            }
            answer={arrAnswer}
            onChange={onAnswer}
            layout={
              t === ReadingQuestionType.MATCHING_HEADINGS &&
              (q.wordBank?.length ?? 0) > 0
                ? "bankOnly"
                : "both"
            }
          />
        )}

      {/* Drag and Drop — word bank */}
      {t === ReadingQuestionType.DRAG_AND_DROP && (
        <DragDropWordBank
          wordBank={q.wordBank ?? []}
          answer={arrAnswer}
          onChange={onAnswer}
        />
      )}

      {/* Clear answer */}
      {(strAnswer ||
        arrAnswer.some((x) => String(x ?? "").trim().length > 0)) && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          <FiX className="w-3 h-3" />
          Clear answer
        </button>
      )}
    </div>
  );
};

const MATCHING_LETTER_MIME = "application/x-lexora-matching-letter";

/* ─── Matching Sentence Endings (IELTS-style stems + bank) ─ */

interface MatchingSentenceEndingsProps {
  stems: string[];
  endings: string[];
  answer: string[];
  onChange: (arr: string[]) => void;
}

const MatchingSentenceEndings: React.FC<MatchingSentenceEndingsProps> = ({
  stems,
  endings,
  answer,
  onChange,
}) => {
  const [overSlot, setOverSlot] = useState<number | null>(null);
  const letters = endings.map((_, i) => String.fromCharCode(65 + i));
  const placedLetters = new Set(
    answer.map((a) => ((a ?? "") as string).trim()).filter(Boolean),
  );
  const slotCount = stems.length;

  const getArr = () => {
    if (slotCount <= 0) return [];
    const base = new Array(slotCount).fill("");
    answer.forEach((v, i) => {
      if (i < slotCount) base[i] = ((v ?? "") as string).trim();
    });
    return base;
  };

  const readLetterFromDragEvent = (e: React.DragEvent) =>
    e.dataTransfer.getData(MATCHING_LETTER_MIME).trim().toUpperCase();

  const applyLetterToSlot = (slotIdx: number, letter: string) => {
    if (!letter || !/^[A-Z]$/.test(letter)) return;
    if (!letters.includes(letter)) return;
    const arr = getArr();
    const prev = arr.indexOf(letter);
    if (prev !== -1) arr[prev] = "";
    arr[slotIdx] = letter;
    onChange(arr);
  };

  const onDropSlot = (e: React.DragEvent, slotIdx: number) => {
    e.preventDefault();
    const letter = readLetterFromDragEvent(e);
    if (letter) applyLetterToSlot(slotIdx, letter);
    setOverSlot(null);
  };

  const removeFromSlot = (slotIdx: number) => {
    const arr = getArr();
    arr[slotIdx] = "";
    onChange(arr);
  };

  const startDragLetter = (e: React.DragEvent, letter: string) => {
    e.dataTransfer.setData(MATCHING_LETTER_MIME, letter);
    e.dataTransfer.effectAllowed = "move";
  };

  const endingForLetter = (letter: string) => {
    const idx = letter.charCodeAt(0) - 65;
    if (idx < 0 || idx >= endings.length) return "";
    return endings[idx] ?? "";
  };

  const nonBlankEndings = endings.filter((t) => (t ?? "").trim()).length;

  return (
    <div className="space-y-5">
      {nonBlankEndings > slotCount && slotCount > 0 && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          There are more endings than gaps — some options are distractors.
          Each ending can only be used once.
        </p>
      )}
      <div className="space-y-4">
        {stems.map((stem, i) => {
          const placed = (answer[i] ?? "").trim();
          const isOver = overSlot === i;
          return (
            <div
              key={i}
              className="flex flex-wrap items-stretch gap-x-2 gap-y-2 rounded-lg bg-white/80 p-1"
            >
              <p className="text-sm text-gray-900 leading-relaxed flex-1 min-w-[min(100%,280px)]">
                {stem.trim() ? (
                  <span>{stem.trim()}</span>
                ) : (
                  <span className="text-gray-400 italic">Sentence stem…</span>
                )}
              </p>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverSlot(i);
                }}
                onDragLeave={() => setOverSlot(null)}
                onDrop={(e) => onDropSlot(e, i)}
                className={`shrink-0 self-center flex flex-col items-center justify-center min-w-[52px] max-w-[min(100%,220px)] min-h-[44px] px-1.5 py-1 rounded-md border-2 border-dashed transition-all duration-150 ${
                  placed
                    ? "border-rose-400 bg-rose-50"
                    : isOver
                      ? "border-rose-500 bg-rose-100/80 scale-[1.02]"
                      : "border-rose-300 bg-rose-50/50"
                }`}
              >
                {placed ? (
                  <div className="flex flex-col items-center gap-1 w-full">
                    <span className="text-xs font-bold text-rose-900 tabular-nums">
                      {i + 1}
                    </span>
                    <span
                      draggable
                      onDragStart={(e) => startDragLetter(e, placed)}
                      title={endingForLetter(placed)}
                      className="text-[11px] leading-snug text-gray-900 text-center line-clamp-4 cursor-grab active:cursor-grabbing w-full"
                    >
                      {endingForLetter(placed) || placed}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromSlot(i)}
                      className="text-[10px] text-gray-400 hover:text-red-500"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-rose-700/90 tabular-nums">
                    {i + 1}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border-2 border-dashed border-rose-300 bg-gradient-to-b from-rose-50/80 to-white p-4 shadow-inner">
        <p className="text-xs font-semibold text-rose-900/85 mb-3 uppercase tracking-wide">
          Drag an ending into each gap above
        </p>
        <div className="space-y-2">
          {letters.map((letter, i) => {
            const text = (endings[i] ?? "").trim();
            const isPlaced = placedLetters.has(letter);
            if (!text) return null;
            return (
              <div
                key={letter}
                draggable={!isPlaced}
                onDragStart={(e) => {
                  if (!isPlaced) startDragLetter(e, letter);
                }}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all duration-150 select-none ${
                  isPlaced
                    ? "opacity-40 bg-gray-100 border-gray-200 cursor-default"
                    : "bg-white border-rose-200 hover:border-rose-400 hover:bg-rose-50/60 cursor-grab shadow-sm"
                }`}
              >
                <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md bg-rose-800 text-white text-xs font-bold">
                  {letter}
                </span>
                <span className="text-sm text-gray-800 leading-snug">
                  {text}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ─── Matching Drag & Drop ──────────────────────────────────
 *  slotTexts = one row per paragraph / item (drop targets).
 *  bankTexts = lettered choices (A, B, C…). For Matching Headings the bank
 *  is usually longer than slotTexts (distractor headings). Legacy: when
 *  bankTexts equals slotTexts, behaviour matches the old single-list UI.
 * ─────────────────────────────────────────────────────── */

interface MatchingDragDropProps {
  slotTexts: string[];
  bankTexts: string[];
  isMatchingHeadings?: boolean;
  /** Paragraph rows labelled A–E when headings come from wordBank */
  hasSeparateHeadingBank?: boolean;
  answer: string[];
  onChange: (arr: string[]) => void;
  /** Headings with a separate bank: show drop slots in passage column only */
  layout?: "both" | "passageSlotsOnly" | "bankOnly";
}

const MatchingDragDrop: React.FC<MatchingDragDropProps> = ({
  slotTexts,
  bankTexts,
  isMatchingHeadings = false,
  hasSeparateHeadingBank = false,
  answer,
  onChange,
  layout = "both",
}) => {
  const [overSlot, setOverSlot] = useState<number | null>(null);

  const bank = bankTexts.length > 0 ? bankTexts : slotTexts;
  const letters = bank.map((_, i) => String.fromCharCode(65 + i));
  const placedLetters = new Set(answer.filter(Boolean));
  const slotCount = slotTexts.length;

  const getArr = () => {
    if (slotCount <= 0) return [];
    const base = new Array(slotCount).fill("");
    answer.forEach((v, i) => {
      if (i < slotCount) base[i] = v;
    });
    return base;
  };

  const readLetterFromDragEvent = (e: React.DragEvent) =>
    e.dataTransfer.getData(MATCHING_LETTER_MIME).trim().toUpperCase();

  const applyLetterToSlot = (slotIdx: number, letter: string) => {
    if (!letter || !/^[A-Z]$/.test(letter)) return;
    if (!letters.includes(letter)) return;
    const arr = getArr();
    const prev = arr.indexOf(letter);
    if (prev !== -1) arr[prev] = "";
    arr[slotIdx] = letter;
    onChange(arr);
  };

  const onDropSlot = (e: React.DragEvent, slotIdx: number) => {
    e.preventDefault();
    const letter = readLetterFromDragEvent(e);
    if (letter) applyLetterToSlot(slotIdx, letter);
    setOverSlot(null);
  };

  const removeFromSlot = (slotIdx: number) => {
    const arr = getArr();
    arr[slotIdx] = "";
    onChange(arr);
  };

  const startDragLetter = (e: React.DragEvent, letter: string) => {
    e.dataTransfer.setData(MATCHING_LETTER_MIME, letter);
    e.dataTransfer.effectAllowed = "move";
  };

  const showSlots = layout === "both" || layout === "passageSlotsOnly";
  const showBank = layout === "both" || layout === "bankOnly";

  const slotBlock = showSlots && (
    <div className="space-y-2">
      {slotTexts.map((opt, i) => {
        const placed = (answer[i] ?? "").trim();
        const isOver = overSlot === i;
        return (
          <div
            key={i}
            className={`flex flex-wrap items-start gap-2 sm:gap-3 rounded-lg border bg-white p-2.5 sm:p-3 ${
              layout === "passageSlotsOnly"
                ? "border-primary-200 shadow-sm"
                : "border-gray-200 shadow-sm"
            }`}
          >
            <span className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-gray-100 text-[11px] sm:text-xs font-bold text-gray-700">
              {isMatchingHeadings && hasSeparateHeadingBank
                ? String.fromCharCode(65 + i)
                : String(i + 1)}
            </span>
            <span className="flex-1 min-w-[120px] text-sm text-gray-800 leading-snug">
              {opt || (
                <span className="text-gray-400 italic">Paragraph</span>
              )}
            </span>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setOverSlot(i);
              }}
              onDragLeave={() => setOverSlot(null)}
              onDrop={(e) => onDropSlot(e, i)}
              className={`shrink-0 min-w-[88px] min-h-[36px] px-2 flex items-center justify-center rounded-md border-2 transition-all duration-150 ${
                placed
                  ? "border-primary-500 bg-primary-100"
                  : isOver
                    ? "border-primary-600 bg-primary-50 scale-[1.02]"
                    : "border-dashed border-primary-400/70 bg-primary-50/40"
              }`}
            >
              {placed ? (
                <div className="flex items-center gap-1">
                  <span
                    draggable
                    onDragStart={(e) => startDragLetter(e, placed)}
                    className="text-xs font-bold text-primary-900 cursor-grab active:cursor-grabbing select-none"
                  >
                    {placed}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFromSlot(i)}
                    className="text-gray-400 hover:text-red-500 transition-colors text-xs leading-none"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <span className="text-[11px] text-primary-700/80 font-medium select-none text-center">
                  Drop heading
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const bankBlock = showBank && (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      {layout === "bankOnly" &&
        isMatchingHeadings &&
        bank.length > slotCount && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
            Extra headings are distractors. Drop your choices into the passage
            on the left.
          </p>
        )}
      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
        {layout === "bankOnly" && isMatchingHeadings
          ? "Drag a heading into the passage (left)"
          : isMatchingHeadings
            ? "Drag a heading letter into each paragraph slot"
            : "Drag options to the slots above"}
      </p>
      <div className="space-y-1.5">
        {letters.map((letter, i) => {
          const isPlaced = placedLetters.has(letter);
          return (
            <div
              key={letter}
              draggable={!isPlaced}
              onDragStart={(e) => {
                if (!isPlaced) startDragLetter(e, letter);
              }}
              className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all duration-150 select-none ${
                isPlaced
                  ? "opacity-35 bg-gray-100 border-gray-200 cursor-default"
                  : "bg-white border-gray-200 hover:border-primary-400 hover:bg-primary-50 cursor-grab shadow-sm"
              }`}
            >
              <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded bg-gray-800 text-white text-xs font-bold">
                {letter}
              </span>
              <span className="text-sm text-gray-800 leading-snug">
                {bank[i] ?? ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {showSlots &&
        showBank &&
        isMatchingHeadings &&
        bank.length > slotCount && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            More headings than paragraphs — some headings are distractors.
            Each heading letter can only be used once.
          </p>
        )}

      {slotBlock}
      {bankBlock}
    </div>
  );
};

/* ─── Drag & Drop Word Bank ─────────────────────────────── */

interface DragDropWordBankProps {
  wordBank: string[];
  answer: string[];
  onChange: (val: string[]) => void;
}

const DragDropWordBank: React.FC<DragDropWordBankProps> = ({
  wordBank,
  answer,
  onChange,
}) => {
  const [dragging, setDragging] = useState<string | null>(null);
  const [overSlot, setOverSlot] = useState<number | null>(null);

  const slotCount = Math.max(answer.length, wordBank.length);

  const getArr = () => {
    const base = new Array(slotCount).fill("");
    answer.forEach((v, i) => {
      base[i] = v;
    });
    return base;
  };

  const placed = new Set(answer.filter(Boolean));
  const available = wordBank.filter((w) => !placed.has(w));

  const dropOnSlot = (slotIdx: number) => {
    if (!dragging) return;
    const arr = getArr();
    const prev = arr.indexOf(dragging);
    if (prev !== -1) arr[prev] = "";
    arr[slotIdx] = dragging;
    onChange(arr);
    setDragging(null);
    setOverSlot(null);
  };

  const removeFromSlot = (slotIdx: number) => {
    const arr = getArr();
    arr[slotIdx] = "";
    onChange(arr);
  };

  const startDragFromSlot = (word: string) => {
    setDragging(word);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {getArr().map((word, i) => {
          const isOver = overSlot === i;
          return (
            <div
              key={i}
              onDragOver={(e) => {
                e.preventDefault();
                setOverSlot(i);
              }}
              onDragLeave={() => setOverSlot(null)}
              onDrop={() => dropOnSlot(i)}
              className={`flex items-center gap-1.5 min-w-[110px] h-10 px-3 rounded-xl border-2 transition-all duration-150 ${
                word
                  ? "border-primary-400 bg-primary-50"
                  : isOver
                    ? "border-primary-500 bg-blue-50 scale-105"
                    : "border-dashed border-gray-300 bg-white"
              }`}
            >
              <span className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold">
                {i + 1}
              </span>
              {word ? (
                <>
                  <span
                    draggable
                    onDragStart={() => startDragFromSlot(word)}
                    onDragEnd={() => setDragging(null)}
                    className="text-sm font-medium text-primary-900 cursor-grab active:cursor-grabbing select-none flex-1 truncate"
                  >
                    {word}
                  </span>
                  <button
                    onClick={() => removeFromSlot(i)}
                    className="text-gray-400 hover:text-red-500 transition-colors text-sm leading-none shrink-0"
                    title="Remove"
                  >
                    ×
                  </button>
                </>
              ) : (
                <span className="text-xs text-gray-400 select-none flex-1">
                  Drop here
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
        <p className="text-xs font-semibold text-blue-600 mb-2 uppercase tracking-wide">
          Word Bank — drag to fill the blanks above
        </p>
        <div className="flex flex-wrap gap-2">
          {available.map((word, i) => (
            <div
              key={i}
              draggable
              onDragStart={() => setDragging(word)}
              onDragEnd={() => setDragging(null)}
              className={`px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-sm text-gray-800 select-none transition-all duration-150 ${
                dragging === word
                  ? "opacity-50 scale-95 cursor-grabbing"
                  : "cursor-grab hover:border-primary-500 hover:bg-primary-50 shadow-sm"
              }`}
            >
              {word}
            </div>
          ))}
          {available.length === 0 && (
            <p className="text-xs text-blue-500 italic">
              All words placed — drag from a slot to rearrange
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReadingTestPage;
