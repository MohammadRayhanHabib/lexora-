import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiArrowRight,
  FiPause,
  FiPlay,
  FiSettings,
  FiEdit3,
  FiLogOut,
  FiCheck,
  FiMenu,
  FiBookmark,
  FiChevronLeft,
  FiChevronRight,
  FiEye,
  FiSend,
  FiType,
  FiX,
} from "react-icons/fi";
import { mockExamApi, IMockExam, IMockExamAttempt } from "../../api/mockExam";
import {
  readingApi,
  IReadingTest,
  IReadingQuestionStudent,
  IReadingAnswerEntry,
  ReadingQuestionType,
  countFlowchartGapTokens,
  countNoteCompletionGaps,
  countTableGapTokens,
  FLOWCHART_GAP_TOKEN,
} from "../../api/reading";
import {
  getListeningTest,
  startListeningAttempt,
  submitListeningAttempt,
} from "../../api/listening";
import ListeningWorkspace from "../../components/listening/ListeningWorkspace";
import TableCompletionPanel from "../../components/reading/TableCompletionPanel";
import MatchingInformationGrid from "../../components/reading/MatchingInformationGrid";
import StatementMatchingPanel from "../../components/reading/StatementMatchingPanel";
import ListMatchingPanel from "../../components/reading/ListMatchingPanel";
import DiagramLabelCompletionPanel from "../../components/reading/DiagramLabelCompletionPanel";
import NoteCompletionGaps from "../../components/reading/NoteCompletionGaps";
import SentenceEndingMatchingPanel from "../../components/reading/SentenceEndingMatchingPanel";
import {
  writingApi,
  IWritingModule,
  WritingSessionMode,
} from "../../api/writing";
import { PageLoader } from "../../components/ui/Spinner";
import {
  READING_SHOWCASE_EXAMPLES_PER_TYPE,
  READING_PART_1_SHOWCASE_ATTEMPT,
  READING_PART_1_SHOWCASE_EXAM,
  READING_PART_1_SHOWCASE_QUESTIONS,
  READING_PART_1_SHOWCASE_TEST,
} from "../../data/readingPart1Showcase";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type ExamSection =
  | "intro"
  | "listening"
  | "reading"
  | "writing"
  | "speaking"
  | "done";

type ExamOptionsView = "menu" | "contrast" | "text-size";
type ExamContrastMode =
  | "black-on-white"
  | "white-on-black"
  | "yellow-on-black";
type ExamTextSize = "base" | "lg" | "xl";

interface ReadingPart {
  testId: string;
  test: IReadingTest;
  questions: IReadingQuestionStudent[];
  attemptId: string | null;
  offset: number; // how many questions precede this part
}

interface ReadingAnnotation {
  id: string;
  partId: string;
  start: number;
  end: number;
  text: string;
  kind: "highlight" | "note";
  note?: string;
}

interface PendingReadingSelection {
  partId: string;
  start: number;
  end: number;
  text: string;
  top: number;
  left: number;
  placement: "above" | "below";
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

interface IELTSExamPageProps {
  /** Local, read-only-data client preview. It never calls or mutates the API. */
  showcase?: boolean;
}

const IELTSExamPage: React.FC<IELTSExamPageProps> = ({ showcase = false }) => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [pageState, setPageState] = useState<"loading" | "ready">("loading");
  const [exam, setExam] = useState<IMockExam | null>(null);
  const [mockAttempt, setMockAttempt] = useState<IMockExamAttempt | null>(null);
  const [section, setSection] = useState<ExamSection>("intro");

  // ── Reading state ──────────────────────────────────────────
  const [readingParts, setReadingParts] = useState<ReadingPart[]>([]);
  const [readingAnswers, setReadingAnswers] = useState<
    Record<string, string | string[]>
  >({});
  const [activeQNum, setActiveQNum] = useState(1); // 1-indexed across all parts
  const [readingSecondsLeft, setReadingSecondsLeft] = useState(0);
  const [flaggedReadingQuestions, setFlaggedReadingQuestions] = useState<
    Set<number>
  >(new Set());
  const [readingAnnotations, setReadingAnnotations] = useState<
    ReadingAnnotation[]
  >([]);
  const [readingAnnotationDrafts, setReadingAnnotationDrafts] = useState<
    Record<string, string>
  >({});
  const [activeReadingNoteId, setActiveReadingNoteId] = useState<string | null>(
    null,
  );
  const [deletingReadingNoteId, setDeletingReadingNoteId] = useState<
    string | null
  >(null);
  const [paused, setPaused] = useState(false);
  const readingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const readingAutoSaveRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const sectionBootstrappedRef = useRef<ExamSection | null>(null);
  const pausedRef = useRef(paused);
  const readingAnswersRef = useRef(readingAnswers);
  readingAnswersRef.current = readingAnswers;

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // ── Listening state ────────────────────────────────────────
  const [listeningTest, setListeningTest] = useState<any>(null);
  const [listeningAnswers, setListeningAnswers] = useState<
    Record<string, string>
  >({});
  const listeningAnswersRef = useRef(listeningAnswers);
  listeningAnswersRef.current = listeningAnswers;
  const [listeningActiveSection, setListeningActiveSection] = useState(0);
  const [listeningSecondsLeft, setListeningSecondsLeft] = useState(0);
  const listeningTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listeningAttemptIdRef = useRef<string | null>(null);

