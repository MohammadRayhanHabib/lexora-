import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Play,
  Pause,
} from "lucide-react";
import {
  IListeningQuestion,
  IListeningTest,
  ListeningQuestionType,
} from "../../types";
import TableCompletionPanel from "../reading/TableCompletionPanel";
import ListeningNoteCompletionPanel from "./ListeningNoteCompletionPanel";
import {
  countTableGapTokens,
  countFlowchartGapTokens,
  countListeningNoteGaps,
  FLOWCHART_GAP_TOKEN,
} from "../../api/reading";

interface ListeningWorkspaceProps {
  test: IListeningTest | null;
  answers: Record<string, string>;
  activeSection: number;
  onSectionChange: (sectionIndex: number) => void;
  onAnswerChange: (questionId: string, value: string) => void;
  mode?: "practice" | "exam";
  loadingLabel?: string;
  className?: string;
}

function listeningGapCount(q: IListeningQuestion): number {
  if (q.type === ListeningQuestionType.FLOWCHART_COMPLETION) {
    return countFlowchartGapTokens(q.options);
  }
  if (q.type === ListeningQuestionType.NOTE_COMPLETION) {
    return countListeningNoteGaps(q.options);
  }
  if (q.type === ListeningQuestionType.TABLE_COMPLETION) {
    return countTableGapTokens(q.options);
  }
  if (q.type === ListeningQuestionType.MULTIPLE_CHOICE_MULTIPLE) {
    const n = q.selectCount;
    if (typeof n === "number" && n >= 1 && n <= 20) return Math.floor(n);
    return 2;
  }
  if (q.type === ListeningQuestionType.MATCHING) {
    const s = q.matchStemCount;
    if (
      typeof s === "number" &&
      s >= 1 &&
      s <= 30 &&
      (q.options?.length ?? 0) > s
    ) {
      return Math.floor(s);
    }
    return 1;
  }
  if (
    q.type === ListeningQuestionType.MAP_LABELING &&
    isListeningMapLabelingQuestion(q)
  ) {
    return q.options?.length ?? 0;
  }
  return 1;
}

function listeningMatchStemCountQuestion(q: IListeningQuestion): number {
  if (q.type !== ListeningQuestionType.MATCHING) return 0;
  const n = q.matchStemCount;
  if (typeof n === "number" && n >= 1 && n <= 30) return Math.floor(n);
  return 0;
}

function isListeningBoxMatchingQuestion(q: IListeningQuestion): boolean {
  const s = listeningMatchStemCountQuestion(q);
  return s > 0 && (q.options?.length ?? 0) > s;
}

function mapLabelChoiceCountQuestion(q: IListeningQuestion): number {
  if (q.type !== ListeningQuestionType.MAP_LABELING) return 8;
  const n = q.mapChoiceCount;
  if (typeof n === "number" && n >= 2 && n <= 20) return Math.floor(n);
  return 8;
}

function isListeningMapLabelingQuestion(q: IListeningQuestion): boolean {
  if (q.type !== ListeningQuestionType.MAP_LABELING) return false;
  const img = (q.mapImageUrl ?? "").trim();
  const rows = q.options?.length ?? 0;
  return img.length > 0 && rows >= 1;
}

function firstGlobalNumberForQuestion(
  test: IListeningTest,
  sectionIdx: number,
  questionIdxInSection: number,
): number {
  let n = 1;
  for (let s = 0; s < sectionIdx; s++) {
    for (const q of test.sections[s].questions) {
      n += listeningGapCount(q);
    }
  }
  const sec = test.sections[sectionIdx];
  for (let i = 0; i < questionIdxInSection; i++) {
    n += listeningGapCount(sec.questions[i]);
  }
  return n;
}

function sectionListeningRange(
  test: IListeningTest,
  sectionIdx: number,
): { start: number; end: number } {
  let start = 1;
  for (let s = 0; s < sectionIdx; s++) {
    for (const q of test.sections[s].questions) {
      start += listeningGapCount(q);
    }
  }
  let span = 0;
  for (const q of test.sections[sectionIdx].questions) {
    span += listeningGapCount(q);
  }
  return { start, end: start + Math.max(0, span) - 1 };
}

function parseJsonStringArray(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p.map((x) => String(x ?? "").trim()) : [];
  } catch {
    return [];
  }
}

function flowchartGapsBeforeRowListening(rows: string[], rowIdx: number): number {
  let n = 0;
  for (let i = 0; i < rowIdx; i++) {
    n += Math.max(0, (rows[i] ?? "").split(FLOWCHART_GAP_TOKEN).length - 1);
  }
  return n;
}

