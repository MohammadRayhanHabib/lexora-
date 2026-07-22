import React, { useEffect, useCallback, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  writingApi,
  WritingSessionMode,
  WritingSessionStatus,
  type IWritingModule,
  type IWritingSession,
} from "../../api/writing";
import { PageLoader } from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import { FiPause, FiPlay, FiSend, FiAlertTriangle, FiFileText, FiX, FiTrash2 } from "react-icons/fi";

type InstructionAnnotation = {
  id: string;
  type: "highlight" | "note";
  start: number;
  end: number;
  selectedText: string;
  note?: string;
};

type SelectionRange = {
  start: number;
  end: number;
};

// ─── Timer display ────────────────────────────────────────────────────────────
function formatTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Word counter ─────────────────────────────────────────────────────────────
function countWords(text: string) {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

const WritingExamPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<IWritingSession | null>(null);
  const [mod, setMod] = useState<IWritingModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [essayText, setEssayText] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [remaining, setRemaining] = useState<number>(0);
  const [isPaused, setIsPaused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tabWarnings, setTabWarnings] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= 768,
  );
  const [leftPaneWidth, setLeftPaneWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [annotations, setAnnotations] = useState<InstructionAnnotation[]>([]);
  const [selectedRange, setSelectedRange] = useState<SelectionRange | null>(
    null,
  );
  const [selectionMenu, setSelectionMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
  }>({ visible: false, x: 0, y: 0 });

  const autosaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const instructionRef = useRef<HTMLDivElement | null>(null);
  const selectionMenuRef = useRef<HTMLDivElement | null>(null);

  const localUiKey = sessionId ? `writing:ui:${sessionId}` : null;

  // ─── Load session + module ──────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const sRes = await writingApi.getSession(sessionId);
        const s = sRes.data.data;
        setSession(s);

        // If already submitted, redirect to result
        if (
          s.status === WritingSessionStatus.SUBMITTED ||
          s.status === WritingSessionStatus.AUTO_SUBMITTED
        ) {
          navigate(`/writing/result/${sessionId}`, { replace: true });
          return;
        }

        setIsPaused(s.status === WritingSessionStatus.PAUSED);

        // Load module info
        const mRes = await writingApi.getModule(s.moduleId);
        setMod(mRes.data.data);

        // Load saved draft
        const dRes = await writingApi.getDraft(sessionId);
        const draft = dRes.data.data;
        setEssayText(draft.essayText ?? "");
        setWordCount(draft.wordCount ?? 0);

        // Load timer
        const tRes = await writingApi.getTimer(sessionId);
        setRemaining(tRes.data.data.remainingSeconds);
      } catch {
        toast.error("Failed to load writing session");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, navigate]);

  // ─── Restore local UI state (notes + marks + split width) ─────────────────
  useEffect(() => {
    if (!localUiKey) return;
    try {
      const raw = localStorage.getItem(localUiKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        leftPaneWidth?: number;
        annotations?: InstructionAnnotation[];
      };

      if (
        typeof parsed.leftPaneWidth === "number" &&
        parsed.leftPaneWidth >= 30 &&
        parsed.leftPaneWidth <= 70
      ) {
        setLeftPaneWidth(parsed.leftPaneWidth);
      }
      if (Array.isArray(parsed.annotations)) {
        setAnnotations(
          parsed.annotations.filter(
            (a) =>
              typeof a?.id === "string" &&
              (a?.type === "highlight" || a?.type === "note") &&
              Number.isInteger(a?.start) &&
              Number.isInteger(a?.end) &&
              a.end > a.start,
          ),
        );
      }
    } catch {
      // Ignore malformed local UI state
    }
  }, [localUiKey]);

  useEffect(() => {
    if (!localUiKey) return;
    localStorage.setItem(
      localUiKey,
      JSON.stringify({
        leftPaneWidth,
        annotations,
      }),
    );
  }, [localUiKey, leftPaneWidth, annotations]);

  // ─── Start countdown ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isPaused || !session || loading) return;

    countdownTimer.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer.current!);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer.current!);
  }, [isPaused, session, loading]);

  // ─── Autosave every 5 seconds ───────────────────────────────────────────────
  const doAutoSave = useCallback(async () => {
    if (!sessionId || isPaused) return;
    try {
      await writingApi.autoSave(sessionId, essayText);
    } catch {
      /* silent */
    }
  }, [sessionId, essayText, isPaused]);

  useEffect(() => {
    autosaveTimer.current = setInterval(doAutoSave, 5000);
    return () => clearInterval(autosaveTimer.current!);
  }, [doAutoSave]);

  // ─── Tab switch detection (exam mode only) ──────────────────────────────────
  useEffect(() => {
    if (session?.mode !== WritingSessionMode.EXAM) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabWarnings((w) => {
          const next = w + 1;
          if (next >= 3) {
            toast.error("Auto-submitting: too many tab switches");
            handleAutoSubmit();
          } else {
            toast.error(
              `Warning ${next}/3: Do not switch tabs during exam mode`,
            );
          }
          return next;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [session?.mode]);

  // ─── Copy/paste block in exam mode ─────────────────────────────────────────
  const handleCopyPaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (session?.mode === WritingSessionMode.EXAM) {
        e.preventDefault();
        toast.error("Copy/paste is disabled in exam mode");
      }
    },
    [session?.mode],
  );

  // ─── Pause / Resume ─────────────────────────────────────────────────────────
  const handlePause = async () => {
    if (!sessionId) return;
    // Save draft first
    await writingApi.autoSave(sessionId, essayText);
    await writingApi.pause(sessionId);
    clearInterval(countdownTimer.current!);
    clearInterval(autosaveTimer.current!);
    setIsPaused(true);
    toast.success("Session paused");
  };

  const handleResume = async () => {
    if (!sessionId) return;
    const res = await writingApi.resume(sessionId);
    setSession(res.data.data);
    // Refresh timer
    const tRes = await writingApi.getTimer(sessionId);
    setRemaining(tRes.data.data.remainingSeconds);
    setIsPaused(false);
  };

  // ─── Manual submit ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!sessionId) return;
    setSubmitting(true);
    try {
      // Final autosave
      await writingApi.autoSave(sessionId, essayText);
      await writingApi.submit(sessionId, essayText);
      clearInterval(countdownTimer.current!);
      clearInterval(autosaveTimer.current!);
      navigate(`/writing/result/${sessionId}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Submit failed");
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  // ─── Auto submit (called by timer or tab detection) ─────────────────────────
  const handleAutoSubmit = useCallback(async () => {
    if (!sessionId) return;
    clearInterval(countdownTimer.current!);
    clearInterval(autosaveTimer.current!);
    try {
      await writingApi.submit(sessionId, essayText);
    } catch {
      /* ignore */
    }
    navigate(`/writing/result/${sessionId}`, { replace: true });
  }, [sessionId, essayText, navigate]);

  // ─── Resizable split-pane ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isResizing) return;

    const handleMove = (ev: MouseEvent) => {
      const container = splitContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) return;

      const next = ((ev.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(30, Math.min(70, next));
      setLeftPaneWidth(clamped);
    };

    const handleUp = () => setIsResizing(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  useEffect(() => {
    const syncViewport = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  const clearSelectionUi = () => {
    setSelectedRange(null);
    setSelectionMenu({ visible: false, x: 0, y: 0 });
  };

  const getSelectionOffsets = () => {
    const container = instructionRef.current;
    const selection = window.getSelection();
    if (!container || !selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    if (range.collapsed) return null;

    const ancestor = range.commonAncestorContainer;
    if (!container.contains(ancestor)) return null;

    const selectedText = range.toString();
    if (!selectedText.trim()) return null;

    const pre = document.createRange();
    pre.selectNodeContents(container);
    pre.setEnd(range.startContainer, range.startOffset);

    const start = pre.toString().length;
    const end = start + selectedText.length;
    if (end <= start) return null;

    const rect = range.getBoundingClientRect();
    return {
      range: { start, end },
      rect,
      selectedText,
    };
  };

  const handleInstructionSelection = () => {
    const result = getSelectionOffsets();
    if (!result) {
      clearSelectionUi();
      return;
    }

    setSelectedRange(result.range);
    setSelectionMenu({
      visible: true,
      x: result.rect.left + result.rect.width / 2,
      y: Math.max(12, result.rect.top - 8),
    });
  };

  const addAnnotation = (kind: "highlight" | "note") => {
    if (!selectedRange || !mod) return;

    const selectedText = (mod.instruction || "").slice(
      selectedRange.start,
      selectedRange.end,
    );
    if (!selectedText.trim()) {
      clearSelectionUi();
      return;
    }

    let noteText: string | undefined;
    if (kind === "note") {
      setShowNotes(true);
      noteText = "";
    }

    setAnnotations((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: kind,
        start: selectedRange.start,
        end: selectedRange.end,
        selectedText,
        note: noteText,
      },
    ]);

    window.getSelection()?.removeAllRanges();
    clearSelectionUi();
  };

  useEffect(() => {
    const onPointerDown = (ev: MouseEvent) => {
      const target = ev.target as Node;
      if (selectionMenuRef.current?.contains(target)) return;
      if (instructionRef.current?.contains(target)) return;
      clearSelectionUi();
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const renderInstructionWithAnnotations = () => {
    const text = mod?.instruction || "";
    if (!text) return null;
    if (!annotations.length) return text;

    const points = new Set<number>([0, text.length]);
    for (const ann of annotations) {
      points.add(Math.max(0, Math.min(text.length, ann.start)));
      points.add(Math.max(0, Math.min(text.length, ann.end)));
    }

    const sorted = Array.from(points).sort((a, b) => a - b);
    const nodes: React.ReactNode[] = [];

    for (let i = 0; i < sorted.length - 1; i += 1) {
      const start = sorted[i];
      const end = sorted[i + 1];
      if (start === end) continue;

      const chunk = text.slice(start, end);
      const inHighlight = annotations.some(
        (a) => a.type === "highlight" && a.start <= start && a.end >= end,
      );
      const noteAnn = annotations.find(
        (a) => a.type === "note" && a.start <= start && a.end >= end,
      );

      const className = [
        inHighlight ? "bg-yellow-200" : "",
        noteAnn ? "bg-amber-100 border-b border-amber-400" : "",
      ]
        .join(" ")
        .trim();

      nodes.push(
        <span key={`${start}-${end}`} className={className || undefined}>
          {chunk}
        </span>,
      );
    }

    return nodes;
  };

  if (loading) return <PageLoader />;
  if (!session || !mod) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Session not found.
      </div>
    );
  }

  const isExam = session.mode === WritingSessionMode.EXAM;
  const timeColor =
    remaining <= 120
      ? "text-red-600"
      : remaining <= 300
        ? "text-yellow-600"
        : "text-gray-800";
  const noteAnnotations = annotations.filter((a) => a.type === "note");

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* ─── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-4 py-2 border-b bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-900 text-sm truncate max-w-xs">
            {mod.title}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              isExam ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
            }`}
          >
            {isExam ? "Exam Mode" : "Practice"}
          </span>
          {isExam && tabWarnings > 0 && (
            <span className="flex items-center gap-1 text-xs text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">
              <FiAlertTriangle />
              {tabWarnings}/3 warnings
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Notes Toggle */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowNotes(!showNotes)}
            className="text-gray-700 bg-gray-50 border-gray-300 hover:bg-gray-100"
          >
            <FiFileText className="mr-1" />
            Notes
          </Button>

          {/* Timer */}
          <div className={`text-lg font-mono font-bold ${timeColor}`}>
            {isPaused ? (
              <span className="text-gray-400">PAUSED</span>
            ) : (
              formatTime(remaining)
            )}
          </div>

          {/* Pause/Resume — practice only */}
          {!isExam && (
            <Button
              size="sm"
              variant="outline"
              onClick={isPaused ? handleResume : handlePause}
            >
              {isPaused ? (
                <>
                  <FiPlay className="mr-1" />
                  Resume
                </>
              ) : (
                <>
                  <FiPause className="mr-1" />
                  Pause
                </>
              )}
            </Button>
          )}

          {/* Submit */}
          <Button
            size="sm"
            onClick={() => setShowConfirm(true)}
            disabled={isPaused || submitting}
          >
            <FiSend className="mr-1" />
            Submit
          </Button>
        </div>
      </header>

      {/* ─── Split Pane ──────────────────────────────────────────────────────── */}
      <div
        ref={splitContainerRef}
        className="flex flex-1 overflow-hidden flex-col md:flex-row"
      >
        {/* Left: Instruction + Image */}
        <div
          className="w-full border-b md:border-b-0 md:border-r overflow-y-auto p-6 bg-gray-50 max-h-[45vh] md:max-h-none"
          style={isDesktop ? { width: `${leftPaneWidth}%` } : undefined}
        >
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Title</h2>
              <p className="mt-1 text-sm text-gray-700">{mod.title}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Instruction / Task Prompt *
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Select text to open options: Note or Highlight
              </p>

              <div
                ref={instructionRef}
                onMouseUp={handleInstructionSelection}
                onKeyUp={handleInstructionSelection}
                className="mt-3 rounded-lg border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap select-text"
              >
                {renderInstructionWithAnnotations()}
              </div>
            </div>

            {mod.imageUrl && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Task Image
                </p>
                <img
                  src={mod.imageUrl}
                  alt={mod.title}
                  className="w-full rounded-lg border object-contain max-h-80"
                />
              </div>
            )}
          </div>
        </div>

        {/* Middle draggable divider */}
        {isDesktop && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panels"
            onMouseDown={() => setIsResizing(true)}
            className="w-1.5 cursor-col-resize bg-gray-200 transition hover:bg-blue-300"
          />
        )}

        {/* Right: Essay textarea */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <textarea
            value={essayText}
            onChange={(e) => {
              const val = e.target.value;
              setEssayText(val);
              setWordCount(countWords(val));
            }}
            onCopy={handleCopyPaste}
            onPaste={handleCopyPaste}
            onCut={handleCopyPaste}
            disabled={isPaused}
            className="flex-1 resize-none p-6 text-sm text-gray-900 focus:outline-none disabled:bg-gray-100"
            placeholder={
              isPaused
                ? "Session is paused. Click Resume to continue."
                : "Start writing your response here…"
            }
            spellCheck
          />
          {/* Word count bar */}
          <div className="shrink-0 px-6 py-2 border-t bg-white flex items-center justify-between text-xs text-gray-500">
            <span>
              Word count:{" "}
              <span
                className={`font-semibold ${
                  wordCount < 150
                    ? "text-red-500"
                    : wordCount < 250
                      ? "text-yellow-600"
                      : "text-green-600"
                }`}
              >
                {wordCount}
              </span>
              {mod.taskType === "task1" ? " / 150 min" : " / 250 min"}
            </span>
            <span className="italic">Autosaved every 5s</span>
          </div>
        </div>

        {/* Extreme Right: Notes Sidebar */}
        {showNotes && (
          <div className="w-80 border-l bg-gray-50 flex flex-col shrink-0 relative transition-all duration-300">
            <div className="flex items-center justify-between p-3 border-b bg-white shadow-sm">
              <span className="font-semibold text-gray-800 flex items-center">
                <FiFileText className="mr-2 text-blue-600" />
                Notes
              </span>
              <button
                onClick={() => setShowNotes(false)}
                className="text-gray-500 hover:text-gray-800 p-1 rounded hover:bg-gray-200"
              >
                <FiX size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {noteAnnotations.length === 0 ? (
                <div className="text-center mt-10">
                  <FiFileText className="mx-auto text-4xl text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No notes added yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Select text in the prompt to add a specific note.</p>
                </div>
              ) : (
                noteAnnotations.map(ann => (
                  <div key={ann.id} className="bg-white border border-amber-200 rounded-md p-3 shadow-sm flex flex-col group relative">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-amber-900 border-l-2 border-amber-400 pl-2 leading-relaxed bg-amber-50 p-1 rounded-r line-clamp-3 w-full mr-6">
                        "{ann.selectedText}"
                      </span>
                      <button
                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded p-1 border border-transparent hover:border-gray-200"
                        onClick={() => setAnnotations(prev => prev.filter(a => a.id !== ann.id))}
                        title="Delete Note"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                    <textarea
                      className="text-sm text-gray-800 w-full resize-none outline-none border border-transparent hover:border-gray-200 focus:border-blue-400 rounded p-1.5 transition-colors focus:ring-2 focus:ring-blue-100 bg-gray-50 hover:bg-white focus:bg-white"
                      placeholder="Type your note here..."
                      rows={3}
                      value={ann.note || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAnnotations(prev => prev.map(a => a.id === ann.id ? { ...a, note: val } : a));
                      }}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {selectionMenu.visible && (
        <div
          ref={selectionMenuRef}
          className="fixed z-50 -translate-x-1/2 -translate-y-full rounded-md border border-gray-300 bg-white shadow-lg"
          style={{ left: selectionMenu.x, top: selectionMenu.y }}
        >
          <button
            type="button"
            onClick={() => addAnnotation("note")}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
          >
            Note
          </button>
          <button
            type="button"
            onClick={() => addAnnotation("highlight")}
            className="border-l border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
          >
            Highlight
          </button>
        </div>
      )}

      {/* ─── Submit confirmation modal ────────────────────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              Submit your essay?
            </h3>
            <p className="text-sm text-gray-600">
              Once submitted, you cannot make any changes.{" "}
              {wordCount < 150 ? "⚠️ Your essay is under 150 words." : ""}
            </p>
            <div className="flex gap-3">
              <Button
                onClick={handleSubmit}
                loading={submitting}
                className="flex-1"
              >
                Yes, Submit
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WritingExamPage;