  // ── Writing state ──────────────────────────────────────────
  const [writingModules, setWritingModules] = useState<IWritingModule[]>([]);
  const [writingSessionIds, setWritingSessionIds] = useState<string[]>([]);
  const [writingTexts, setWritingTexts] = useState<string[]>(["", ""]);
  const [activeWritingTask, setActiveWritingTask] = useState(0);
  const [writingSecondsLeft, setWritingSecondsLeft] = useState(0);
  const writingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── UI shared ──────────────────────────────────────────────
  const [answeringSeconds, setAnsweringSeconds] = useState(0);
  const answerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [fontSize, setFontSize] = useState<ExamTextSize>("base");
  const [contrastMode, setContrastMode] =
    useState<ExamContrastMode>("black-on-white");
  const [optionsView, setOptionsView] = useState<ExamOptionsView | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!optionsView) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOptionsView(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [optionsView]);

  // ── Load exam + start attempt ──────────────────────────────
  const initExam = useCallback(async () => {
    if (showcase) {
      setExam(READING_PART_1_SHOWCASE_EXAM);
      setMockAttempt(READING_PART_1_SHOWCASE_ATTEMPT);
      setReadingParts([
        {
          testId: READING_PART_1_SHOWCASE_TEST._id,
          test: READING_PART_1_SHOWCASE_TEST,
          questions: READING_PART_1_SHOWCASE_QUESTIONS,
          attemptId: null,
          offset: 0,
        },
      ]);
      setReadingSecondsLeft(READING_PART_1_SHOWCASE_EXAM.readingDuration * 60);
      setActiveQNum(1);
      setSection("reading");
      setPageState("ready");
      return;
    }
    if (!examId) return;
    try {
      const [examRes, attemptRes] = await Promise.all([
        mockExamApi.getExam(examId),
        mockExamApi.startAttempt(examId),
      ]);
      const e = examRes.data.data!;
      const { attempt } = attemptRes.data.data!;
      setExam(e);
      setMockAttempt(attempt);

      // Determine section from status
      const statusMap: Record<string, ExamSection> = {
        in_progress: "intro",
        listening_done: "reading",
        reading_done: "writing",
        writing_done: "speaking",
        completed: "done",
      };
      setSection(statusMap[attempt.status] ?? "intro");
      setReadingSecondsLeft(e.readingDuration * 60);
      setListeningSecondsLeft(e.listeningDuration * 60);
      setWritingSecondsLeft(e.writingDuration * 60);
      setPageState("ready");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load exam");
    }
  }, [examId, showcase]);

  useEffect(() => {
    initExam();
  }, [initExam]);

  // ── Answering duration clock (counts up) ──────────────────
  useEffect(() => {
    if (section === "intro" || section === "done") return;
    answerTimerRef.current = setInterval(() => {
      if (!paused) setAnsweringSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(answerTimerRef.current!);
  }, [section, paused]);

  // ── Start Reading (listening submit chains into this) ─────
  const startReading = useCallback(async () => {
    if (!exam) return;
    const partIds = [
      exam.readingPart1Id,
      exam.readingPart2Id,
      exam.readingPart3Id,
    ].filter(Boolean) as string[];
    if (!partIds.length) {
      setSection("writing");
      return;
    }
    try {
      const loaded = await Promise.all(
        partIds.map(async (testId) => {
          const [testRes, startRes] = await Promise.all([
            readingApi.getTest(testId),
            readingApi.startAttempt(testId),
          ]);
          return {
            testId,
            test: testRes.data.data!.test,
            questions: testRes.data.data!.questions,
            attemptId: startRes.data.data!.attempt._id,
            offset: 0, // computed below
          } as ReadingPart;
        }),
      );
      // Compute offsets
      let off = 0;
      const withOffsets = loaded.map((p) => {
        const result = { ...p, offset: off };
        off += p.questions.length;
        return result;
      });
      setReadingParts(withOffsets);
      setActiveQNum(1);
      setSection("reading");
      startSectionTimer(
        readingTimerRef,
        readingSecondsLeft,
        setReadingSecondsLeft,
        handleReadingTimeout,
      );
      // Auto-save
      readingAutoSaveRef.current = setInterval(() => {
        autoSaveReading(readingAnswersRef.current, withOffsets);
      }, 30_000);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to start reading section",
      );
    }
  }, [exam, readingSecondsLeft]);

  const submitListeningSection = useCallback(async () => {
    if (!exam?.listeningTestId) return;
    setSubmitting(true);
    try {
      const result = await submitListeningAttempt(
        exam.listeningTestId,
        listeningAnswersRef.current,
        {
          attemptId: listeningAttemptIdRef.current ?? undefined,
          mode: "exam",
        },
      );
      const raw = result.data?.data?._id;
      const listeningAttemptId =
        raw != null
          ? typeof raw === "string"
            ? raw
            : String(raw)
          : undefined;
      if (mockAttempt) {
        const updated = await mockExamApi.updateAttempt(mockAttempt._id, {
          listeningAttemptId,
          listeningScore: result.data?.data?.score,
          listeningTotalScore: result.data?.data?.totalQuestions,
          listeningBand: result.data?.data?.percentage
            ? Math.round((result.data.data.percentage / 100) * 9 * 2) / 2
            : undefined,
          status: "listening_done",
        });
        setMockAttempt(updated.data.data!);
      }
      clearInterval(listeningTimerRef.current!);
      await startReading();
    } catch {
      toast.error("Failed to submit listening");
    } finally {
      setSubmitting(false);
    }
  }, [exam, mockAttempt, startReading]);

  const handleListeningTimeout = useCallback(async () => {
    toast("⏰ Listening time's up!", { icon: "⏰" });
    await submitListeningSection();
  }, [submitListeningSection]);

  const startListening = useCallback(async () => {
    if (!exam?.listeningTestId || !mockAttempt) return;
    try {
      const startRes = await startListeningAttempt(
        exam.listeningTestId,
        "exam",
      );
      const payload = startRes.data.data;
      if (payload?.test) {
        setListeningTest(payload.test);
      } else {
        const testRes = await getListeningTest(exam.listeningTestId);
        setListeningTest(testRes.data.data ?? null);
      }
      const att =
        payload?.attempt ??
        (payload &&
        typeof payload === "object" &&
        "_id" in payload &&
        "userId" in payload
          ? payload
          : null);
      if (att && typeof att === "object" && "_id" in att && att._id) {
        listeningAttemptIdRef.current =
          typeof att._id === "string" ? att._id : String(att._id);
      }
      setListeningActiveSection(0);
      setSection("listening");
      const nextListeningSeconds = exam.listeningDuration * 60;
      setListeningSecondsLeft(nextListeningSeconds);
      startSectionTimer(
        listeningTimerRef,
        nextListeningSeconds,
        setListeningSecondsLeft,
        handleListeningTimeout,
      );
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ?? "Failed to start listening section",
      );
    }
  }, [exam, mockAttempt, handleListeningTimeout]);

  const handleReadingTimeout = useCallback(() => {
    toast("⏰ Reading time's up!", { icon: "⏰" });
    submitReadingSection();
  }, []);

  const autoSaveReading = async (
    answers: Record<string, string | string[]>,
    parts: ReadingPart[],
  ) => {
    for (const part of parts) {
      if (!part.attemptId) continue;
      const entries: IReadingAnswerEntry[] = part.questions
        .filter((q) => answers[q._id] !== undefined)
        .map((q) => ({ questionId: q._id, answer: answers[q._id] }));
      if (entries.length) {
        readingApi.autoSave(part.attemptId, entries).catch(() => {});
      }
    }
  };

  const calcReadingBand = (score: number) => {
    if (score >= 39) return 9.0;
    if (score >= 37) return 8.5;
    if (score >= 35) return 8.0;
    if (score >= 33) return 7.5;
    if (score >= 30) return 7.0;
    if (score >= 27) return 6.5;
    if (score >= 23) return 6.0;
    if (score >= 19) return 5.5;
    if (score >= 15) return 5.0;
    if (score >= 13) return 4.5;
    if (score >= 10) return 4.0;
    return 3.5;
  };

  const submitReadingSection = useCallback(async () => {
    if (!mockAttempt || !readingParts.length) return;
    if (mockAttempt.status === "reading_done") {
      await startWriting();
      return;
    }
    setSubmitting(true);
    clearInterval(readingTimerRef.current!);
    clearInterval(readingAutoSaveRef.current!);
    try {
      let totalScore = 0;
      let totalPossible = 0;
      const attemptIds: string[] = [];
      for (const part of readingParts) {
        if (!part.attemptId) continue;
        const entries: IReadingAnswerEntry[] = part.questions.map((q) => ({
          questionId: q._id,
          answer: readingAnswersRef.current[q._id] ?? "",
        }));
        const res = await readingApi.submitAttempt(part.attemptId, entries);
        const submitted = res.data.data!;
        totalScore += submitted.score ?? 0;
        totalPossible += submitted.totalScore ?? part.questions.length;
        attemptIds.push(part.attemptId);
      }
      const readingBand = calcReadingBand(totalScore);
      const updated = await mockExamApi.updateAttempt(mockAttempt._id, {
        readingAttempt1Id: attemptIds[0],
        readingAttempt2Id: attemptIds[1],
        readingAttempt3Id: attemptIds[2],
        readingScore: totalScore,
        readingTotalScore: totalPossible,
        readingBand,
        status: "reading_done",
      });
      setMockAttempt(updated.data.data!);
      toast.success("Reading submitted!");
      await startWriting();
    } catch {
      toast.error("Failed to submit reading");
    } finally {
      setSubmitting(false);
    }
  }, [mockAttempt, readingParts]);

  // ── Start Writing ──────────────────────────────────────────
  const startWriting = useCallback(async () => {
    if (!exam) return;
    const moduleIds = [exam.writingTask1Id, exam.writingTask2Id].filter(
      Boolean,
    ) as string[];
    if (!moduleIds.length) {
      setSection("speaking");
      return;
    }
    try {
      const modules = await Promise.all(
        moduleIds.map((id) =>
          writingApi.getModule(id).then((r) => r.data.data!),
        ),
      );
      const sessions = await Promise.all(
        moduleIds.map((id) =>
          writingApi
            .startSession(id, WritingSessionMode.EXAM, {
              allowRetake: true,
            })
            .then((r) => r.data.data!._id),
        ),
      );
      setWritingModules(modules);
      setWritingSessionIds(sessions);
      setWritingTexts((prev) =>
        prev
          .slice(0, modules.length)
          .concat(
            Array.from(
              { length: Math.max(0, modules.length - prev.length) },
              () => "",
            ),
          ),
      );
      setActiveWritingTask(0);
      setSection("writing");
      startSectionTimer(
        writingTimerRef,
        writingSecondsLeft,
        setWritingSecondsLeft,
        handleWritingTimeout,
      );
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to start writing section",
      );
    }
  }, [exam, writingSecondsLeft]);

  const handleWritingTimeout = useCallback(() => {
    toast("⏰ Writing time's up!", { icon: "⏰" });
    void submitWritingSection();
  }, []);

  const submitWritingSection = useCallback(async () => {
    if (!mockAttempt || !writingSessionIds.length) return;
    setSubmitting(true);
    clearInterval(writingTimerRef.current!);
    try {
      await Promise.all(
        writingSessionIds.map((sessionId, index) =>
          writingApi.submit(sessionId, writingTexts[index] ?? ""),
        ),
      );
      const updated = await mockExamApi.updateAttempt(mockAttempt._id, {
        status: "writing_done",
      });
      setMockAttempt(updated.data.data!);
      setSection("speaking");
    } catch {
      toast.error("Failed to submit writing");
    } finally {
      setSubmitting(false);
    }
  }, [mockAttempt, writingSessionIds, writingTexts]);

  // Resume mid-exam sections (e.g. reading after listening) without re-clicking Start
  useEffect(() => {
    if (pageState !== "ready" || !exam || !mockAttempt) return;
    if (section === "intro" || section === "done") return;
    if (sectionBootstrappedRef.current === section) return;

    if (section === "reading" && readingParts.length === 0) {
      sectionBootstrappedRef.current = section;
      void startReading();
    } else if (section === "writing" && writingModules.length === 0) {
      sectionBootstrappedRef.current = section;
      void startWriting();
    }
  }, [
    pageState,
    exam,
    mockAttempt,
    section,
    readingParts.length,
    writingModules.length,
    startReading,
    startWriting,
  ]);

  // ── Complete exam ──────────────────────────────────────────
  const completeExam = useCallback(async () => {
    if (!mockAttempt) return;
    try {
      const updated = await mockExamApi.updateAttempt(mockAttempt._id, {
        status: "completed",
      });
      setMockAttempt(updated.data.data!);
      navigate(`/exam/result/${mockAttempt._id}`);
    } catch {
      toast.error("Failed to complete exam");
    }
  }, [mockAttempt, navigate]);

  // ─────────────────────────────────────────────────────────
  // Timer helpers
  // ─────────────────────────────────────────────────────────

  function startSectionTimer(
    ref: React.MutableRefObject<ReturnType<typeof setInterval> | null>,
    initialSeconds: number,
    setter: React.Dispatch<React.SetStateAction<number>>,
    onTimeout: () => void,
  ) {
    if (ref.current) clearInterval(ref.current);
    setter(initialSeconds);
    ref.current = setInterval(() => {
      setter((s) => {
        if (pausedRef.current) return s;
        if (s <= 1) {
          clearInterval(ref.current!);
          onTimeout();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return h > 0 ? `${h}:${m}:${sec}` : `${m}:${sec}`;
  };

  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((s % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  // ─────────────────────────────────────────────────────────
  // Reading helpers
  // ─────────────────────────────────────────────────────────

  const totalReadingQuestions = readingParts.reduce(
    (s, p) => s + p.questions.length,
    0,
  );

  const getActivePart = () => {
    for (const part of readingParts) {
      const end = part.offset + part.questions.length;
      if (activeQNum <= end) return part;
    }
    return readingParts[readingParts.length - 1];
  };

  const getActiveQuestion = (): IReadingQuestionStudent | null => {
    const part = getActivePart();
    if (!part) return null;
    const localIdx = activeQNum - 1 - part.offset;
    return part.questions[localIdx] ?? null;
  };

  const isReadingAnswered = (globalNum: number) => {
    const part = readingParts.find(
      (p) => globalNum > p.offset && globalNum <= p.offset + p.questions.length,
    );
    if (!part) return false;
    const localIdx = globalNum - 1 - part.offset;
    const q = part.questions[localIdx];
    if (!q) return false;
    const a = readingAnswers[q._id];
    if (!a) return false;
    if (Array.isArray(a)) return a.some((v) => v?.trim());
    return a.trim().length > 0;
  };

  const setReadingAnswer = (qId: string, val: string | string[]) =>
    setReadingAnswers((prev) => ({ ...prev, [qId]: val }));

  const toggleReadingFlag = (questionNumber: number) =>
    setFlaggedReadingQuestions((previous) => {
      const next = new Set(previous);
      if (next.has(questionNumber)) next.delete(questionNumber);
      else next.add(questionNumber);
      return next;
    });

  const saveReadingAnnotationNote = (annotationId: string) => {
    const note = (readingAnnotationDrafts[annotationId] ?? "").trim();
    setReadingAnnotations((previous) =>
      previous.map((annotation) =>
        annotation.id === annotationId
          ? { ...annotation, note: note || undefined }
          : annotation,
      ),
    );
    setActiveReadingNoteId(null);
  };

  const deleteReadingAnnotation = (annotationId: string) => {
    setReadingAnnotations((previous) =>
      previous.filter((annotation) => annotation.id !== annotationId),
    );
    setReadingAnnotationDrafts((previous) => {
      const next = { ...previous };
      delete next[annotationId];
      return next;
    });
    setActiveReadingNoteId((current) =>
      current === annotationId ? null : current,
    );
    setDeletingReadingNoteId((current) =>
      current === annotationId ? null : current,
    );
  };

  const getReadingAnnotationPartNumber = (annotation: ReadingAnnotation) =>
    Math.max(
      1,
      readingParts.findIndex((part) => part.testId === annotation.partId) + 1,
    );

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────

  if (pageState === "loading") return <PageLoader />;
  if (!exam || !mockAttempt) return null;

  // Section label for header
  const sectionLabel =
    section === "listening"
      ? "Listening"
      : section === "reading"
        ? "Reading"
        : section === "writing"
          ? "Writing"
          : section === "speaking"
            ? "Speaking"
            : "";

  const currentSectionSeconds =
    section === "listening"
      ? listeningSecondsLeft
      : section === "reading"
        ? readingSecondsLeft
        : section === "writing"
          ? writingSecondsLeft
          : 0;

  const timerColor =
    currentSectionSeconds < 120
      ? "text-red-600"
      : currentSectionSeconds < 300
        ? "text-orange-500"
        : "text-[#c0392b]";

  const testLabel = exam.academicNumber
    ? `C${exam.academicNumber}${exam.testNumber ? ` Test ${exam.testNumber}` : ""} ${sectionLabel}`
    : `${exam.title} ${sectionLabel}`;

  const handleSubmitAction = () => {
    setOptionsView(null);
    if (showcase) {
      toast("Preview mode — answers are not submitted.");
      return;
    }
    if (section === "reading") {
      void submitReadingSection();
    } else if (section === "writing") {
      void submitWritingSection();
    } else if (section === "listening") {
      void submitListeningSection();
    } else {
      void completeExam();
    }
  };

  // ── Intro screen ───────────────────────────────────────────
  if (section === "intro") {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center z-50">
        <Helmet>
          <title>{exam.title} – IELTS Mock Exam – Lexora</title>
        </Helmet>
        <div className="max-w-2xl w-full mx-4">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 text-white text-center space-y-8">
            {/* Logo */}
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center text-white font-black text-lg">
                L
              </div>
              <div className="text-left">
                <p className="font-black text-lg leading-tight">LEXORA</p>
                <p className="text-xs text-white/60 tracking-widest">ACADEMY</p>
              </div>
            </div>

            <div>
              <h1 className="text-3xl font-black mb-2">{exam.title}</h1>
              {exam.description && (
                <p className="text-white/60 text-sm">{exam.description}</p>
              )}
            </div>

            {/* Sections */}
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  icon: "🎧",
                  label: "Listening",
                  duration: exam.listeningDuration,
                  enabled: !!exam.listeningTestId,
                },
                {
                  icon: "📖",
                  label: "Reading",
                  duration: exam.readingDuration,
                  enabled: !!(
                    exam.readingPart1Id ||
                    exam.readingPart2Id ||
                    exam.readingPart3Id
                  ),
                },
                {
                  icon: "✍️",
                  label: "Writing",
                  duration: exam.writingDuration,
                  enabled: !!(exam.writingTask1Id || exam.writingTask2Id),
                },
                {
                  icon: "🎙️",
                  label: "Speaking",
                  duration: exam.speakingDuration,
                  enabled: !!exam.speakingTestId,
                },
              ].map(({ icon, label, duration, enabled }) => (
                <div
                  key={label}
                  className={`flex items-center gap-3 p-4 rounded-xl border ${enabled ? "border-white/20 bg-white/10" : "border-white/5 opacity-40"}`}
                >
                  <span className="text-2xl">{icon}</span>
                  <div className="text-left">
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-white/50 text-xs">{duration} minutes</p>
                  </div>
                  {enabled && (
                    <FiCheck className="w-4 h-4 text-green-400 ml-auto" />
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-white/50 text-xs">
                ⚠️ Do not close the browser window during the exam. Your
                progress is auto-saved.
              </p>
              <button
                onClick={exam.listeningTestId ? startListening : startReading}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl text-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Start Exam →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Common exam shell ──────────────────────────────────────

  return (
    <div
      data-ielts-contrast={contrastMode}
      data-ielts-text-size={fontSize}
      className="ielts-exam-shell fixed inset-0 z-50 flex flex-col bg-[#f0f0f0]"
    >
      <Helmet>
        <title>{testLabel} – IELTS Exam – Lexora</title>
      </Helmet>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <header className="flex min-h-[68px] shrink-0 items-center justify-between border-b border-gray-300 bg-white px-4 py-2.5 shadow-[0_1px_0_rgba(0,0,0,0.04)] sm:px-6 lg:px-8 z-10">
        {/* Left: Logo + test info */}
        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          <div className="shrink-0 leading-none">
            <p className="text-[24px] font-black tracking-[-0.055em] text-[#b30d2f] sm:text-[29px]">
              LEXORA
            </p>
            <p className="mt-1 text-[8px] font-bold tracking-[0.34em] text-gray-500">
              ACADEMY
            </p>
          </div>
          <div className="min-w-0 border-l border-gray-300 pl-4 sm:pl-6">
            <p className="truncate text-sm font-bold leading-tight text-gray-900">
              {showcase
                ? "Client Preview"
                : `Candidate ${mockAttempt._id.slice(-8).toUpperCase()}`}
            </p>
            <p className={`mt-0.5 text-xs font-medium ${timerColor}`}>
              {section === "reading"
                ? `${Math.max(0, Math.ceil(readingSecondsLeft / 60))} minutes remaining`
                : `${formatTime(currentSectionSeconds)} remaining`}
            </p>
          </div>
          <span
            title={`Elapsed ${formatDuration(answeringSeconds)}`}
            className="hidden rounded-sm bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600 md:inline-flex"
          >
            {sectionLabel || "Mock exam"}
          </span>
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-1 sm:gap-2">
          {section === "reading" && (
            <span className={`hidden text-sm font-mono font-bold mr-3 ${timerColor}`}>
              ⏱ {formatTime(readingSecondsLeft)}
            </span>
          )}
          {section === "listening" && (
            <span className={`hidden text-sm font-mono font-bold mr-3 ${timerColor}`}>
              ⏱ {formatTime(listeningSecondsLeft)}
            </span>
          )}
          {section === "writing" && (
            <span className={`hidden text-sm font-mono font-bold mr-3 ${timerColor}`}>
              ⏱ {formatTime(writingSecondsLeft)}
            </span>
          )}

          <HeaderBtn
            onClick={() => setPaused((p) => !p)}
            label={paused ? "Resume" : "Pause"}
            icon={
              paused ? (
                <FiPlay className="w-3.5 h-3.5" />
              ) : (
                <FiPause className="w-3.5 h-3.5" />
              )
            }
          />
          <HeaderBtn
            onClick={handleSubmitAction}
            label={showcase ? "Preview Only" : "Submit"}
            icon={<FiCheck className="w-3.5 h-3.5" />}
            loading={submitting}
            primary
          />
          <HeaderBtn
            onClick={() => setShowSettings((s) => !s)}
            label="Settings"
            icon={<FiSettings className="w-3.5 h-3.5" />}
          />
          <HeaderBtn
            onClick={() => {
              if (showcase) {
                navigate("/login");
                return;
              }
              if (confirm("Save progress and exit?")) navigate("/mock-tests");
            }}
            label={showcase ? "Exit Preview" : "Save & Exit"}
            icon={<FiLogOut className="w-3.5 h-3.5" />}
          />
          <button
            type="button"
            onClick={() => {
              setShowSettings(false);
              setDeletingReadingNoteId(null);
              setShowNotes(false);
              setOptionsView("menu");
            }}
            aria-label="Open options"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-black bg-white text-black transition-colors hover:bg-neutral-50"
          >
            <FiMenu className="h-4 w-4" />
          </button>
          <HeaderBtn
            onClick={() => {
              setShowSettings(false);
              setOptionsView(null);
              setShowNotes((current) => {
                if (current) setDeletingReadingNoteId(null);
                return !current;
              });
            }}
            label="Note"
            icon={<FiEdit3 className="w-3.5 h-3.5" />}
          />
        </div>
      </header>

      {/* Pause overlay */}
      {paused && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-10 text-center shadow-2xl">
            <p className="text-2xl font-bold text-gray-900 mb-2">Exam Paused</p>
            <p className="text-gray-500 mb-6">
              Your progress is saved. Click Resume to continue.
            </p>
            <button
              onClick={() => setPaused(false)}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              Resume Exam
            </button>
          </div>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div className="absolute top-14 right-4 z-40 bg-white shadow-lg rounded-xl border border-gray-200 p-4 w-56 space-y-3">
          <p className="font-semibold text-gray-800 text-sm">Settings</p>
          <div>
            <p className="text-xs text-gray-500 mb-1">Font Size</p>
            <div className="flex gap-2">
              {(["base", "lg", "xl"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFontSize(s)}
                  className={`flex-1 py-1.5 rounded-lg text-xs border transition-colors ${fontSize === s ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                >
                  {s === "base" ? "A" : s === "lg" ? "A+" : "A++"}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => setShowSettings(false)}
            className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-700"
          >
            Close
          </button>
        </div>
      )}

      {optionsView && (
        <ExamOptionsOverlay
          view={optionsView}
          contrastMode={contrastMode}
          textSize={fontSize}
          submitting={submitting}
          onViewChange={setOptionsView}
          onClose={() => setOptionsView(null)}
          onSubmit={handleSubmitAction}
          onContrastChange={setContrastMode}
          onTextSizeChange={setFontSize}
        />
      )}

      {/* Notes sidebar */}
      {showNotes && (
        <aside
          aria-label="Notes"
          className={`ielts-notes-drawer absolute right-0 top-[68px] z-40 flex w-full flex-col border-l border-gray-400 bg-[#eeeeee] sm:w-[350px] ${
            section === "reading" ? "bottom-[88px]" : "bottom-0"
          }`}
        >
          <div className="flex min-h-12 shrink-0 items-center justify-between border-b border-gray-400 bg-white px-3">
            <h2 className="text-base font-medium text-gray-950">Notes</h2>
            <button
              type="button"
              onClick={() => {
                setDeletingReadingNoteId(null);
                setShowNotes(false);
              }}
              aria-label="Close notes"
              className="flex h-10 w-10 items-center justify-center text-gray-800 hover:bg-gray-100"
            >
              <FiX className="h-7 w-7" strokeWidth={2} />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
            {section === "reading" && readingAnnotations.length > 0 && (
              <div className="mb-3 max-h-[65%] space-y-2 overflow-y-auto border-b border-gray-300 pb-3">
                {readingAnnotations.map((annotation) => (
                  <div
                    key={annotation.id}
                    className={`rounded-sm border p-2.5 text-xs ${
                      annotation.kind === "note"
                        ? "ielts-selected-note-card border-sky-300 bg-sky-100 text-gray-900"
                        : "ielts-highlight-note-card border-amber-300 bg-amber-50 text-gray-800"
                    }`}
                  >
                    {annotation.kind === "note" && (
                      <p className="mb-1 font-bold">
                        Part{" "}
                        {Math.max(
                          1,
                          readingParts.findIndex(
                            (part) => part.testId === annotation.partId,
                          ) + 1,
                        )}
                      </p>
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-3 font-medium leading-relaxed">
                        “{annotation.text}”
                      </p>
                      {annotation.kind !== "note" && (
                        <button
                          type="button"
                          onClick={() => deleteReadingAnnotation(annotation.id)}
                          aria-label="Remove highlight"
                          className="shrink-0 text-gray-500 hover:text-red-600"
                        >
                          <FiX className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {annotation.kind === "note" && (
                      <>
                        <label
                          htmlFor={`reading-note-${annotation.id}`}
                          className="sr-only"
                        >
                          Note for selected passage
                        </label>
                        <textarea
                          id={`reading-note-${annotation.id}`}
                          value={
                            readingAnnotationDrafts[annotation.id] ??
                            annotation.note ??
                            ""
                          }
                          onChange={(event) =>
                            setReadingAnnotationDrafts((previous) => ({
                              ...previous,
                              [annotation.id]: event.target.value,
                            }))
                          }
                          autoFocus={activeReadingNoteId === annotation.id}
                          placeholder="Write a note for this selection..."
                          className="ielts-selected-note-input mt-2 min-h-24 w-full resize-y border border-sky-500 bg-white px-2 py-1.5 text-sm leading-relaxed text-gray-950 outline-none focus:ring-2 focus:ring-sky-500/30"
                        />
                        {deletingReadingNoteId === annotation.id ? (
                          <div
                            className="ielts-selected-note-delete-confirmation mt-3 border-t border-sky-400 pt-3"
                            role="group"
                            aria-live="polite"
                            aria-label={`Confirm deleting note from Part ${getReadingAnnotationPartNumber(annotation)}`}
                          >
                            <p className="text-sm leading-relaxed">
                              You are about to delete a note from Part{" "}
                              {getReadingAnnotationPartNumber(annotation)}
                            </p>
                            <div className="mt-3 flex items-center justify-end gap-6">
                              <button
                                type="button"
                                onClick={() => setDeletingReadingNoteId(null)}
                                className="ielts-selected-note-cancel px-1 py-1 text-sm font-medium"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  deleteReadingAnnotation(annotation.id)
                                }
                                className="ielts-selected-note-confirm px-1 py-1 text-sm font-medium"
                              >
                                Confirm deleting
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() =>
                                saveReadingAnnotationNote(annotation.id)
                              }
                              aria-label="Save selected-text note"
                              className="ielts-selected-note-save rounded-sm bg-gray-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-950"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeletingReadingNoteId(annotation.id)
                              }
                              aria-label="Delete selected-text note"
                              className="ielts-selected-note-delete px-1 py-1 text-xs font-medium text-sky-900 underline underline-offset-2 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            <label htmlFor="exam-general-notes" className="sr-only">
              General notes
            </label>
            <textarea
              id="exam-general-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Write your notes here..."
              className="min-h-[220px] flex-1 resize-none border-0 bg-transparent p-2 text-sm leading-relaxed text-gray-900 outline-none placeholder:text-gray-500"
            />
          </div>
        </aside>
      )}

      {/* ── SECTION BODY ───────────────────────────────────── */}
      <div
        className={`flex-1 overflow-hidden transition-[margin] duration-200 ${
          showNotes ? "sm:mr-[350px]" : ""
        }`}
      >
        {section === "listening" && (
          <ListeningWorkspace
            test={listeningTest}
            answers={listeningAnswers}
            activeSection={listeningActiveSection}
            onSectionChange={setListeningActiveSection}
            onAnswerChange={(id, val) =>
              setListeningAnswers((p) => ({ ...p, [id]: val }))
            }
            mode="exam"
            className="h-full"
          />
        )}

        {section === "reading" && readingParts.length > 0 && (
          <ReadingSection
            parts={readingParts}
            activeQNum={activeQNum}
            setActiveQNum={setActiveQNum}
            answers={readingAnswers}
            setAnswer={setReadingAnswer}
            totalQuestions={totalReadingQuestions}
            getActivePart={getActivePart}
            getActiveQuestion={getActiveQuestion}
            fontSize={fontSize}
            flaggedQuestions={flaggedReadingQuestions}
            onToggleFlag={toggleReadingFlag}
            annotations={readingAnnotations}
            onAddAnnotation={(annotation) => {
              setReadingAnnotations((previous) => [
                ...previous,
                annotation,
              ]);
              if (annotation.kind === "note") {
                setReadingAnnotationDrafts((previous) => ({
                  ...previous,
                  [annotation.id]: annotation.note ?? "",
                }));
                setActiveReadingNoteId(annotation.id);
              }
            }}
            onOpenNotes={() => {
              setShowSettings(false);
              setOptionsView(null);
              setShowNotes(true);
            }}
          />
        )}

        {section === "writing" && writingModules.length > 0 && (
          <WritingSection
            modules={writingModules}
            texts={writingTexts}
            setTexts={setWritingTexts}
            activeTask={activeWritingTask}
            setActiveTask={setActiveWritingTask}
            onSubmit={submitWritingSection}
            submitting={submitting}
          />
        )}

        {section === "speaking" && (
          <SpeakingSection
            examId={exam._id}
            speaking={exam.speakingTestId}
            onComplete={completeExam}
          />
        )}
      </div>

      {/* ── BOTTOM NAV (reading only) ───────────────────────── */}
      {section === "reading" && totalReadingQuestions > 0 && (
        <ReadingBottomNav
          totalQuestions={totalReadingQuestions}
          activeQNum={activeQNum}
          setActiveQNum={setActiveQNum}
          isAnswered={isReadingAnswered}
          parts={readingParts}
          flaggedQuestions={flaggedReadingQuestions}
        />
      )}
    </div>
  );
};

const ExamOptionsOverlay: React.FC<{
  view: ExamOptionsView;
  contrastMode: ExamContrastMode;
  textSize: ExamTextSize;
  submitting: boolean;
  onViewChange: (view: ExamOptionsView) => void;
  onClose: () => void;
  onSubmit: () => void;
  onContrastChange: (mode: ExamContrastMode) => void;
  onTextSizeChange: (size: ExamTextSize) => void;
}> = ({
  view,
  contrastMode,
  textSize,
  submitting,
  onViewChange,
  onClose,
  onSubmit,
  onContrastChange,
  onTextSizeChange,
}) => {
  const title =
    view === "contrast" ? "Contrast" : view === "text-size" ? "Text size" : "Options";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exam-options-title"
      className="ielts-options-overlay absolute inset-0 z-[80] overflow-y-auto bg-white"
    >
      <div className="relative min-h-full px-5 pb-16 pt-5 sm:px-10">
        {view !== "menu" && (
          <button
            type="button"
            onClick={() => onViewChange("menu")}
            className="absolute left-4 top-4 flex min-h-10 items-center gap-1 rounded-sm px-2 text-xl font-medium text-black hover:bg-gray-100 sm:left-7"
          >
            <FiChevronLeft className="h-7 w-7" strokeWidth={3} />
            <span>Options</span>
          </button>
        )}

        <h1
          id="exam-options-title"
          className="text-center text-[28px] font-medium leading-10 text-black"
        >
          {title}
        </h1>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close options"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-sm text-black hover:bg-gray-100 sm:right-7"
        >
          <FiX className="h-7 w-7" strokeWidth={3.5} />
        </button>

        <div className="mx-auto mt-7 w-full max-w-[700px]">
          {view === "menu" && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={onSubmit}
                disabled={submitting}
                className="ielts-options-primary flex min-h-[76px] w-full items-center gap-5 rounded-[3px] border border-[#bd0f2d] bg-[#ec1235] px-9 text-left text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#d80f30] disabled:opacity-60"
              >
                <FiSend className="h-6 w-6 shrink-0" />
                <span>Go to submission page</span>
                <FiChevronRight className="ml-auto h-7 w-7 shrink-0" strokeWidth={3.5} />
              </button>

              <div className="overflow-hidden rounded-[3px] border border-gray-300 bg-white">
                <button
                  type="button"
                  onClick={() => onViewChange("contrast")}
                  className="flex min-h-[76px] w-full items-center gap-5 border-b border-gray-300 px-9 text-left text-lg text-black transition-colors hover:bg-gray-100"
                >
                  <FiEye className="h-6 w-6 shrink-0 text-gray-400" />
                  <span>Contrast</span>
                  <FiChevronRight
                    className="ml-auto h-7 w-7 shrink-0"
                    strokeWidth={3.5}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => onViewChange("text-size")}
                  className="flex min-h-[76px] w-full items-center gap-5 px-9 text-left text-lg text-black transition-colors hover:bg-gray-100"
                >
                  <FiType className="h-6 w-6 shrink-0 text-gray-400" />
                  <span>Text size</span>
                  <FiChevronRight
                    className="ml-auto h-7 w-7 shrink-0"
                    strokeWidth={3.5}
                  />
                </button>
              </div>
            </div>
          )}

          {view === "contrast" && (
            <div className="overflow-hidden rounded-[3px] border border-gray-300 bg-white">
              {(
                [
                  ["black-on-white", "Black on white"],
                  ["white-on-black", "White on black"],
                  ["yellow-on-black", "Yellow on black"],
                ] as const
              ).map(([mode, label], index) => {
                const selected = contrastMode === mode;
                const sampleText =
                  mode === "yellow-on-black" ? "#ffd400" : mode === "white-on-black" ? "#ffffff" : "#111111";
                const sampleBackground =
                  mode === "black-on-white" ? "#ffffff" : "#050505";
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onContrastChange(mode)}
                    aria-pressed={selected}
                    className={`flex min-h-[74px] w-full items-center gap-5 px-10 text-left text-lg transition-colors hover:bg-gray-100 ${
                      index < 2 ? "border-b border-gray-300" : ""
                    }`}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                      {selected && <FiCheck className="h-5 w-5" strokeWidth={3.5} />}
                    </span>
                    <span>{label}</span>
                    <span
                      aria-hidden="true"
                      data-contrast-preview={mode}
                      className="ielts-contrast-preview ml-auto flex h-10 w-14 flex-col justify-center gap-1 border border-gray-300 px-2 shadow-sm"
                      style={{ backgroundColor: sampleBackground }}
                    >
                      {[0, 1, 2].map((line) => (
                        <span
                          key={line}
                          className="ielts-contrast-preview-line block h-0.5 w-full"
                          style={{ backgroundColor: sampleText }}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {view === "text-size" && (
            <div className="overflow-hidden rounded-[3px] border border-gray-300 bg-white">
              {(
                [
                  ["base", "Regular"],
                  ["lg", "Large"],
                  ["xl", "Extra large"],
                ] as const
              ).map(([size, label], index) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onTextSizeChange(size)}
                  aria-pressed={textSize === size}
                  className={`flex min-h-[74px] w-full items-center gap-5 px-10 text-left transition-colors hover:bg-gray-100 ${
                    index < 2 ? "border-b border-gray-300" : ""
                  } ${size === "base" ? "text-base" : size === "lg" ? "text-lg" : "text-xl"}`}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                    {textSize === size && (
                      <FiCheck className="h-5 w-5" strokeWidth={3.5} />
                    )}
                  </span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Header Button
// ─────────────────────────────────────────────────────────────

const HeaderBtn: React.FC<{
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  loading?: boolean;
  /** Stronger label weight (e.g. Submit) while keeping outline style. */
  primary?: boolean;
}> = ({ onClick, label, icon, loading, primary }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    aria-label={label}
    title={label}
    className={`flex h-9 items-center justify-center gap-1.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-50 ${
      primary
        ? "border border-gray-900 bg-gray-900 px-3 text-white hover:bg-black"
        : "w-9 text-gray-800 hover:bg-gray-100"
    }`}
  >
    {loading ? (
      <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
    ) : (
      icon
    )}
    <span className={primary ? "" : "sr-only"}>{label}</span>
  </button>
);

// ─────────────────────────────────────────────────────────────
// Reading Section — IELTS split-screen (matches reference image)
// ─────────────────────────────────────────────────────────────

const TFNG_OPTS = ["TRUE", "FALSE", "NOT GIVEN"];
const YNNG_OPTS = ["YES", "NO", "NOT GIVEN"];
const HEADING_DRAG_MIME = "application/x-lexora-reading-heading";

function splitPassageForHeadingSlots(html: string, slotCount: number): string[] {
  if (slotCount <= 1 || typeof document === "undefined") return [html];

  const container = document.createElement("div");
  container.innerHTML = html;
  const blocks = Array.from(container.children) as HTMLElement[];
  if (blocks.length <= 1) return [html];

  const sectionStarts = [0];
  for (let index = 1; index < blocks.length; index += 1) {
    const block = blocks[index];
    const tagName = block.tagName.toUpperCase();
    const firstChildTag = block.firstElementChild?.tagName.toUpperCase();
    const isSectionHeading =
      /^H[1-6]$/.test(tagName) ||
      (tagName === "P" &&
        (firstChildTag === "STRONG" || firstChildTag === "B") &&
        (block.textContent?.trim().length ?? 0) <= 180);
    if (isSectionHeading) sectionStarts.push(index);
    if (sectionStarts.length === slotCount) break;
  }

  for (let slotIndex = 1; sectionStarts.length < slotCount; slotIndex += 1) {
    const candidate = Math.floor((blocks.length * slotIndex) / slotCount);
    if (candidate > 0 && candidate < blocks.length && !sectionStarts.includes(candidate)) {
      sectionStarts.push(candidate);
    }
    if (slotIndex > blocks.length * 2) break;
  }

  sectionStarts.sort((a, b) => a - b);
  const starts = sectionStarts.slice(0, slotCount);
  const segments = starts.map((start, index) => {
    const end = starts[index + 1] ?? blocks.length;
    return blocks
      .slice(start, end)
      .map((block) => block.outerHTML)
      .join("");
  });
  while (segments.length < slotCount) segments.push("");
  return segments;
}

const ReadingHeadingBank: React.FC<{
  headings: string[];
  answer: string[];
  selectedLetter: string | null;
  onSelect: (letter: string) => void;
  onReturn?: (letter: string) => void;
  visualVariant?: "interactive" | "reference";
}> = ({
  headings,
  answer,
  selectedLetter,
  onSelect,
  onReturn,
  visualVariant = "interactive",
}) => {
  const usedLetters = new Set(answer.filter(Boolean));
  const [draggingLetter, setDraggingLetter] = useState<string | null>(null);
  const referenceVariant = visualVariant === "reference";

  return (
    <div
      className={referenceVariant ? "space-y-5" : "space-y-2"}
      onDragOver={(event) => {
        if (!onReturn) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        if (!onReturn) return;
        event.preventDefault();
        const letter = event.dataTransfer.getData(HEADING_DRAG_MIME);
        if (letter) onReturn(letter);
      }}
    >
      <p
        className={
          referenceVariant
            ? "text-lg font-bold text-gray-950"
            : "text-sm font-bold text-gray-950"
        }
      >
        List of Headings
      </p>
      {!referenceVariant && (
        <p className="text-xs leading-relaxed text-gray-500">
          Drag a heading to a passage slot, or select it and then choose a slot.
        </p>
      )}
      <div
        className={`${referenceVariant ? "space-y-3 pl-4" : "space-y-2 pt-1"} transition-colors ${
          !referenceVariant && draggingLetter
            ? "rounded-sm bg-gray-200 p-1.5"
            : ""
        }`}
      >
        {headings.map((heading, index) => {
          const letter = String.fromCharCode(65 + index);
          const used = usedLetters.has(letter);
          const selected = selectedLetter === letter;
          if (used) return null;
          return (
            <button
              key={`${letter}-${heading}`}
              type="button"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(HEADING_DRAG_MIME, letter);
                event.dataTransfer.effectAllowed = "copy";
                setDraggingLetter(letter);
                onSelect(letter);
              }}
              onDragEnd={() => setDraggingLetter(null)}
              onClick={() => onSelect(letter)}
              className={`flex w-fit max-w-full items-start border text-left leading-snug transition-all ${
                referenceVariant
                  ? "min-h-8 rounded-none border-gray-500 px-5 py-1.5 text-base font-normal"
                  : "rounded-sm px-2 py-1 text-sm font-semibold"
              } ${
                !referenceVariant && draggingLetter === letter
                  ? "opacity-0"
                  : ""
              } ${
                selected
                  ? "border-sky-600 bg-sky-50 text-gray-950 shadow-sm"
                  : "cursor-grab border-gray-300 bg-white text-gray-900 hover:border-gray-500 hover:shadow-sm active:cursor-grabbing"
              }`}
            >
              <span>
                {referenceVariant && (
                  <span className="mr-1.5">{letter}.</span>
                )}
                {heading}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ReadingHeadingDropZone: React.FC<{
  slotIndex: number;
  slotCount: number;
  headings: string[];
  answer: string[];
  selectedLetter: string | null;
  onChange: (next: string[]) => void;
  onSelectionConsumed: () => void;
  firstQuestionNumber: number;
  allowDragBack?: boolean;
}> = ({
  slotIndex,
  slotCount,
  headings,
  answer,
  selectedLetter,
  onChange,
  onSelectionConsumed,
  firstQuestionNumber,
  allowDragBack = false,
}) => {
  const normalized = Array.from({ length: slotCount }, (_, index) =>
    String(answer[index] ?? ""),
  );
  const headingForLetter = (letter: string) =>
    headings[letter.charCodeAt(0) - 65] ?? letter;
  const placeHeading = (slotIndex: number, letter: string) => {
    const headingIndex = letter.charCodeAt(0) - 65;
    if (
      !/^[A-Z]$/.test(letter) ||
      headingIndex < 0 ||
      headingIndex >= headings.length
    )
      return;
    const next = [...normalized];
    const previousSlot = next.indexOf(letter);
    if (previousSlot >= 0) next[previousSlot] = "";
    next[slotIndex] = letter;
    onChange(next);
    onSelectionConsumed();
  };

  const placed = normalized[slotIndex];

  return (
    <div className="not-prose mb-1.5 select-none">
      <div
        draggable={allowDragBack && Boolean(placed)}
        onDragStart={(event) => {
          if (!allowDragBack || !placed) return;
          event.dataTransfer.setData(HEADING_DRAG_MIME, placed);
          event.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(event) => {
          event.preventDefault();
          placeHeading(slotIndex, event.dataTransfer.getData(HEADING_DRAG_MIME));
        }}
        onClick={() => selectedLetter && placeHeading(slotIndex, selectedLetter)}
        className={`flex min-h-7 items-center gap-2 rounded-sm border transition-colors ${
          placed
            ? allowDragBack
              ? "w-fit min-w-80 max-w-full cursor-grab border-[#5b8def] bg-[#5b8def] px-5 py-1.5 text-base font-medium text-white active:cursor-grabbing"
              : "w-fit max-w-full cursor-pointer border-sky-500 bg-white px-2 py-0.5 text-sm font-semibold text-gray-950"
            : "w-full justify-center border-dashed border-sky-300 bg-white px-2 py-0.5 text-sm font-bold text-gray-900 hover:border-sky-500 hover:bg-sky-50"
        }`}
      >
        {placed ? (
          <span className="flex-1">
            {allowDragBack ? `${placed}. ` : ""}
            {headingForLetter(placed)}
          </span>
        ) : (
          <span>{firstQuestionNumber + slotIndex}</span>
        )}
      </div>
    </div>
  );
};

const ShowcaseChoiceQuestionGroup: React.FC<{
  questionId: string;
  questionType: ReadingQuestionType;
  rows: string[];
  answer: string[];
  onChange: (next: string[]) => void;
  firstQuestionNumber: number;
  textClassName?: string;
}> = ({
  questionId,
  questionType,
  rows,
  answer,
  onChange,
  firstQuestionNumber,
  textClassName = "text-sm",
}) => {
  const fixedChoices =
    questionType === ReadingQuestionType.TRUE_FALSE_NOT_GIVEN
      ? TFNG_OPTS
      : questionType === ReadingQuestionType.YES_NO_NOT_GIVEN
        ? YNNG_OPTS
        : null;
  const normalizedAnswers = Array.from({ length: rows.length }, (_, index) =>
    String(answer[index] ?? ""),
  );

  return (
    <div className="space-y-5">
      {rows.map((row, rowIndex) => {
        const [prompt = "", ...encodedChoices] = row.split("|||");
        const choices = fixedChoices ?? encodedChoices;
        const questionNumber = firstQuestionNumber + rowIndex;

        return (
          <fieldset
            key={`${questionId}-${rowIndex}`}
            className="rounded-md border border-gray-200 bg-white p-4 shadow-sm"
          >
            <legend className="sr-only">Question {questionNumber}</legend>
            <div className="mb-3 flex items-start gap-3">
              <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-sm border border-sky-600 bg-sky-50 px-1.5 text-xs font-bold tabular-nums text-gray-950">
                {questionNumber}
              </span>
              <p
                className={`pt-0.5 font-medium leading-relaxed text-gray-900 ${textClassName}`}
              >
                {prompt}
              </p>
            </div>
            <div
              className={
                fixedChoices
                  ? "grid gap-2 pl-10 sm:grid-cols-3"
                  : "space-y-2 pl-10"
              }
            >
              {choices.map((choice, choiceIndex) => {
                const selected = normalizedAnswers[rowIndex] === choice;
                return (
                  <label
                    key={`${choice}-${choiceIndex}`}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-sm border px-3 py-2 transition-colors ${textClassName} ${
                      selected
                        ? "border-sky-600 bg-sky-50 text-gray-950"
                        : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`${questionId}-${rowIndex}`}
                      checked={selected}
                      onChange={() => {
                        const next = [...normalizedAnswers];
                        next[rowIndex] = choice;
                        onChange(next);
                      }}
                      className="mt-0.5 h-4 w-4 accent-gray-900"
                    />
                    {!fixedChoices && (
                      <span className="font-semibold text-gray-500">
                        {String.fromCharCode(65 + choiceIndex)}
                      </span>
                    )}
                    <span>{choice}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
};

const CompactReadingQuestion: React.FC<{
  question: IReadingQuestionStudent;
  questionNumber: number;
  answer: string | string[] | undefined;
  setAnswer: (questionId: string, value: string | string[]) => void;
  flagged: boolean;
  onToggleFlag: () => void;
}> = ({ question, questionNumber, answer, setAnswer, flagged, onToggleFlag }) => {
  const stringAnswer = Array.isArray(answer) ? "" : (answer ?? "");
  const arrayAnswer = Array.isArray(answer) ? answer : [];
  const choiceOptions =
    question.questionType === ReadingQuestionType.TRUE_FALSE_NOT_GIVEN
      ? TFNG_OPTS
      : question.questionType === ReadingQuestionType.YES_NO_NOT_GIVEN
        ? YNNG_OPTS
        : question.questionType === ReadingQuestionType.MCQ_SINGLE ||
            question.questionType === ReadingQuestionType.MCQ_MULTIPLE ||
            question.questionType ===
              ReadingQuestionType.TITLE_SUBTITLE_FINDING
          ? question.options ?? []
          : null;
  const isMultiple = question.questionType === ReadingQuestionType.MCQ_MULTIPLE;
  const isSimpleText = [
    ReadingQuestionType.FILL_IN_BLANKS,
    ReadingQuestionType.SENTENCE_COMPLETION,
    ReadingQuestionType.SHORT_ANSWER,
    ReadingQuestionType.SUMMARY_COMPLETION,
  ].includes(question.questionType);

  if (!choiceOptions && !isSimpleText) return null;

  return (
    <div className="border-t border-gray-200 pt-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <p className="text-base font-medium leading-relaxed text-gray-900">
          <span className="mr-2 font-bold">{questionNumber}</span>
          {question.questionText}
        </p>
        <button
          type="button"
          onClick={onToggleFlag}
          aria-label={`${flagged ? "Remove flag from" : "Flag"} question ${questionNumber}`}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
            flagged
              ? "ielts-review-flag border-2 border-[#ff4d4f] bg-white text-[#ff4d4f]"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <FiBookmark className={`h-4 w-4 ${flagged ? "fill-current" : ""}`} />
        </button>
      </div>
      {choiceOptions ? (
        <div className="space-y-3 pl-1">
          {choiceOptions.map((option, optionIndex) => {
            const selected = isMultiple
              ? arrayAnswer.includes(option)
              : stringAnswer === option;
            return (
              <label key={option} className="flex cursor-pointer items-start gap-3 text-base text-gray-900">
                <input
                  type={isMultiple ? "checkbox" : "radio"}
                  name={`compact-${question._id}`}
                  checked={selected}
                  onChange={() => {
                    if (isMultiple) {
                      setAnswer(
                        question._id,
                        selected
                          ? arrayAnswer.filter((value) => value !== option)
                          : [...arrayAnswer, option],
                      );
                    } else {
                      setAnswer(question._id, option);
                    }
                  }}
                  className="mt-1 h-4 w-4 accent-gray-900"
                />
                <span>
                  {(question.questionType === ReadingQuestionType.MCQ_SINGLE ||
                    question.questionType === ReadingQuestionType.MCQ_MULTIPLE ||
                    question.questionType ===
                      ReadingQuestionType.TITLE_SUBTITLE_FINDING) && (
                    <span className="mr-2 font-semibold text-gray-500">
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                  )}
                  {option}
                </span>
              </label>
            );
          })}
        </div>
      ) : (
        <input
          type="text"
          value={stringAnswer}
          onChange={(event) => setAnswer(question._id, event.target.value)}
          placeholder="Type your answer"
          className="w-full max-w-md border border-gray-400 px-3 py-2 text-base text-gray-900 outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600"
        />
      )}
    </div>
  );
};

function ieltsFlowchartGapsBeforeRow(rows: string[], rowIdx: number): number {
  let n = 0;
  for (let i = 0; i < rowIdx; i++) {
    const row = rows[i] ?? "";
    n += Math.max(0, row.split(FLOWCHART_GAP_TOKEN).length - 1);
  }
  return n;
}

interface IeltsFlowchartCompletionPanelProps {
  title: string;
  rows: string[];
  hints: string[];
  answer: string[];
  onChange: (next: string[]) => void;
  firstQuestionNumber: number;
}

const IeltsFlowchartCompletionPanel: React.FC<
  IeltsFlowchartCompletionPanelProps
> = ({ title, rows, hints, answer, onChange, firstQuestionNumber }) => {
  const gapCount = countFlowchartGapTokens(rows);
  const vals = Array.from({ length: gapCount }, (_, i) =>
    String(answer[i] ?? ""),
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
                {parts.map((part, pi) => {
                  const gapIndex =
                    ieltsFlowchartGapsBeforeRow(rows, ri) + pi;
                  const questionNumber = firstQuestionNumber + gapIndex;
                  const gapValue = vals[gapIndex] ?? "";

                  return (
                    <React.Fragment key={`${ri}-${pi}`}>
                      {part ? (
                        <span className="whitespace-pre-wrap">{part}</span>
                      ) : null}
                      {pi < parts.length - 1 ? (
                        <span className="relative mx-1 inline-flex shrink-0 items-stretch align-baseline">
                          {!gapValue.trim() ? (
                            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums text-rose-900">
                              {questionNumber}
                            </span>
                          ) : null}
                          <input
                            type="text"
                            value={gapValue}
                            onChange={(e) =>
                              setVal(gapIndex, e.target.value)
                            }
                            aria-label={`Flowchart gap ${questionNumber}`}
                            className="ielts-numbered-answer-input relative z-[1] min-h-10 w-[min(12rem,85vw)] min-w-[7rem] rounded-md border-2 border-dashed border-rose-300 bg-transparent px-2 py-1 text-center text-sm text-gray-900 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-200"
                            placeholder=""
                            autoComplete="off"
                          />
                        </span>
                      ) : null}
                    </React.Fragment>
                  );
                })}
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

const ReadingSection: React.FC<{
  parts: ReadingPart[];
  activeQNum: number;
  setActiveQNum: (n: number) => void;
  answers: Record<string, string | string[]>;
  setAnswer: (qId: string, val: string | string[]) => void;
  totalQuestions: number;
  getActivePart: () => ReadingPart;
  getActiveQuestion: () => IReadingQuestionStudent | null;
  fontSize: ExamTextSize;
  flaggedQuestions: Set<number>;
  onToggleFlag: (questionNumber: number) => void;
  annotations: ReadingAnnotation[];
  onAddAnnotation: (annotation: ReadingAnnotation) => void;
  onOpenNotes: () => void;
}> = ({
  parts,
  activeQNum,
  setActiveQNum,
  answers,
  setAnswer,
  totalQuestions,
  getActivePart,
  getActiveQuestion,
  fontSize,
  flaggedQuestions,
  onToggleFlag,
  annotations,
  onAddAnnotation,
  onOpenNotes,
}) => {
  const activePart = getActivePart();
  const currentQ = getActiveQuestion();
  const isClientShowcase =
    activePart.test.createdBy === "client-preview" &&
    activePart.test._id === READING_PART_1_SHOWCASE_TEST._id;
  const clientPreviewListSelectUi =
    isClientShowcase &&
    currentQ?.questionType === ReadingQuestionType.LIST_MATCHING;
  const clientPreviewHeadingMatchingUi =
    isClientShowcase &&
    currentQ?.questionType === ReadingQuestionType.MATCHING_HEADINGS;
  const clientPreviewInformationMatchingUi =
    isClientShowcase &&
    currentQ?.questionType === ReadingQuestionType.MATCHING_INFORMATION;
  const clientPreviewSentenceEndingUi =
    isClientShowcase &&
    currentQ?.questionType === ReadingQuestionType.MATCHING_SENTENCE_ENDINGS;
  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const passageContentRef = useRef<HTMLDivElement | null>(null);
  const selectionToolbarRef = useRef<HTMLDivElement | null>(null);
  const [leftWidthPct, setLeftWidthPct] = useState(52);
  const [isResizing, setIsResizing] = useState(false);
  const [selectedHeadingLetter, setSelectedHeadingLetter] = useState<
    string | null
  >(null);
  const [pendingSelection, setPendingSelection] =
    useState<PendingReadingSelection | null>(null);

  // Question group (group all questions with same groupLabel)
  const groupStart = isClientShowcase
    ? (currentQ?.pageNumber ?? activeQNum)
    : currentQ?.groupLabel
      ? activePart.questions.findIndex(
          (q) => q.groupLabel === currentQ.groupLabel,
        ) +
        activePart.offset +
        1
      : activeQNum;
  const groupEnd = currentQ?.groupLabel
    ? activePart.offset +
      activePart.questions.filter((q) => q.groupLabel === currentQ.groupLabel)
        .length +
      (groupStart - activePart.offset - 1)
    : activeQNum;
  const displayGroupEnd = isClientShowcase
    ? groupStart +
      (clientPreviewListSelectUi ? 1 : READING_SHOWCASE_EXAMPLES_PER_TYPE - 1)
    : currentQ?.questionType === ReadingQuestionType.MATCHING_HEADINGS ||
        currentQ?.questionType ===
          ReadingQuestionType.MATCHING_SENTENCE_ENDINGS
      ? Math.max(
          groupEnd,
          groupStart + Math.max(1, currentQ.options?.length ?? 1) - 1,
        )
      : groupEnd;

  const strAns = currentQ
    ? Array.isArray(answers[currentQ._id])
      ? ""
      : ((answers[currentQ._id] as string) ?? "")
    : "";
  const arrAns = currentQ
    ? Array.isArray(answers[currentQ._id])
      ? (answers[currentQ._id] as string[])
      : []
    : [];

  const flowOpts = currentQ?.options ?? [];
  const flowchartGapCount =
    currentQ?.questionType === ReadingQuestionType.FLOWCHART_COMPLETION
      ? countFlowchartGapTokens(flowOpts)
      : 0;
  const flowchartGapUi = Boolean(currentQ) && flowchartGapCount > 0;
  const flowVals =
    currentQ && flowchartGapUi
      ? Array.from({ length: flowchartGapCount }, (_, i) =>
          String(
            Array.isArray(answers[currentQ._id])
              ? ((answers[currentQ._id] as string[])[i] ?? "")
              : "",
          ),
        )
      : [];

  const tableOpts = currentQ?.options ?? [];
  const tableGapCount =
    currentQ?.questionType === ReadingQuestionType.TABLE_COMPLETION
      ? countTableGapTokens(tableOpts)
      : 0;
  const tableGapUi = Boolean(currentQ) && tableGapCount > 0;
  const tableVals =
    currentQ && tableGapUi
      ? Array.from({ length: tableGapCount }, (_, i) =>
          String(
            Array.isArray(answers[currentQ._id])
              ? ((answers[currentQ._id] as string[])[i] ?? "")
              : "",
          ),
        )
      : [];

  const diagramOpts = currentQ?.options ?? [];
  const diagramGapCount =
    currentQ?.questionType === ReadingQuestionType.DIAGRAM_LABEL_COMPLETION
      ? diagramOpts.length
      : 0;
  const diagramGapUi = Boolean(currentQ) && diagramGapCount > 0;
  const diagramVals =
    currentQ && diagramGapUi
      ? Array.from({ length: diagramGapCount }, (_, i) =>
          String(
            Array.isArray(answers[currentQ._id])
              ? ((answers[currentQ._id] as string[])[i] ?? "")
              : "",
          ),
        )
      : [];

  const shortAnswerGapUi =
    currentQ?.questionType === ReadingQuestionType.SHORT_ANSWER &&
    (currentQ.options?.length ?? 0) > 0;

  const sentenceCompletionGapUi =
    currentQ?.questionType === ReadingQuestionType.SENTENCE_COMPLETION &&
    countNoteCompletionGaps(currentQ.options ?? []) > 0;

  const summaryGapUi =
    currentQ?.questionType === ReadingQuestionType.SUMMARY_COMPLETION &&
    countNoteCompletionGaps(currentQ.options ?? []) > 0;

  const showcaseChoiceGroupUi =
    isClientShowcase &&
    currentQ != null &&
    (currentQ.questionType === ReadingQuestionType.YES_NO_NOT_GIVEN ||
      currentQ.questionType === ReadingQuestionType.TRUE_FALSE_NOT_GIVEN ||
      currentQ.questionType === ReadingQuestionType.TITLE_SUBTITLE_FINDING ||
      currentQ.questionType === ReadingQuestionType.MCQ_SINGLE) &&
    (currentQ.options?.length ?? 0) > 0;

  const noteCompletionGapCount =
    currentQ &&
    (currentQ.questionType === ReadingQuestionType.NOTE_COMPLETION ||
      shortAnswerGapUi ||
      sentenceCompletionGapUi ||
      summaryGapUi)
      ? countNoteCompletionGaps(currentQ.options ?? [])
      : 0;

  const statementOrListMatchingStemUi =
    currentQ != null &&
    (currentQ.questionType === ReadingQuestionType.MATCHING_FEATURES ||
      currentQ.questionType === ReadingQuestionType.LIST_MATCHING ||
      currentQ.questionType === ReadingQuestionType.CLASSIFICATION ||
      currentQ.questionType === ReadingQuestionType.DIAGRAM_LABEL_COMPLETION);

  const isType = (t: ReadingQuestionType) => currentQ?.questionType === t;
  const isTypes = (...ts: ReadingQuestionType[]) =>
    currentQ ? ts.includes(currentQ.questionType) : false;

  const fontClass =
    fontSize === "xl" ? "text-xl" : fontSize === "lg" ? "text-lg" : "text-base";
  const questionFontClass = isClientShowcase
    ? fontSize === "xl"
      ? "text-2xl"
      : fontSize === "lg"
        ? "text-xl"
        : "text-lg"
    : fontClass;
  const questionInstructionFontClass = isClientShowcase
    ? fontSize === "xl"
      ? "text-xl"
      : fontSize === "lg"
        ? "text-lg"
        : "text-base"
    : "text-sm";

  const activeLocalIndex = currentQ
    ? activePart.questions.findIndex((question) => question._id === currentQ._id)
    : -1;
  const activePageNumber = currentQ?.pageNumber ?? 1;
  const supplementaryQuestions = activePart.questions
    .map((question, localIndex) => ({ question, localIndex }))
    .filter(
      ({ question, localIndex }) =>
        localIndex > activeLocalIndex &&
        (question.pageNumber ?? 1) === activePageNumber,
    );
  const matchingHeadingLocalIndex = activePart.questions.findIndex(
    (question) =>
      question.questionType === ReadingQuestionType.MATCHING_HEADINGS &&
      (question.pageNumber ?? 1) === activePageNumber,
  );
  const matchingHeadingQuestion =
    matchingHeadingLocalIndex >= 0
      ? activePart.questions[matchingHeadingLocalIndex]
      : undefined;
  const matchingHeadingAnswer = matchingHeadingQuestion
    ? Array.isArray(answers[matchingHeadingQuestion._id])
      ? (answers[matchingHeadingQuestion._id] as string[])
      : []
    : [];
  const matchingHeadingSlots = matchingHeadingQuestion?.options ?? [];
  const passageSegments = splitPassageForHeadingSlots(
    activePart.test.passageContent,
    matchingHeadingSlots.length,
  );

  useEffect(() => {
    const root = passageContentRef.current;
    if (!root) return;

    const segmentElements = Array.from(
      root.querySelectorAll<HTMLElement>("[data-reading-passage-segment]"),
    );
    segmentElements.forEach((segment, index) => {
      segment.innerHTML = passageSegments[index] ?? "";
    });
    const partAnnotations = annotations.filter(
      (annotation) => annotation.partId === activePart.testId,
    );
    if (!partAnnotations.length) return;

    const textNodes: Array<{ node: Text; start: number; end: number }> = [];
    let cursor = 0;
    segmentElements.forEach((segment) => {
      const walker = document.createTreeWalker(segment, NodeFilter.SHOW_TEXT);
      let nextNode = walker.nextNode();
      while (nextNode) {
        const textNode = nextNode as Text;
        const length = textNode.data.length;
        textNodes.push({ node: textNode, start: cursor, end: cursor + length });
        cursor += length;
        nextNode = walker.nextNode();
      }
    });

    textNodes.forEach(({ node, start, end }) => {
      const segments = partAnnotations
        .map((annotation) => ({
          annotation,
          start: Math.max(0, annotation.start - start),
          end: Math.min(end - start, annotation.end - start),
        }))
        .filter((segment) => segment.start < segment.end)
        .sort((a, b) => b.start - a.start);

      segments.forEach((segment) => {
        if (segment.end > node.data.length) return;
        const range = document.createRange();
        range.setStart(node, segment.start);
        range.setEnd(node, segment.end);
        const mark = document.createElement("mark");
        mark.dataset.annotationId = segment.annotation.id;
        mark.className = `${
          segment.annotation.kind === "note"
            ? "ielts-passage-note"
            : "ielts-passage-highlight"
        } rounded-[2px] px-0.5 text-gray-950`;
        if (segment.annotation.note) mark.title = segment.annotation.note;
        try {
          range.surroundContents(mark);
        } catch {
          // The selected text crossed a complex HTML boundary; other text nodes
          // in the same selection are still highlighted independently.
        }
      });
    });
  }, [
    activePart.test.passageContent,
    activePart.testId,
    annotations,
    matchingHeadingSlots.length,
  ]);

  const clearPassageSelection = () => {
    window.getSelection()?.removeAllRanges();
    setPendingSelection(null);
  };

  const capturePassageSelection = () => {
    const root = passageContentRef.current;
    const selection = window.getSelection();
    if (!root || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setPendingSelection(null);
      return;
    }

    const range = selection.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) {
      setPendingSelection(null);
      return;
    }

    const closestPassageSegment = (node: Node) => {
      const element =
        node.nodeType === Node.ELEMENT_NODE
          ? (node as Element)
          : node.parentElement;
      return element?.closest<HTMLElement>("[data-reading-passage-segment]") ?? null;
    };
    const startSegment = closestPassageSegment(range.startContainer);
    const endSegment = closestPassageSegment(range.endContainer);
    if (!startSegment || !endSegment) {
      setPendingSelection(null);
      return;
    }

    const rawText = range.toString();
    const text = rawText.trim();
    if (!text) {
      setPendingSelection(null);
      return;
    }

    const leadingWhitespace = rawText.length - rawText.trimStart().length;
    const segmentElements = Array.from(
      root.querySelectorAll<HTMLElement>("[data-reading-passage-segment]"),
    );
    let start = 0;
    for (const segment of segmentElements) {
      if (segment === startSegment) {
        const before = document.createRange();
        before.selectNodeContents(segment);
        before.setEnd(range.startContainer, range.startOffset);
        start += before.toString().length;
        break;
      }
      start += segment.textContent?.length ?? 0;
    }
    start += leadingWhitespace;
    const rect = range.getBoundingClientRect();

    const toolbarHeight = 64;
    const toolbarWidth = 126;
    const toolbarGap = 9;
    const viewportPadding = 8;
    const fitsBelow =
      rect.bottom + toolbarGap + toolbarHeight <= window.innerHeight;
    const placement = fitsBelow ? "below" : "above";
    const top = fitsBelow
      ? rect.bottom + toolbarGap
      : Math.max(viewportPadding, rect.top - toolbarHeight - toolbarGap);
    const left = Math.min(
      window.innerWidth - toolbarWidth - viewportPadding,
      Math.max(
        viewportPadding,
        rect.left + rect.width / 2 - toolbarWidth / 2,
      ),
    );

    setPendingSelection({
      partId: activePart.testId,
      start,
      end: start + text.length,
      text,
      top,
      left,
      placement,
    });
  };

  const savePassageSelection = (
    kind: ReadingAnnotation["kind"] = "highlight",
  ) => {
    if (!pendingSelection) return;
    onAddAnnotation({
      id: `${pendingSelection.partId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      partId: pendingSelection.partId,
      start: pendingSelection.start,
      end: pendingSelection.end,
      text: pendingSelection.text,
      kind,
    });
    clearPassageSelection();
  };

  useEffect(() => {
    if (!pendingSelection) return;

    const dismissSelectionTools = () => {
      window.getSelection()?.removeAllRanges();
      setPendingSelection(null);
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (selectionToolbarRef.current?.contains(target)) return;
      if (passageContentRef.current?.contains(target)) return;
      dismissSelectionTools();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismissSelectionTools();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("scroll", dismissSelectionTools, true);
    window.addEventListener("resize", dismissSelectionTools);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("scroll", dismissSelectionTools, true);
      window.removeEventListener("resize", dismissSelectionTools);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [pendingSelection]);

  useEffect(() => {
    if (!isResizing) return;

    const onPointerMove = (ev: PointerEvent) => {
      const container = splitContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const rawPct = ((ev.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(75, Math.max(25, rawPct));
      setLeftWidthPct(clamped);
    };

    const onPointerUp = () => setIsResizing(false);

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [isResizing]);

  const activePartIndex = parts.findIndex(
    (part) => part.testId === activePart.testId,
  );
  const partStart = isClientShowcase ? 1 : activePart.offset + 1;
  const partEnd = isClientShowcase
    ? activePart.test.totalQuestions
    : activePart.offset + activePart.questions.length;

  return (
    <div ref={splitContainerRef} className="flex h-full flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-gray-300 bg-[#f3f3ef] px-5 py-3 sm:px-7">
        <p className="text-sm font-bold text-gray-950">Part {activePartIndex + 1}</p>
        <p className="mt-0.5 text-sm text-gray-800">
          Read the text and answer questions {partStart}–{partEnd}.
        </p>
      </div>

      {pendingSelection && (
        <div
          ref={selectionToolbarRef}
          data-testid="reading-selection-toolbar"
          style={{
            top: pendingSelection.top,
            left: pendingSelection.left,
          }}
          onMouseDown={(event) => event.preventDefault()}
          data-selection-placement={pendingSelection.placement}
          className="ielts-selection-toolbar fixed z-[80] w-[126px] border border-gray-500 bg-white p-1 text-gray-700 shadow-[0_3px_12px_rgba(0,0,0,0.28)]"
        >
          <span
            aria-hidden="true"
            className={`ielts-selection-arrow-outer pointer-events-none absolute left-1/2 h-0 w-0 -translate-x-1/2 border-x-[7px] border-x-transparent ${
              pendingSelection.placement === "below"
                ? "bottom-full border-b-[7px] border-b-gray-500"
                : "top-full border-t-[7px] border-t-gray-500"
            }`}
          />
          <span
            aria-hidden="true"
            className={`ielts-selection-arrow-inner pointer-events-none absolute left-1/2 h-0 w-0 -translate-x-1/2 border-x-[6px] border-x-transparent ${
              pendingSelection.placement === "below"
                ? "bottom-full border-b-[6px] border-b-white"
                : "top-full border-t-[6px] border-t-white"
            }`}
          />
          <div className="grid grid-cols-2 divide-x divide-gray-200">
              <button
                type="button"
                onClick={() => {
                  onOpenNotes();
                  savePassageSelection("note");
                }}
                aria-label="Add a note to selected text"
                className="ielts-selection-toolbar-button flex h-[50px] flex-col items-center justify-center gap-0.5 bg-white text-[11px] font-medium text-gray-700 hover:bg-gray-100"
              >
                <span className="ielts-selection-note-icon flex h-4 w-4 items-center justify-center rounded-[1px] bg-gray-600 text-[13px] font-bold leading-none text-white">
                  “
                </span>
                Note
              </button>
              <button
                type="button"
                onClick={() => savePassageSelection()}
                aria-label="Highlight selected text"
                className="ielts-selection-toolbar-button flex h-[50px] flex-col items-center justify-center gap-0.5 bg-white text-[11px] font-medium text-gray-700 hover:bg-amber-50"
              >
                <span className="relative h-4 w-4" aria-hidden="true">
                  <span className="ielts-selection-highlight-bar absolute bottom-0 left-0 h-1 w-4 bg-[#f0cc35]" />
                  <span className="ielts-selection-highlight-pen absolute bottom-1 left-[7px] h-3 w-[3px] -rotate-12 bg-gray-600" />
                </span>
                Highlight
              </button>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* ── LEFT: PASSAGE ───────────────────────────────── */}
      <div
        style={{ width: `${leftWidthPct}%` }}
        className="flex min-w-0 flex-col bg-white"
      >
        {/* Part header */}
        <div className="hidden">
          <p className="font-bold text-gray-800 text-sm">
            Part-
            {activePart.offset === 0
              ? 1
              : parts.findIndex((p) => p.testId === activePart.testId) + 1}
          </p>
          <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
            You should spend about {Math.floor(activePart.test.duration ?? 20)}{" "}
            minutes on Questions {activePart.offset + 1}–
            {activePart.offset + activePart.questions.length}, which are based
            on Reading Passage{" "}
            {parts.findIndex((p) => p.testId === activePart.testId) + 1} below.
          </p>
        </div>

        {/* Passage card */}
        <div
          className={`flex-1 overflow-y-auto bg-white px-6 py-7 lg:px-8 ${
            isClientShowcase ? "ielts-reading-scrollbar" : ""
          }`}
        >
          <div className="mx-auto max-w-[780px]">
            <h2
              className={`mb-5 font-bold text-gray-950 ${
                fontSize === "xl"
                  ? "text-3xl"
                  : fontSize === "lg"
                    ? "text-2xl"
                    : "text-xl"
              }`}
            >
              {activePart.test.passageTitle}
            </h2>
            {activePart.test.passageImage && (
              <img
                src={activePart.test.passageImage}
                alt="Passage"
                className="w-full rounded-lg mb-4 object-cover"
              />
            )}
            <div
              ref={passageContentRef}
              onMouseUp={capturePassageSelection}
              onContextMenu={(event) => {
                const selection = window.getSelection();
                if (selection && !selection.isCollapsed) {
                  event.preventDefault();
                  capturePassageSelection();
                }
              }}
              className={`prose prose-gray max-w-none leading-[1.72] text-gray-900 prose-p:mb-5 ${fontClass}`}
            >
              {passageSegments.map((segment, segmentIndex) => (
                <React.Fragment
                  key={`${activePart.testId}-passage-segment-${segmentIndex}`}
                >
                  {matchingHeadingQuestion &&
                    segmentIndex < matchingHeadingSlots.length &&
                    (matchingHeadingQuestion.wordBank?.length ?? 0) > 0 && (
                      <ReadingHeadingDropZone
                        slotIndex={segmentIndex}
                        slotCount={matchingHeadingSlots.length}
                        headings={matchingHeadingQuestion.wordBank ?? []}
                        answer={matchingHeadingAnswer}
                        selectedLetter={selectedHeadingLetter}
                        onChange={(next) =>
                          setAnswer(matchingHeadingQuestion._id, next)
                        }
                        onSelectionConsumed={() =>
                          setSelectedHeadingLetter(null)
                        }
                        firstQuestionNumber={
                          clientPreviewHeadingMatchingUi
                            ? 14
                            : isClientShowcase
                              ? (matchingHeadingQuestion.pageNumber ?? groupStart)
                            : activePart.offset + matchingHeadingLocalIndex + 1
                        }
                        allowDragBack={clientPreviewHeadingMatchingUi}
                      />
                    )}
                  <div
                    data-reading-passage-segment={segmentIndex}
                    className={`[&>*:first-child]:mt-0 ${
                      isClientShowcase
                        ? "[&_section]:mb-6 [&_section:last-child]:mb-0 [&_section>h3]:mt-0 [&_section>h3]:mb-2 [&_section>h3]:text-lg [&_section>h3]:font-bold [&_section>h3]:leading-snug [&_section>h3]:text-gray-950 [&_section>p]:mb-0"
                        : ""
                    }`}
                    dangerouslySetInnerHTML={{ __html: segment }}
                  />
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Middle draggable divider */}
      <div
        className={`ielts-reading-divider-gutter group relative shrink-0 ${
          isClientShowcase ? "w-2 bg-gray-200" : "w-4 bg-gray-100"
        }`}
      >
        <button
          type="button"
          role="separator"
          aria-label="Resize panels"
          aria-orientation="vertical"
          tabIndex={0}
          onPointerDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
          onDoubleClick={() => setLeftWidthPct(52)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              setLeftWidthPct((w) => Math.max(25, w - 2));
            }
            if (e.key === "ArrowRight") {
              e.preventDefault();
              setLeftWidthPct((w) => Math.min(75, w + 2));
            }
          }}
          className={`ielts-reading-divider-track absolute inset-y-0 left-1/2 z-20 flex -translate-x-1/2 cursor-col-resize items-center justify-center font-bold text-gray-950 transition-colors focus:outline-none focus:ring-2 focus:ring-[#b30d2f]/25 ${
            isClientShowcase
              ? "w-1 bg-gray-300 text-sm hover:bg-gray-500"
              : "w-1.5 bg-gray-400 text-[10px] hover:bg-gray-500"
          }`}
        >
          <span
            aria-hidden="true"
            className={`ielts-reading-divider-handle absolute flex items-center justify-center bg-white font-mono font-bold leading-none text-gray-950 ${
              isClientShowcase
                ? "h-10 w-10 border-2 border-gray-950 text-xl shadow-none"
                : "h-9 w-9 border border-gray-500 shadow-sm"
            }`}
          >
            ↔
          </span>
        </button>
      </div>

      {/* ── RIGHT: QUESTIONS ────────────────────────────── */}
      <div
        style={{ width: `${100 - leftWidthPct}%` }}
        className="relative flex min-w-0 flex-col bg-white"
      >
        <div
          className={`relative flex-1 overflow-y-auto px-6 pb-24 pt-7 lg:px-8 ${
            isClientShowcase ? "ielts-reading-scrollbar" : ""
          }`}
        >
          {currentQ &&
            !clientPreviewInformationMatchingUi &&
            !clientPreviewSentenceEndingUi && (
            <button
              type="button"
              onClick={() => onToggleFlag(activeQNum)}
              aria-label={
                flaggedQuestions.has(activeQNum)
                  ? `Remove flag from question ${activeQNum}`
                  : `Flag question ${activeQNum} for review`
              }
              title={flaggedQuestions.has(activeQNum) ? "Remove review flag" : "Flag for review"}
              className={`absolute right-6 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-sm border transition-colors lg:right-8 ${
                flaggedQuestions.has(activeQNum)
                  ? "ielts-review-flag border-2 border-[#ff4d4f] bg-white text-[#ff4d4f]"
                  : "border-transparent bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <FiBookmark
                className={`h-5 w-5 ${flaggedQuestions.has(activeQNum) ? "fill-current" : ""}`}
              />
            </button>
          )}
          {currentQ ? (
            <div
              className={`mx-auto space-y-5 ${
                clientPreviewInformationMatchingUi || clientPreviewSentenceEndingUi
                  ? "max-w-none pr-0"
                  : "max-w-[760px] pr-10"
              }`}
            >
              {isClientShowcase && currentQ.groupLabel && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-sky-200 bg-sky-50 px-4 py-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sky-700">
                      Question type
                    </p>
                    <p
                      className={`mt-0.5 font-bold text-gray-950 ${questionFontClass}`}
                    >
                      {currentQ.groupLabel}
                    </p>
                  </div>
                  <span className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-800">
                    {clientPreviewListSelectUi
                      ? "2 answers"
                      : clientPreviewHeadingMatchingUi
                        ? "6 examples"
                        : `${READING_SHOWCASE_EXAMPLES_PER_TYPE} examples`}
                  </span>
                </div>
              )}

              {/* Question range */}
              <p className={`font-bold text-gray-900 ${questionFontClass}`}>
                {clientPreviewHeadingMatchingUi ? (
                  <>Questions 14 - 19</>
                ) : clientPreviewInformationMatchingUi ? (
                  <>Questions 14 - 18</>
                ) : clientPreviewSentenceEndingUi ? (
                  <>Questions 7 - 9</>
                ) : (
                  <>
                    Questions {groupStart}
                    {displayGroupEnd > groupStart
                      ? ` – ${displayGroupEnd}`
                      : ""}
                  </>
                )}
              </p>

              {/* Group instruction */}
              {clientPreviewHeadingMatchingUi ? (
                <div className={`space-y-4 text-gray-900 ${questionInstructionFontClass}`}>
                  <p className="leading-relaxed">
                    The text on the following pages has six paragraphs, <strong>A-F</strong>.
                  </p>
                  <p className="italic leading-relaxed">
                    Choose the correct heading for each paragraph from the list
                    of headings (A–I) below.
                  </p>
                  <p className="italic leading-relaxed">
                    Write the correct number, <strong>A-I</strong>, in boxes 14-19 on your
                    answer sheet.
                  </p>
                </div>
              ) : clientPreviewInformationMatchingUi ? (
                <div className={`space-y-4 text-gray-900 ${questionInstructionFontClass}`}>
                  <p className="italic leading-relaxed">
                    The text has eight paragraphs, <strong>A-H</strong>.
                  </p>
                  <p className="italic leading-relaxed">
                    Which paragraph contains the following information?
                  </p>
                  <p className="italic leading-relaxed">
                    Write the correct letter, <strong>A-H</strong>, in boxes 14-18 on
                    your answer sheet.
                  </p>
                  <p className="italic leading-relaxed">
                    <strong>N.B.</strong> You may use any letter more than once.
                  </p>
                </div>
              ) : clientPreviewSentenceEndingUi ? (
                <div className={`space-y-1 text-gray-900 ${questionInstructionFontClass}`}>
                  <p className="leading-relaxed">
                    Complete each sentence with the correct ending, A-F, below.
                  </p>
                  <p className="leading-relaxed">
                    Choose the correct ending and move it into the gap.
                  </p>
                </div>
              ) : currentQ.instructions ? (
                <div className="space-y-2">
                  <p
                    className={`${questionInstructionFontClass} text-gray-800 leading-relaxed font-medium`}
                  >
                    {currentQ.instructions}
                  </p>
                  <p
                    className={`${questionInstructionFontClass} text-gray-600 leading-relaxed`}
                  >
                    {isType(ReadingQuestionType.TRUE_FALSE_NOT_GIVEN) &&
                      "Choose TRUE if the statement agrees with the information given in the text, choose FALSE if the statement contradicts the information, or choose NOT GIVEN if there is no information on this."}
                    {isType(ReadingQuestionType.YES_NO_NOT_GIVEN) &&
                      "Choose YES if the statement agrees with the views of the writer, NO if the statement contradicts the views of the writer, or NOT GIVEN if it is impossible to say what the writer thinks about this."}
                  </p>
                </div>
              ) : null}

              {matchingHeadingQuestion &&
                (matchingHeadingQuestion.wordBank?.length ?? 0) > 0 && (
                  <ReadingHeadingBank
                    headings={matchingHeadingQuestion.wordBank ?? []}
                    answer={matchingHeadingAnswer}
                    selectedLetter={selectedHeadingLetter}
                    onSelect={setSelectedHeadingLetter}
                    onReturn={
                      clientPreviewHeadingMatchingUi
                        ? (letter) => {
                            setAnswer(
                              matchingHeadingQuestion._id,
                              matchingHeadingAnswer.map((value) =>
                                value === letter ? "" : value,
                              ),
                            );
                            setSelectedHeadingLetter(null);
                          }
                        : undefined
                    }
                    visualVariant={
                      clientPreviewHeadingMatchingUi
                        ? "reference"
                        : "interactive"
                    }
                  />
                )}

              {clientPreviewHeadingMatchingUi && (
                <div className={`space-y-5 pt-8 text-gray-900 ${questionInstructionFontClass}`}>
                  <p className="font-bold">Questions 20 - 23</p>
                  <p className="italic leading-relaxed">
                    Look at the following statements (Questions 20-23) and the
                    list of people below.
                  </p>
                  <p className="italic leading-relaxed">
                    Match each statement with the correct person, <strong>A</strong>,{" "}
                    <strong>B</strong> or <strong>C</strong>.
                  </p>
                </div>
              )}

              {/* Question text / flowchart stem (title shown in chart when set) */}
              {clientPreviewHeadingMatchingUi ||
              clientPreviewInformationMatchingUi ||
              clientPreviewSentenceEndingUi ? null : flowchartGapUi ? (
                !currentQ.questionText?.trim() ? (
                  <p
                    className={`text-gray-800 leading-snug font-medium ${questionFontClass}`}
                  >
                    Questions {groupStart}
                    {displayGroupEnd > groupStart
                      ? ` – ${displayGroupEnd}`
                      : ""}
                  </p>
                ) : null
              ) : tableGapUi ? (
                !currentQ.questionText?.trim() ? (
                  <p
                    className={`text-gray-800 leading-snug font-medium ${questionFontClass}`}
                  >
                    Questions {groupStart}
                    {displayGroupEnd > groupStart
                      ? ` – ${displayGroupEnd}`
                      : ""}
                  </p>
                ) : null
              ) : isType(ReadingQuestionType.NOTE_COMPLETION) ||
                shortAnswerGapUi ||
                sentenceCompletionGapUi ||
                summaryGapUi ? (
                currentQ.questionText?.trim() ? (
                  <p
                    className={`text-gray-800 leading-snug font-bold ${questionFontClass}`}
                  >
                    {currentQ.questionText}
                  </p>
                ) : (
                  <p
                    className={`text-gray-800 leading-snug font-medium ${questionFontClass}`}
                  >
                    Questions {groupStart}
                    {displayGroupEnd > groupStart
                      ? ` – ${displayGroupEnd}`
                      : ""}
                  </p>
                )
              ) : showcaseChoiceGroupUi ? (
                currentQ.questionText?.trim() ? (
                  <p
                    className={`text-gray-800 leading-snug font-bold ${questionFontClass}`}
                  >
                    {currentQ.questionText}
                  </p>
                ) : null
              ) : statementOrListMatchingStemUi ? (
                clientPreviewListSelectUi ? null : (
                (currentQ.questionType ===
                  ReadingQuestionType.MATCHING_FEATURES ||
                  currentQ.questionType ===
                    ReadingQuestionType.LIST_MATCHING) &&
                currentQ.questionText?.trim() ? (
                  <p
                    className={`text-gray-800 leading-snug ${
                      currentQ.questionType ===
                      ReadingQuestionType.MATCHING_FEATURES
                        ? "text-center font-bold"
                        : "font-medium"
                    } ${questionFontClass}`}
                  >
                    {currentQ.questionText}
                  </p>
                ) : (
                  <p
                    className={`text-gray-800 leading-snug font-medium ${questionFontClass}`}
                  >
                    Questions {groupStart}
                    {displayGroupEnd > groupStart
                      ? ` – ${displayGroupEnd}`
                      : ""}
                  </p>
                )
                )
              ) : (
                <p
                  className={`text-gray-800 leading-snug font-medium ${questionFontClass}`}
                >
                  {activeQNum}. {currentQ.questionText}
                </p>
              )}

              {/* ── Answer inputs ── */}

              {showcaseChoiceGroupUi && (
                <ShowcaseChoiceQuestionGroup
                  questionId={currentQ._id}
                  questionType={currentQ.questionType}
                  rows={currentQ.options ?? []}
                  answer={
                    Array.isArray(answers[currentQ._id])
                      ? (answers[currentQ._id] as string[])
                      : []
                  }
                  onChange={(next) => setAnswer(currentQ._id, next)}
                  firstQuestionNumber={groupStart}
                  textClassName={questionFontClass}
                />
              )}

              {/* TRUE / FALSE / NOT GIVEN */}
              {!showcaseChoiceGroupUi &&
                (isType(ReadingQuestionType.TRUE_FALSE_NOT_GIVEN) ||
                  isType(ReadingQuestionType.YES_NO_NOT_GIVEN)) && (
                <div className="space-y-2">
                  {(isType(ReadingQuestionType.YES_NO_NOT_GIVEN)
                    ? YNNG_OPTS
                    : TFNG_OPTS
                  ).map((opt) => (
                    <label
                      key={opt}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div
                        onClick={() => setAnswer(currentQ._id, opt)}
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                          strAns === opt
                            ? "border-gray-700 bg-transparent"
                            : "border-gray-400 hover:border-gray-600"
                        }`}
                      >
                        {strAns === opt && (
                          <div className="w-2 h-2 rounded-full bg-gray-700" />
                        )}
                      </div>
                      <span className={`${questionFontClass} text-gray-800`}>
                        {opt}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {/* MCQ Single */}
              {!showcaseChoiceGroupUi &&
                (isType(ReadingQuestionType.MCQ_SINGLE) ||
                  isType(ReadingQuestionType.TITLE_SUBTITLE_FINDING)) && (
                <div className="space-y-2">
                  {(currentQ.options ?? []).map((opt, i) => (
                    <label
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        strAns === opt
                          ? "bg-indigo-50 border-indigo-400"
                          : "bg-white border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${currentQ._id}`}
                        checked={strAns === opt}
                        onChange={() => setAnswer(currentQ._id, opt)}
                        className="text-indigo-600"
                      />
                      <span className="font-mono text-xs text-gray-500 w-4">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className={`${questionFontClass} text-gray-800`}>
                        {opt}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {/* MCQ Multiple */}
              {isType(ReadingQuestionType.MCQ_MULTIPLE) && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Select all that apply</p>
                  {(currentQ.options ?? []).map((opt, i) => (
                    <label
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        arrAns.includes(opt)
                          ? "bg-indigo-50 border-indigo-400"
                          : "bg-white border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={arrAns.includes(opt)}
                        onChange={() => {
                          if (arrAns.includes(opt))
                            setAnswer(
                              currentQ._id,
                              arrAns.filter((v) => v !== opt),
                            );
                          else setAnswer(currentQ._id, [...arrAns, opt]);
                        }}
                        className="text-indigo-600 rounded"
                      />
                      <span className="font-mono text-xs text-gray-500 w-4">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className={`${questionFontClass} text-gray-800`}>
                        {opt}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {/* Information / features matching — paragraph letter grid */}
              {isType(ReadingQuestionType.MATCHING_INFORMATION) && (
                <MatchingInformationGrid
                  questionId={currentQ._id}
                  statements={currentQ.options ?? []}
                  columnLabels={currentQ.wordBank ?? []}
                  answer={
                    Array.isArray(answers[currentQ._id])
                      ? (answers[currentQ._id] as string[])
                      : []
                  }
                  onChange={(next) => setAnswer(currentQ._id, next)}
                  firstQuestionNumber={
                    clientPreviewInformationMatchingUi ? 14 : groupStart
                  }
                  visualVariant={
                    clientPreviewInformationMatchingUi
                      ? "reference"
                      : "default"
                  }
                  showBookmark={clientPreviewInformationMatchingUi}
                  bookmarked={flaggedQuestions.has(activeQNum)}
                  onToggleBookmark={() => onToggleFlag(activeQNum)}
                />
              )}

              {clientPreviewInformationMatchingUi && (
                <p className={`pt-1 font-bold text-gray-900 ${questionFontClass}`}>
                  Questions 19 - 22
                </p>
              )}

              {isType(ReadingQuestionType.MATCHING_FEATURES) && (
                <StatementMatchingPanel
                  questionId={currentQ._id}
                  statements={currentQ.options ?? []}
                  wordBank={currentQ.wordBank ?? []}
                  answer={
                    Array.isArray(answers[currentQ._id])
                      ? (answers[currentQ._id] as string[])
                      : []
                  }
                  onChange={(next) => setAnswer(currentQ._id, next)}
                  firstQuestionNumber={groupStart}
                />
              )}

              {isType(ReadingQuestionType.LIST_MATCHING) && (
                <ListMatchingPanel
                  questionId={currentQ._id}
                  purposes={currentQ.options ?? []}
                  wordBank={currentQ.wordBank ?? []}
                  bankTitle={currentQ.questionText ?? ""}
                  answer={
                    Array.isArray(answers[currentQ._id])
                      ? (answers[currentQ._id] as string[])
                      : []
                  }
                  onChange={(next) => setAnswer(currentQ._id, next)}
                  firstQuestionNumber={groupStart}
                  visualVariant={
                    clientPreviewListSelectUi ? "two-letter" : "list"
                  }
                />
              )}

              {isType(ReadingQuestionType.CLASSIFICATION) && (
                <ListMatchingPanel
                  questionId={currentQ._id}
                  purposes={currentQ.options ?? []}
                  wordBank={currentQ.wordBank ?? []}
                  bankTitle={currentQ.questionText ?? ""}
                  answer={
                    Array.isArray(answers[currentQ._id])
                      ? (answers[currentQ._id] as string[])
                      : []
                  }
                  onChange={(next) => setAnswer(currentQ._id, next)}
                  firstQuestionNumber={groupStart}
                  visualVariant="classification"
                />
              )}

              {isType(ReadingQuestionType.MATCHING_SENTENCE_ENDINGS) && (
                <SentenceEndingMatchingPanel
                  questionId={currentQ._id}
                  stems={currentQ.options ?? []}
                  endings={currentQ.wordBank ?? []}
                  answer={
                    Array.isArray(answers[currentQ._id])
                      ? (answers[currentQ._id] as string[])
                      : []
                  }
                  onChange={(next) => setAnswer(currentQ._id, next)}
                  firstQuestionNumber={clientPreviewSentenceEndingUi ? 7 : groupStart}
                  visualVariant={
                    clientPreviewSentenceEndingUi ? "reference" : "default"
                  }
                  showBookmark={clientPreviewSentenceEndingUi}
                  bookmarked={flaggedQuestions.has(activeQNum)}
                  onToggleBookmark={() => onToggleFlag(activeQNum)}
                />
              )}

              {summaryGapUi &&
                (currentQ.wordBank?.filter((word) => word.trim()).length ?? 0) >
                  0 && (
                  <div className="rounded-sm bg-gray-100 p-3">
                    <p className="mb-2 text-sm font-bold text-gray-950">
                      Clue list
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {currentQ.wordBank
                        ?.filter((word) => word.trim())
                        .map((word, index) => (
                          <span
                            key={`${word}-${index}`}
                            className="rounded-sm border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900"
                          >
                            <strong className="mr-1.5">
                              {String.fromCharCode(65 + index)}
                            </strong>
                            {word}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

              {/* Note completion — typable dashed gaps */}
              {(isType(ReadingQuestionType.NOTE_COMPLETION) ||
                shortAnswerGapUi ||
                sentenceCompletionGapUi ||
                summaryGapUi) && (
                <NoteCompletionGaps
                  lines={currentQ.options ?? []}
                  answer={
                    Array.isArray(answers[currentQ._id])
                      ? (answers[currentQ._id] as string[])
                      : []
                  }
                  onChange={(next) => setAnswer(currentQ._id, next)}
                  firstQuestionNumber={groupStart}
                  lineTextClassName={`${questionFontClass} text-gray-800`}
                  showBullet={!summaryGapUi}
                  appearance={summaryGapUi ? "summary" : "note"}
                  emptyLinePlaceholder={
                    summaryGapUi ? "Summary paragraph…" : undefined
                  }
                />
              )}

              {/* Flow-chart completion — [[GAP]] in option rows */}
              {flowchartGapUi && (
                <IeltsFlowchartCompletionPanel
                  title={currentQ.questionText ?? ""}
                  rows={currentQ.options ?? []}
                  hints={(currentQ.wordBank ?? []).filter((s) =>
                    String(s ?? "").trim(),
                  )}
                  answer={flowVals}
                  onChange={(next) => setAnswer(currentQ._id, next)}
                  firstQuestionNumber={groupStart}
                />
              )}

              {tableGapUi && (
                <TableCompletionPanel
                  title={currentQ.questionText ?? ""}
                  firstQuestionNumber={groupStart}
                  options={currentQ.options ?? []}
                  hints={(currentQ.wordBank ?? []).filter((s) =>
                    String(s ?? "").trim(),
                  )}
                  answer={tableVals}
                  onChange={(next) => setAnswer(currentQ._id, next)}
                />
              )}

              {diagramGapUi && (
                <DiagramLabelCompletionPanel
                  questionId={currentQ._id}
                  bankTitle={currentQ.questionText ?? ""}
                  gapHints={currentQ.options ?? []}
                  wordBank={currentQ.wordBank ?? []}
                  answer={diagramVals}
                  onChange={(next) => setAnswer(currentQ._id, next)}
                  firstQuestionNumber={groupStart}
                />
              )}

              {/* Fill / Short answer style inputs */}
              {isTypes(
                ReadingQuestionType.FILL_IN_BLANKS,
                ReadingQuestionType.SENTENCE_COMPLETION,
                ReadingQuestionType.SHORT_ANSWER,
                ReadingQuestionType.TABLE_COMPLETION,
                ReadingQuestionType.FLOWCHART_COMPLETION,
              ) &&
                !(
                  isType(ReadingQuestionType.FLOWCHART_COMPLETION) &&
                  flowchartGapUi
                ) &&
                !(
                  isType(ReadingQuestionType.TABLE_COMPLETION) && tableGapUi
                ) &&
                !(diagramGapUi && isType(ReadingQuestionType.DIAGRAM_LABEL_COMPLETION)) &&
                !(shortAnswerGapUi && isType(ReadingQuestionType.SHORT_ANSWER)) &&
                !(
                  sentenceCompletionGapUi &&
                  isType(ReadingQuestionType.SENTENCE_COMPLETION)
                ) && (
                <input
                  type="text"
                  value={strAns}
                  onChange={(e) => setAnswer(currentQ._id, e.target.value)}
                  placeholder="Type your answer here…"
                  className={`block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 ${questionFontClass} text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none`}
                />
              )}

              {isType(ReadingQuestionType.SUMMARY_COMPLETION) && !summaryGapUi && (
                <input
                  type="text"
                  value={strAns}
                  onChange={(e) => setAnswer(currentQ._id, e.target.value)}
                  placeholder="Type your answer here…"
                  className={`block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 ${questionFontClass} text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none`}
                />
              )}

              {/* Clear */}
              {!isClientShowcase &&
                (strAns ||
                  arrAns.some((x) => String(x ?? "").trim().length > 0) ||
                  (flowchartGapUi &&
                    flowVals.some((x) => String(x ?? "").trim().length > 0)) ||
                  (tableGapUi &&
                    tableVals.some((x) => String(x ?? "").trim().length > 0)) ||
                  (diagramGapUi &&
                    diagramVals.some(
                      (x) => String(x ?? "").trim().length > 0,
                    ))) && (
                <button
                  onClick={() =>
                    currentQ.questionType ===
                      ReadingQuestionType.NOTE_COMPLETION ||
                    (currentQ.questionType === ReadingQuestionType.SHORT_ANSWER &&
                      shortAnswerGapUi) ||
                    (currentQ.questionType ===
                      ReadingQuestionType.SENTENCE_COMPLETION &&
                      sentenceCompletionGapUi) ||
                    (currentQ.questionType === ReadingQuestionType.SUMMARY_COMPLETION &&
                      summaryGapUi)
                      ? setAnswer(
                          currentQ._id,
                          new Array(
                            Math.max(0, noteCompletionGapCount),
                          ).fill(""),
                        )
                      : showcaseChoiceGroupUi
                        ? setAnswer(
                            currentQ._id,
                            new Array(currentQ.options?.length ?? 0).fill(""),
                          )
                      : flowchartGapUi
                        ? setAnswer(
                            currentQ._id,
                            new Array(flowchartGapCount).fill(""),
                          )
                        : tableGapUi
                          ? setAnswer(
                              currentQ._id,
                              new Array(tableGapCount).fill(""),
                            )
                          : diagramGapUi
                            ? setAnswer(
                                currentQ._id,
                                new Array(diagramGapCount).fill(""),
                              )
                          : currentQ.questionType ===
                                ReadingQuestionType.MATCHING_HEADINGS ||
                              currentQ.questionType ===
                                ReadingQuestionType.MATCHING_INFORMATION ||
                              currentQ.questionType ===
                                ReadingQuestionType.MATCHING_FEATURES ||
                              currentQ.questionType ===
                                ReadingQuestionType.LIST_MATCHING ||
                              currentQ.questionType ===
                                ReadingQuestionType.CLASSIFICATION ||
                              currentQ.questionType ===
                                ReadingQuestionType.MATCHING_SENTENCE_ENDINGS
                            ? setAnswer(
                                currentQ._id,
                                new Array(
                                  (currentQ.options ?? []).length || 0,
                                ).fill(""),
                              )
                            : setAnswer(currentQ._id, "")
                  }
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors underline"
                >
                  Clear answer
                </button>
              )}

              {supplementaryQuestions.map(({ question, localIndex }) => {
                const questionNumber = activePart.offset + localIndex + 1;
                return (
                  <CompactReadingQuestion
                    key={question._id}
                    question={question}
                    questionNumber={questionNumber}
                    answer={answers[question._id]}
                    setAnswer={setAnswer}
                    flagged={flaggedQuestions.has(questionNumber)}
                    onToggleFlag={() => onToggleFlag(questionNumber)}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-center mt-10">
              No question selected
            </p>
          )}
        </div>

        {/* Prev / Next arrows */}
        <div className="ielts-reading-navigation absolute bottom-3 right-3 z-20 flex w-max items-center gap-0.5">
          <button
            onClick={() => setActiveQNum(Math.max(1, activeQNum - 1))}
            disabled={activeQNum <= 1}
            className="ielts-reading-nav-button ielts-reading-nav-previous box-border flex h-14 min-h-14 w-14 min-w-14 shrink-0 items-center justify-center rounded-sm border-0 p-0 transition-colors"
            aria-label="Previous question"
          >
            <FiArrowLeft className="h-8 w-8 stroke-[3.5]" />
          </button>
          <button
            onClick={() =>
              setActiveQNum(Math.min(totalQuestions, activeQNum + 1))
            }
            disabled={activeQNum >= totalQuestions}
            className="ielts-reading-nav-button ielts-reading-nav-next box-border flex h-14 min-h-14 w-14 min-w-14 shrink-0 items-center justify-center rounded-sm border-0 p-0 transition-colors"
            aria-label="Next question"
          >
            <FiArrowRight className="h-8 w-8 stroke-[3.5]" />
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Reading Bottom Navigation Bar
// ─────────────────────────────────────────────────────────────

const ReadingBottomNav: React.FC<{
  totalQuestions: number;
  activeQNum: number;
  setActiveQNum: (n: number) => void;
  isAnswered: (n: number) => boolean;
  parts: ReadingPart[];
  flaggedQuestions: Set<number>;
}> = ({ activeQNum, setActiveQNum, isAnswered, parts, flaggedQuestions }) => {
  return (
    <div className="shrink-0 border-t border-gray-300 bg-white px-4 py-2 sm:px-6">
      <div className="flex w-full items-stretch gap-8 overflow-x-auto pb-1">
        {parts.map((part, partIndex) => {
          const start = part.offset + 1;
          const end = part.offset + part.questions.length;
          const showcasePart =
            part.test.createdBy === "client-preview" &&
            part.test._id === READING_PART_1_SHOWCASE_TEST._id;
          const numbers = Array.from(
            { length: part.questions.length },
            (_, index) => start + index,
          );
          const answeredCount = numbers.filter(isAnswered).length;
          const isCurrentPart = activeQNum >= start && activeQNum <= end;

          return (
            <div
              key={part.testId}
              className={`${showcasePart ? "min-w-[740px]" : "min-w-[260px]"} shrink-0 border-t-4 pt-2 ${
                isCurrentPart ? "border-[#b30d2f]" : "border-gray-200"
              }`}
            >
              <div className="mb-1.5 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setActiveQNum(start)}
                  className={`text-sm font-bold ${isCurrentPart ? "text-gray-950" : "text-gray-600 hover:text-gray-950"}`}
                >
                  Part {partIndex + 1}
                </button>
                <span className="text-xs text-gray-500">
                  {answeredCount} of {numbers.length}
                  {showcasePart ? " types reviewed" : ""}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {numbers.map((number, questionIndex) => {
                  const active = number === activeQNum;
                  const answered = isAnswered(number);
                  const flagged = flaggedQuestions.has(number);
                  const showcaseLabel = part.questions[
                    questionIndex
                  ]?.groupLabel
                    ?.split("·")[0]
                    ?.trim();
                  return (
                    <div key={number} className="relative shrink-0 pt-3">
                      {flagged && (
                        <FiBookmark
                          aria-hidden="true"
                          className="ielts-review-flag absolute left-1/2 top-0 h-3.5 w-3.5 -translate-x-1/2 fill-current text-[#ff4d4f]"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveQNum(number)}
                        aria-label={
                          showcasePart
                            ? `Question type ${showcaseLabel ?? number}${answered ? ", reviewed" : ""}${flagged ? ", flagged" : ""}`
                            : `Question ${number}${answered ? ", answered" : ""}${flagged ? ", flagged" : ""}`
                        }
                        title={
                          showcasePart
                            ? part.questions[questionIndex]?.groupLabel
                            : undefined
                        }
                        className={`flex h-8 items-center justify-center rounded-sm px-1 text-xs font-semibold transition-colors ${
                          showcasePart ? "min-w-11" : "min-w-7"
                        } ${
                          active
                            ? "border-2 border-sky-600 bg-white text-gray-950"
                            : answered
                              ? "bg-gray-800 text-white hover:bg-black"
                              : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {showcasePart ? showcaseLabel : number}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Writing Section
// ─────────────────────────────────────────────────────────────

const WritingSection: React.FC<{
  modules: IWritingModule[];
  texts: string[];
  setTexts: React.Dispatch<React.SetStateAction<string[]>>;
  activeTask: number;
  setActiveTask: (i: number) => void;
  onSubmit: () => void;
  submitting: boolean;
}> = ({
  modules,
  texts,
  setTexts,
  activeTask,
  setActiveTask,
  onSubmit,
  submitting,
}) => {
  const mod = modules[activeTask];
  const wordCount = (texts[activeTask] ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const minWords = activeTask === 0 ? 150 : 250;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Task prompt */}
      <div className="w-[42%] border-r border-gray-200 overflow-y-auto bg-[#f8f8f8] p-5">
        <div className="flex gap-2 mb-4">
          {modules.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveTask(i)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                activeTask === i
                  ? "bg-[#7a1c2e] text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              Task {i + 1}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              {mod?.taskType === "task1" ? "Task 1" : "Task 2"}
            </span>
          </div>

          {mod?.imageUrl && (
            <img
              src={mod.imageUrl}
              alt="Task image"
              className="w-full rounded-lg border border-gray-200"
            />
          )}

          <div
            className="prose prose-sm max-w-none text-gray-800 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: mod?.instruction ?? "" }}
          />

          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
            ⏱ You should spend about {activeTask === 0 ? 20 : 40} minutes on
            this task. Write at least <strong>{minWords} words</strong>.
          </p>
        </div>
      </div>

      {/* Right: Essay editor */}
      <div className="flex-1 flex flex-col bg-white">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
          <p className="text-sm font-semibold text-gray-700">
            Task {activeTask + 1} — Your Response
          </p>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-medium ${wordCount < minWords ? "text-orange-500" : "text-green-600"}`}
            >
              {wordCount} / {minWords}+ words
            </span>
          </div>
        </div>

        <textarea
          value={texts[activeTask] ?? ""}
          onChange={(e) => {
            const updated = [...texts];
            updated[activeTask] = e.target.value;
            setTexts(updated);
          }}
          placeholder={`Write your ${activeTask === 0 ? "Task 1" : "Task 2"} response here…`}
          className="flex-1 resize-none p-5 text-base text-gray-800 leading-relaxed focus:outline-none placeholder-gray-300"
        />

        <div className="shrink-0 px-5 py-3 border-t border-gray-200 flex items-center justify-between">
          {activeTask < modules.length - 1 ? (
            <button
              onClick={() => setActiveTask(activeTask + 1)}
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors"
            >
              Next: Task {activeTask + 2} →
            </button>
          ) : (
            <button
              onClick={onSubmit}
              disabled={submitting}
              className="px-8 py-2.5 bg-[#7a1c2e] text-white rounded-xl font-bold text-sm hover:bg-[#9b2335] transition-colors disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit Writing →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Speaking Section (simplified — instructions + completion)
// ─────────────────────────────────────────────────────────────

const SpeakingSection: React.FC<{
  examId: string;
  speaking?: string;
  onComplete: () => void;
}> = ({ onComplete }) => {
  return (
    <div className="flex items-center justify-center h-full bg-white">
      <div className="max-w-md text-center space-y-6 px-6">
        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto">
          <span className="text-4xl">🎙️</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Speaking Section
          </h2>
          <p className="text-gray-500 leading-relaxed">
            Your Speaking test will be conducted separately with an examiner, or
            via the speaking practice module. Click below to complete your mock
            exam submission.
          </p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800 text-left space-y-1">
          <p>
            <strong>Part 1:</strong> General questions about yourself (4–5 min)
          </p>
          <p>
            <strong>Part 2:</strong> Individual long turn with cue card (3–4
            min)
          </p>
          <p>
            <strong>Part 3:</strong> Two-way discussion with examiner (4–5 min)
          </p>
        </div>
        <button
          onClick={onComplete}
          className="w-full py-3 bg-[#7a1c2e] text-white rounded-xl font-bold hover:bg-[#9b2335] transition-colors"
        >
          Complete Exam & View Results
        </button>
      </div>
    </div>
  );
};

export default IELTSExamPage;