interface ListeningFlowchartPanelProps {
  title?: string;
  rows: string[];
  hints: string[];
  firstQuestionNumber: number;
  answerJson: string;
  onChange: (next: string) => void;
}

const ListeningFlowchartCompletionPanel: React.FC<
  ListeningFlowchartPanelProps
> = ({ title, rows, hints, firstQuestionNumber, answerJson, onChange }) => {
  const gapCount = countFlowchartGapTokens(rows);
  const parsed = parseJsonStringArray(answerJson);
  const vals = Array.from({ length: gapCount }, (_, i) =>
    String(parsed[i] ?? ""),
  );
  const [activeGap, setActiveGap] = useState<number | null>(null);

  const setVal = (g: number, v: string) => {
    const next = [...vals];
    next[g] = v;
    onChange(JSON.stringify(next));
  };

  return (
    <div className="space-y-4">
      {title?.trim() ? (
        <h3 className="text-center text-base font-bold text-gray-900 leading-snug">
          {title.trim()}
        </h3>
      ) : null}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
        <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm">
          {rows.map((row, ri) => {
            const parts = (row ?? "").split(FLOWCHART_GAP_TOKEN);
            return (
              <React.Fragment key={ri}>
                {ri > 0 && (
                  <div
                    className="flex justify-center py-0.5 text-xl leading-none text-gray-600"
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
                            (
                            {firstQuestionNumber +
                              flowchartGapsBeforeRowListening(rows, ri) +
                              pi}
                            )
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveGap(
                                flowchartGapsBeforeRowListening(rows, ri) + pi,
                              )
                            }
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "copy";
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              const w = e.dataTransfer
                                .getData("text/plain")
                                .trim();
                              if (w)
                                setVal(
                                  flowchartGapsBeforeRowListening(rows, ri) +
                                    pi,
                                  w,
                                );
                            }}
                            className={`min-w-[7rem] max-w-[min(14rem,88vw)] rounded-md border-2 border-dashed px-2 py-1.5 text-center text-sm transition-colors ${
                              activeGap ===
                              flowchartGapsBeforeRowListening(rows, ri) + pi
                                ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-300"
                                : "border-rose-300 bg-rose-50/80 hover:border-rose-400"
                            }`}
                            aria-label={`Gap ${
                              firstQuestionNumber +
                              flowchartGapsBeforeRowListening(rows, ri) +
                              pi
                            }`}
                          >
                            {vals[
                              flowchartGapsBeforeRowListening(rows, ri) + pi
                            ]?.trim() ? (
                              <span className="font-medium text-gray-900">
                                {
                                  vals[
                                    flowchartGapsBeforeRowListening(rows, ri) +
                                      pi
                                  ]
                                }
                              </span>
                            ) : (
                              <span className="text-rose-400/80">······</span>
                            )}
                          </button>
                        </span>
                      ) : null}
                    </React.Fragment>
                  ))}
                </div>
              </React.Fragment>
            );
          })}
        </div>
        <div className="rounded-xl border-2 border-dashed border-rose-200 bg-rose-50/70 p-4 shadow-inner min-h-[140px]">
          <p className="text-xs font-semibold text-rose-900 uppercase tracking-wide mb-3 text-center">
            Answer pool
          </p>
          <p className="text-[11px] text-rose-800/80 text-center mb-3">
            Drag a word into a gap, or tap a gap then tap a word.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {hints.map((h, i) => (
              <button
                key={`${h}-${i}`}
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", h);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => {
                  if (activeGap == null) return;
                  setVal(activeGap, h);
                  setActiveGap(null);
                }}
                className="cursor-grab active:cursor-grabbing rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm hover:bg-rose-50"
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ListeningWorkspace: React.FC<ListeningWorkspaceProps> = ({
  test,
  answers,
  activeSection,
  onSectionChange,
  onAnswerChange,
  mode = "practice",
  loadingLabel = "Loading listening test...",
  className = "",
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);
  const [audioEnded, setAudioEnded] = useState(false);
  const [stripTime, setStripTime] = useState(0);
  const [stripDur, setStripDur] = useState(0);
  const [stripVol, setStripVol] = useState(1);
  const [highlightGlobalQ, setHighlightGlobalQ] = useState<number | null>(null);

  const currentSection = test?.sections[activeSection];
  const sectionUseIeltsShell = Boolean(
    currentSection?.questions.some(
      (q) =>
        q.type === ListeningQuestionType.FLOWCHART_COMPLETION ||
        q.type === ListeningQuestionType.NOTE_COMPLETION ||
        q.type === ListeningQuestionType.TABLE_COMPLETION ||
        q.type === ListeningQuestionType.MULTIPLE_CHOICE_MULTIPLE ||
        (q.type === ListeningQuestionType.MATCHING &&
          isListeningBoxMatchingQuestion(q)) ||
        (q.type === ListeningQuestionType.MAP_LABELING &&
          isListeningMapLabelingQuestion(q)),
    ),
  );
  const range = test ? sectionListeningRange(test, activeSection) : null;

  const syncStripFromAudio = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    setStripTime(a.currentTime);
    setStripDur(Number.isFinite(a.duration) ? a.duration : 0);
    setStripVol(a.volume);
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => syncStripFromAudio();
    const onMeta = () => syncStripFromAudio();
    const onVol = () => setStripVol(a.volume);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    a.addEventListener("volumechange", onVol);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onMeta);
      a.removeEventListener("volumechange", onVol);
    };
  }, [test, syncStripFromAudio]);

  useEffect(() => {
    if (range) setHighlightGlobalQ(range.start);
  }, [activeSection, range?.start, range?.end]);

  useEffect(() => {
    if (mode !== "exam" || !test || !audioRef.current) return;

    const playAudio = async () => {
      try {
        await audioRef.current?.play();
      } catch {
        // Autoplay may be blocked by the browser; the controls remain usable.
      }
    };

    const audio = audioRef.current;
    if (audio.readyState >= 2) {
      void playAudio();
      return;
    }

    audio.addEventListener("canplay", playAudio, { once: true });
    return () => {
      audio.removeEventListener("canplay", playAudio);
    };
  }, [mode, test]);

  const handleAudioPlay = () => {
    setAudioPlaying(true);
    if (!audioStarted) setAudioStarted(true);
    setAudioEnded(false);
  };

  const handleAudioPause = () => setAudioPlaying(false);
  const handleAudioEnded = () => {
    setAudioPlaying(false);
    setAudioEnded(true);
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (!test?.allowReplay && audioEnded) return;
    if (a.paused) {
      void a.play().catch(() => {});
    } else {
      a.pause();
    }
  };

  const seekTo = (t: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = t;
    setStripTime(t);
  };

  const setVolume = (v: number) => {
    const a = audioRef.current;
    if (!a) return;
    const nv = Math.min(1, Math.max(0, v));
    a.volume = nv;
    setStripVol(nv);
  };

  const focusGlobalQuestion = (n: number) => {
    setHighlightGlobalQ(n);
    let el = document.querySelector(
      `[aria-label="Question ${n}"]`,
    ) as HTMLElement | null;
    if (!el) {
      document.querySelectorAll("[data-listening-q-range]").forEach((node) => {
        const d = node.getAttribute("data-listening-q-range");
        if (!d) return;
        const [a, b] = d.split("-").map((x) => parseInt(x, 10));
        if (!Number.isNaN(a) && !Number.isNaN(b) && n >= a && n <= b) {
          el = node as HTMLElement;
        }
      });
    }
    el?.focus();
  };

  if (!test) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <p className="text-gray-400">{loadingLabel}</p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col h-full w-full max-w-7xl mx-auto ${className}`}
    >
      <audio
        ref={audioRef}
        src={test.audioUrl}
        autoPlay={mode === "exam"}
        controls={!sectionUseIeltsShell && mode !== "exam"}
        preload="auto"
        onPlay={handleAudioPlay}
        onPause={handleAudioPause}
        onEnded={handleAudioEnded}
        controlsList={
          mode === "exam" ? "nodownload noplaybackrate" : "nodownload"
        }
        onContextMenu={(e) => e.preventDefault()}
        className={
          sectionUseIeltsShell
            ? "sr-only"
            : "w-full h-10 accent-blue-600 rounded-xl border border-gray-100"
        }
      />

      {!sectionUseIeltsShell && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <div className="flex items-center gap-3 mb-3">
            {audioPlaying ? (
              <Volume2 className="w-5 h-5 text-blue-600 animate-pulse" />
            ) : (
              <VolumeX className="w-5 h-5 text-gray-400" />
            )}
            <span className="font-medium text-gray-700">
              {audioPlaying ? "Audio is playing" : "Audio playback"}
            </span>
            {!test.allowReplay && audioStarted && (
              <span className="ml-auto text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                Single play only
              </span>
            )}
          </div>

          {mode === "exam" && !audioPlaying && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Audio has not started yet
                </p>
                <p className="text-xs text-amber-700">
                  Click start to begin playback. Once it starts, it will keep
                  running.
                </p>
              </div>
              <button
                type="button"
                onClick={() => audioRef.current?.play().catch(() => {})}
                className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700"
              >
                Start Audio
              </button>
            </div>
          )}

          {mode === "exam" && (
            <p className="mt-2 text-xs text-gray-500">
              Audio starts automatically in exam mode and remains uninterrupted.
            </p>
          )}
        </div>
      )}

      <div className="flex gap-5 flex-1 min-h-0">
        <aside className="w-48 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Sections
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {test.sections.map((section, idx) => (
                <button
                  key={section.partNumber}
                  onClick={() => onSectionChange(idx)}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                    activeSection === idx
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="font-medium">Part {section.partNumber}</span>
                  <span className="block text-xs text-gray-400 mt-0.5 truncate">
                    {section.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-0">
          {sectionUseIeltsShell && currentSection && range && (
            <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 px-4 py-3 shrink-0">
              <div className="flex flex-wrap items-center gap-4">
                <div className="shrink-0">
                  <p className="text-sm font-bold text-gray-900">
                    Part {currentSection.partNumber}
                  </p>
                  <p className="text-sm font-bold text-gray-900">
                    Questions {range.start}
                    {range.end > range.start ? `–${range.end}` : ""}
                  </p>
                </div>

                <div className="flex flex-1 min-w-[200px] items-center gap-2">
                  <button
                    type="button"
                    onClick={togglePlay}
                    disabled={!test.allowReplay && audioEnded}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white shadow-md transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={audioPlaying ? "Pause" : "Play"}
                  >
                    {audioPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5 pl-0.5" />
                    )}
                  </button>
                  <div className="relative h-2 flex-1 min-w-[80px] rounded-full bg-gradient-to-r from-pink-200 via-purple-200 to-indigo-200">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-pink-400 to-purple-500"
                      style={{
                        width: `${
                          stripDur > 0
                            ? Math.min(100, (stripTime / stripDur) * 100)
                            : 0
                        }%`,
                      }}
                    />
                    <input
                      type="range"
                      min={0}
                      max={stripDur > 0 ? stripDur : 1}
                      step={0.1}
                      value={stripTime}
                      onChange={(e) => seekTo(Number(e.target.value))}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      aria-label="Seek audio"
                    />
                  </div>
                  <Volume2 className="h-4 w-4 shrink-0 text-gray-500" />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={stripVol}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="h-8 w-20 accent-purple-600"
                    aria-label="Volume"
                  />
                </div>

                <div className="max-w-md shrink text-right text-xs leading-snug text-gray-800 sm:text-sm">
                  {(() => {
                    const hasTbl = currentSection.questions.some(
                      (q) =>
                        q.type === ListeningQuestionType.TABLE_COMPLETION,
                    );
                    const hasNote = currentSection.questions.some(
                      (q) =>
                        q.type === ListeningQuestionType.NOTE_COMPLETION,
                    );
                    const hasMulti = currentSection.questions.some(
                      (q) =>
                        q.type ===
                        ListeningQuestionType.MULTIPLE_CHOICE_MULTIPLE,
                    );
                    const hasBoxMatch = currentSection.questions.some((q) =>
                      isListeningBoxMatchingQuestion(q),
                    );
                    const hasMapLbl = currentSection.questions.some((q) =>
                      isListeningMapLabelingQuestion(q),
                    );
                    if (hasMapLbl && !hasTbl && !hasMulti && !hasBoxMatch) {
                      const ch = (() => {
                        const mq = currentSection.questions.find((x) =>
                          isListeningMapLabelingQuestion(x),
                        );
                        return mq ? mapLabelChoiceCountQuestion(mq) : 8;
                      })();
                      const endL = String.fromCharCode(65 + ch - 1);
                      return (
                        <>
                          <p className="font-medium">
                            {currentSection.description ||
                              "Label the map below."}
                          </p>
                          <p className="mt-0.5 font-semibold text-gray-700">
                            Choose the correct letter, A–{endL}.
                          </p>
                        </>
                      );
                    }
                    if (hasBoxMatch && !hasTbl && !hasMulti) {
                      return (
                        <>
                          <p className="font-medium">
                            {currentSection.description ||
                              "What is the role of the volunteers in each of the following activities?"}
                          </p>
                          <p className="mt-0.5 font-semibold text-gray-700">
                            Write the correct letter from the box (A, B, C …) in
                            each answer box next to the question numbers.
                          </p>
                        </>
                      );
                    }
                    if (hasMulti && !hasTbl) {
                      return (
                        <>
                          <p className="font-medium">
                            {currentSection.description ||
                              "Choose the correct letter, A, B or C."}
                          </p>
                          <p className="mt-0.5 font-semibold text-gray-700">
                            Select every answer that applies when a question
                            asks for more than one choice.
                          </p>
                        </>
                      );
                    }
                    if (hasTbl) {
                      return (
                        <>
                          {currentSection.description ? (
                            <p className="font-medium">
                              {currentSection.description}
                            </p>
                          ) : (
                            <p className="font-medium">
                              Complete the notes below.
                            </p>
                          )}
                          <p className="mt-0.5 font-semibold text-gray-700">
                            Write <span className="uppercase">one</span> word
                            and/or a number for each answer.
                          </p>
                        </>
                      );
                    }
                    if (
                      hasNote &&
                      !hasTbl &&
                      !hasMulti &&
                      !hasBoxMatch &&
                      !hasMapLbl
                    ) {
                      return (
                        <>
                          {currentSection.description ? (
                            <p className="font-medium">
                              {currentSection.description}
                            </p>
                          ) : (
                            <p className="font-medium">
                              Complete the notes below.
                            </p>
                          )}
                          <p className="mt-0.5 font-semibold text-gray-700">
                            Write <span className="uppercase">one</span> word
                            and/or a number for each answer.
                          </p>
                        </>
                      );
                    }
                    return (
                      <>
                        <p className="font-medium">
                          {currentSection.description ||
                            "Follow the instructions for each task."}
                        </p>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {!sectionUseIeltsShell && (
            <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
              <h2 className="font-semibold text-gray-800">
                Part {currentSection?.partNumber}: {currentSection?.title}
              </h2>
              {currentSection?.description && (
                <p className="text-sm text-gray-500 mt-1">
                  {currentSection.description}
                </p>
              )}
            </div>
          )}

          {sectionUseIeltsShell && (
            <div className="border-b border-gray-100 px-6 py-2">
              <h2 className="text-sm font-semibold text-gray-700">
                {currentSection?.title}
              </h2>
            </div>
          )}

          <div
            className="flex-1 overflow-y-auto p-6 space-y-6"
            onFocusCapture={(e) => {
              const t = e.target as HTMLElement;
              const lab = t.getAttribute("aria-label");
              const m = lab?.match(/^Question (\d+)/);
              if (m) setHighlightGlobalQ(Number(m[1]));
            }}
          >
            {currentSection?.questions.map((question, index) => (
              <QuestionItem
                key={question.id}
                question={question}
                index={index}
                value={answers[question.id] ?? ""}
                onChange={(value) => onAnswerChange(question.id, value)}
                firstQuestionNumber={firstGlobalNumberForQuestion(
                  test,
                  activeSection,
                  index,
                )}
                ieltsShell={sectionUseIeltsShell}
              />
            ))}
          </div>

          {sectionUseIeltsShell && range && range.end >= range.start && (
            <div className="border-t border-slate-200/90 bg-gradient-to-r from-slate-100 to-slate-50 px-4 py-3 shrink-0">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    highlightGlobalQ != null &&
                    highlightGlobalQ > range.start &&
                    focusGlobalQuestion(highlightGlobalQ - 1)
                  }
                  disabled={
                    highlightGlobalQ == null || highlightGlobalQ <= range.start
                  }
                  className="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                  aria-label="Previous question"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from(
                  { length: range.end - range.start + 1 },
                  (_, i) => range.start + i,
                ).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => focusGlobalQuestion(n)}
                    className={`min-w-[2.25rem] rounded-lg border px-2 py-1.5 text-sm font-semibold tabular-nums transition ${
                      highlightGlobalQ === n
                        ? "border-blue-700 bg-white text-blue-800 ring-2 ring-blue-400"
                        : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    highlightGlobalQ != null &&
                    highlightGlobalQ < range.end &&
                    focusGlobalQuestion(highlightGlobalQ + 1)
                  }
                  disabled={
                    highlightGlobalQ == null || highlightGlobalQ >= range.end
                  }
                  className="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                  aria-label="Next question"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 px-6 py-4 flex justify-between items-center">
            <button
              onClick={() => onSectionChange(Math.max(0, activeSection - 1))}
              disabled={activeSection === 0}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous Part
            </button>

            <span className="text-xs text-gray-400">
              {activeSection + 1} / {test.sections.length}
            </span>

            <button
              onClick={() =>
                onSectionChange(
                  Math.min(test.sections.length - 1, activeSection + 1),
                )
              }
              disabled={activeSection === test.sections.length - 1}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next Part
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface QuestionItemProps {
  question: IListeningQuestion;
  index: number;
  value: string;
  onChange: (val: string) => void;
  firstQuestionNumber: number;
  /** IELTS-style part: hide per-question index chip (table / multi-MCQ layout) */
  ieltsShell?: boolean;
}

const COUNT_WORD = [
  "",
  "ONE",
  "TWO",
  "THREE",
  "FOUR",
  "FIVE",
  "SIX",
  "SEVEN",
  "EIGHT",
  "NINE",
  "TEN",
] as const;

const QuestionItem: React.FC<QuestionItemProps> = ({
  question,
  index,
  value,
  onChange,
  firstQuestionNumber,
  ieltsShell = false,
}) => {
  if (
    question.type === ListeningQuestionType.FLOWCHART_COMPLETION &&
    countFlowchartGapTokens(question.options ?? []) > 0
  ) {
    return (
      <div className="group rounded-xl border border-gray-100 bg-white p-5 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40">
        <p className="text-sm italic text-gray-700 mb-1">
          Questions {firstQuestionNumber}
          {countFlowchartGapTokens(question.options ?? []) > 1
            ? `–${
                firstQuestionNumber +
                countFlowchartGapTokens(question.options ?? []) -
                1
              }`
            : ""}
          . Complete the flow-chart using words from the box.
        </p>
        <ListeningFlowchartCompletionPanel
          title={question.questionText}
          rows={question.options ?? []}
          hints={(question.wordBank ?? []).filter((h) => h.trim())}
          firstQuestionNumber={firstQuestionNumber}
          answerJson={value}
          onChange={onChange}
        />
      </div>
    );
  }

  if (
    question.type === ListeningQuestionType.NOTE_COMPLETION &&
    countListeningNoteGaps(question.options ?? []) > 0
  ) {
    const ng = countListeningNoteGaps(question.options ?? []);
    return (
      <div
        className="group rounded-xl border border-gray-100 bg-white p-5 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40"
        data-listening-q-range={
          ng > 1
            ? `${firstQuestionNumber}-${firstQuestionNumber + ng - 1}`
            : `${firstQuestionNumber}`
        }
        tabIndex={-1}
      >
        <p className="text-sm italic text-gray-700 mb-1">
          Questions {firstQuestionNumber}
          {ng > 1 ? `–${firstQuestionNumber + ng - 1}` : ""}. Complete the notes
          below. Write <span className="font-semibold uppercase">one</span>{" "}
          word and/or a number for each answer.
        </p>
        <ListeningNoteCompletionPanel
          title={question.questionText}
          lines={question.options ?? []}
          firstQuestionNumber={firstQuestionNumber}
          answerJson={value}
          onChange={onChange}
        />
      </div>
    );
  }

  if (question.type === ListeningQuestionType.TABLE_COMPLETION) {
    const gapCount = countTableGapTokens(question.options);
    const parsed = parseJsonStringArray(value);
    const vals = Array.from({ length: gapCount }, (_, i) =>
      String(parsed[i] ?? ""),
    );
    return (
      <div className="group">
        <TableCompletionPanel
          title={question.questionText}
          firstQuestionNumber={firstQuestionNumber}
          options={question.options ?? []}
          hints={[]}
          answer={vals}
          onChange={(next) => onChange(JSON.stringify(next))}
          centerTableHeaders
        />
      </div>
    );
  }

  if (
    question.type === ListeningQuestionType.MAP_LABELING &&
    isListeningMapLabelingQuestion(question) &&
    question.options?.length
  ) {
    const rows = question.options.length;
    const choices = mapLabelChoiceCountQuestion(question);
    const parsed = parseJsonStringArray(value);
    const vals = Array.from({ length: rows }, (_, i) => {
      const cell = String(parsed[i] ?? "").trim().toUpperCase();
      return /^[A-Z]$/.test(cell.charAt(0)) ? cell.charAt(0) : "";
    });
    const last = firstQuestionNumber + rows - 1;
    const endLetter = String.fromCharCode(65 + choices - 1);
    const letters = Array.from({ length: choices }, (_, j) =>
      String.fromCharCode(65 + j),
    );
    const setRow = (rowIdx: number, letter: string) => {
      const L = letter.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 1);
      const next = [...vals];
      next[rowIdx] =
        L && L.charCodeAt(0) < 65 + choices ? L : "";
      onChange(JSON.stringify(next));
    };

    return (
      <div
        className="group rounded-xl border border-gray-100 bg-white p-5 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40"
        tabIndex={-1}
      >
        <p className="text-sm italic text-gray-700 mb-1">
          Questions {firstQuestionNumber}–{last}. Choose the correct letter,
          A–{endLetter}.
        </p>
        <h3 className="text-base font-bold text-gray-900 mb-4 leading-snug">
          {question.questionText}
        </h3>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-xl border border-dashed border-gray-300 bg-slate-50 p-3 shadow-inner overflow-hidden flex items-center justify-center min-h-[200px]">
            <img
              src={(question.mapImageUrl ?? "").trim()}
              alt="Map for labelling"
              className="max-h-[55vh] w-full object-contain"
            />
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[280px] border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th
                    scope="col"
                    className="border border-gray-200 px-2 py-2 text-left font-semibold text-gray-800 whitespace-nowrap"
                  >
                    Location
                  </th>
                  {letters.map((L) => (
                    <th
                      key={L}
                      scope="col"
                      className="border border-gray-200 px-1 py-2 text-center font-bold text-gray-800 w-10"
                    >
                      {L}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {question.options.map((label, ri) => (
                  <tr key={ri} className="hover:bg-slate-50/60">
                    <th
                      scope="row"
                      className="border border-gray-200 px-2 py-2 text-left font-normal text-gray-900 align-middle"
                    >
                      <span className="font-bold tabular-nums">
                        {firstQuestionNumber + ri}.
                      </span>{" "}
                      {label}
                    </th>
                    {letters.map((L) => (
                      <td
                        key={L}
                        className="border border-gray-200 p-0 text-center align-middle"
                      >
                        <label className="flex cursor-pointer items-center justify-center py-2 min-h-[2.5rem]">
                          <input
                            type="radio"
                            name={`map-${question.id}-r${ri}`}
                            checked={vals[ri] === L}
                            onChange={() => setRow(ri, L)}
                            className="h-4 w-4 accent-rose-600"
                            aria-label={`Question ${firstQuestionNumber + ri} ${L}`}
                          />
                        </label>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (
    question.type === ListeningQuestionType.MATCHING &&
    isListeningBoxMatchingQuestion(question) &&
    question.options
  ) {
    const stemN = listeningMatchStemCountQuestion(question);
    const stems = question.options.slice(0, stemN);
    const pool = question.options.slice(stemN);
    const last = firstQuestionNumber + stemN - 1;
    const parsed = parseJsonStringArray(value);
    const vals = Array.from({ length: stemN }, (_, i) => {
      const cell = String(parsed[i] ?? "").trim().toUpperCase();
      return /^[A-Z]$/.test(cell.charAt(0)) ? cell.charAt(0) : "";
    });
    const endLetter =
      pool.length > 0 ? String.fromCharCode(65 + pool.length - 1) : "?";
    const countWord = COUNT_WORD[stemN] ?? String(stemN);
    const setCell = (idx: number, letter: string) => {
      const raw = letter.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 1);
      const next = [...vals];
      next[idx] = raw;
      onChange(JSON.stringify(next));
    };

    return (
      <div
        className="group rounded-xl border border-gray-100 bg-white p-5 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40"
        tabIndex={-1}
      >
        <p className="text-sm italic text-gray-700 mb-2">
          Choose {countWord} answers from the box and write the correct letter,
          A–{endLetter}, next to Questions {firstQuestionNumber}–{last}.
        </p>
        <h3 className="text-base font-bold text-gray-900 mb-4 leading-snug">
          {question.questionText}
        </h3>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="rounded-xl border border-dashed border-gray-300 bg-slate-50/90 p-4 shadow-sm">
            <ul className="space-y-4">
              {stems.map((stem, i) => (
                <li key={i} className="flex items-start gap-3">
                  <p className="min-w-0 flex-1 text-sm leading-relaxed text-gray-900">
                    {stem}
                  </p>
                  <input
                    type="text"
                    maxLength={1}
                    value={vals[i]}
                    placeholder={`${firstQuestionNumber + i}`}
                    aria-label={`Question ${firstQuestionNumber + i}`}
                    onChange={(e) => setCell(i, e.target.value)}
                    className="h-10 w-12 shrink-0 rounded-md border border-dashed border-gray-400 bg-rose-50/90 text-center text-sm font-bold uppercase tracking-wide text-gray-900 shadow-inner outline-none transition focus:border-rose-500 focus:bg-rose-50 focus:ring-2 focus:ring-rose-200/80"
                  />
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 shadow-sm">
            <ul className="space-y-3">
              {pool.map((opt, j) => {
                const L = String.fromCharCode(65 + j);
                return (
                  <li
                    key={j}
                    className="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2.5 text-sm leading-snug text-gray-800"
                  >
                    <span className="font-bold tabular-nums">{L}</span>
                    <span className="text-gray-500">. </span>
                    {opt}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (
    question.type === ListeningQuestionType.MULTIPLE_CHOICE_MULTIPLE &&
    question.options?.length
  ) {
    const kRaw = question.selectCount;
    const k =
      typeof kRaw === "number" && kRaw >= 1 && kRaw <= 20 ? Math.floor(kRaw) : 2;
    const last = firstQuestionNumber + k - 1;
    const selected = new Set(
      parseJsonStringArray(value)
        .map((s) => s.trim().toUpperCase().charAt(0))
        .filter((c) => /^[A-Z]$/.test(c)),
    );
    const optCount = question.options.length;
    const endLetter =
      optCount > 0 ? String.fromCharCode(65 + optCount - 1) : "?";
    const letter = (i: number) => String.fromCharCode(65 + i);
    const rangeAttr =
      k > 1 ? `${firstQuestionNumber}-${last}` : `${firstQuestionNumber}`;
    const countWord = COUNT_WORD[k] ?? String(k);

    return (
      <div
        className="group rounded-xl border border-gray-100 bg-white p-5 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40"
        data-listening-q-range={rangeAttr}
        tabIndex={-1}
      >
        <p className="text-sm italic text-gray-700 mb-2">
          Choose {countWord} letters, A–{endLetter}.
        </p>
        <h3 className="text-base font-bold text-gray-900 mb-4 leading-snug">
          {firstQuestionNumber === last
            ? `${firstQuestionNumber} `
            : `${firstQuestionNumber} – ${last} `}
          {question.questionText}
        </h3>
        <div className="space-y-3 max-w-3xl">
          {question.options.map((opt, i) => {
            const L = letter(i);
            const checked = selected.has(L);
            return (
              <label
                key={i}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition-colors ${
                  checked
                    ? "border-purple-400 bg-purple-50/60"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = new Set(selected);
                    if (e.target.checked) {
                      if (next.size < k) next.add(L);
                    } else {
                      next.delete(L);
                    }
                    onChange(JSON.stringify([...next].sort()));
                  }}
                  className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-2 border-gray-400 text-purple-600 accent-purple-600"
                  aria-label={`Option ${L}`}
                />
                <span className="text-sm leading-relaxed text-gray-900">
                  <span className="font-bold tabular-nums">{L}</span>
                  <span className="text-gray-500">. </span>
                  {opt}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="group">
      <div className="flex items-start gap-3">
        {!ieltsShell && (
          <span className="shrink-0 w-7 h-7 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">
            {index + 1}
          </span>
        )}
        <div className="flex-1">
          <p className="text-gray-800 font-medium mb-3 leading-relaxed">
            {question.questionText}
          </p>

          {question.type === ListeningQuestionType.MULTIPLE_CHOICE &&
            question.options && (
              <div className="space-y-2">
                {question.options.map((option, optionIndex) => (
                  <label
                    key={optionIndex}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      value === option
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-200 hover:border-blue-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${question.id}`}
                      value={option}
                      checked={value === option}
                      onChange={() => onChange(option)}
                      className="accent-blue-600"
                    />
                    <span className="text-gray-700 text-sm">{option}</span>
                  </label>
                ))}
              </div>
            )}

          {(question.type === ListeningQuestionType.FILL_IN_BLANK ||
            question.type === ListeningQuestionType.FORM_COMPLETION ||
            (question.type === ListeningQuestionType.MAP_LABELING &&
              !isListeningMapLabelingQuestion(question))) && (
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Type your answer…"
              className="w-full max-w-md border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder-gray-400"
            />
          )}

          {question.type === ListeningQuestionType.MATCHING &&
            question.options &&
            !isListeningBoxMatchingQuestion(question) && (
              <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
              >
                <option value="">Select match…</option>
                {question.options.map((option, optionIndex) => (
                  <option key={optionIndex} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
        </div>
      </div>
    </div>
  );
};

export default ListeningWorkspace;
