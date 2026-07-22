import React, { useState } from "react";

const DIAGRAM_LABEL_WORD_MIME = "application/x-lexora-diagram-label";

export interface DiagramLabelCompletionPanelProps {
  questionId: string;
  /** Title shown above the word box (e.g. “Dung Beetle Types”). */
  bankTitle: string;
  /** One entry per gap; optional hint beside the booklet number (6, 7, 8…). */
  gapHints?: string[];
  wordBank: string[];
  answer: string[];
  onChange: (next: string[]) => void;
  firstQuestionNumber: number;
  readOnly?: boolean;
}

const DiagramLabelCompletionPanel: React.FC<
  DiagramLabelCompletionPanelProps
> = ({
  questionId,
  bankTitle,
  gapHints = [],
  wordBank,
  answer,
  onChange,
  firstQuestionNumber,
  readOnly = false,
}) => {
  const gapCount = Math.max(gapHints.length, answer.length);
  const [overSlot, setOverSlot] = useState<number | null>(null);

  if (gapCount === 0) {
    return (
      <p className="text-sm text-gray-500 italic" data-question-id={questionId}>
        No diagram gaps configured (add gap rows in the editor).
      </p>
    );
  }

  const getArr = (): string[] => {
    const base = Array.from({ length: gapCount }, () => "");
    answer.forEach((v, i) => {
      if (i < gapCount) base[i] = String(v ?? "").trim();
    });
    return base;
  };

  const setSlot = (slotIdx: number, word: string) => {
    if (readOnly) return;
    const w = word.trim();
    const arr = getArr();
    arr[slotIdx] = w;
    onChange(arr);
  };

  const clearSlot = (slotIdx: number) => {
    if (readOnly) return;
    const arr = getArr();
    arr[slotIdx] = "";
    onChange(arr);
  };

  const readIndex = (e: React.DragEvent) => {
    const raw = e.dataTransfer.getData(DIAGRAM_LABEL_WORD_MIME).trim();
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : -1;
  };

  const startDrag = (e: React.DragEvent, bankIndex: number) => {
    e.dataTransfer.setData(DIAGRAM_LABEL_WORD_MIME, String(bankIndex));
    e.dataTransfer.effectAllowed = "copy";
  };

  const onDrop = (e: React.DragEvent, slotIdx: number) => {
    e.preventDefault();
    const idx = readIndex(e);
    const label = (wordBank[idx] ?? "").trim();
    if (idx >= 0 && label) setSlot(slotIdx, label);
    setOverSlot(null);
  };

  const title = bankTitle.trim() || "Word box";

  return (
    <div
      className="flex flex-col gap-6 lg:flex-row lg:items-start"
      data-question-id={questionId}
    >
      {/* Word bank */}
      {wordBank.some((w) => String(w ?? "").trim()) ? (
        <div className="min-w-0 flex-1">
          <div className="rounded-xl border-2 border-dashed border-rose-200 bg-rose-50/60 p-4">
            <p className="mb-3 text-center text-sm font-bold text-gray-900">
              {title}
            </p>
            {!readOnly ? (
              <p className="mb-3 text-center text-[11px] text-rose-800/90">
                Drag a label into a numbered answer box. You can also type in the
                boxes.
              </p>
            ) : null}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {wordBank.map((raw, i) => {
                const label = String(raw ?? "").trim();
                if (!label) return null;
                return (
                  <div
                    key={i}
                    draggable={!readOnly}
                    onDragStart={
                      readOnly ? undefined : (e) => startDrag(e, i)
                    }
                    className={`rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 shadow-sm ${
                      readOnly
                        ? ""
                        : "cursor-grab active:cursor-grabbing hover:border-rose-300 hover:bg-rose-50/50"
                    } transition-colors`}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* Booklet numbers + answer boxes (e.g. 6, 7, 8) */}
      <div className="w-full shrink-0 space-y-3 lg:max-w-md">
        {Array.from({ length: gapCount }, (_, i) => {
          const qn = firstQuestionNumber + i;
          const placed = getArr()[i] ?? "";
          const hint = (gapHints[i] ?? "").trim();
          const isOver = overSlot === i;
          return (
            <div
              key={i}
              className="flex flex-wrap items-start gap-3 rounded-lg border border-gray-100 bg-white/80 p-2"
            >
              <div className="flex w-12 shrink-0 flex-col items-end gap-0.5 pt-2 text-right sm:w-14">
                <span className="text-lg font-bold tabular-nums leading-none text-gray-900">
                  {qn}
                </span>
                {hint ? (
                  <span className="max-w-[5.5rem] text-[10px] leading-snug text-gray-500">
                    {hint}
                  </span>
                ) : null}
              </div>
              <div
                onDragOver={(e) => {
                  if (readOnly) return;
                  e.preventDefault();
                  setOverSlot(i);
                }}
                onDragLeave={() => setOverSlot(null)}
                onDrop={(e) => onDrop(e, i)}
                className={`relative min-h-[52px] min-w-0 flex-1 rounded-md border-2 px-2 pb-1.5 pt-6 transition-colors focus-within:border-indigo-500 focus-within:border-solid focus-within:ring-2 focus-within:ring-indigo-200/80 ${
                  placed
                    ? "border-rose-400 bg-rose-50"
                    : isOver
                      ? "scale-[1.01] border-rose-500 bg-rose-100/80"
                      : "border-dashed border-rose-300 bg-rose-50/60"
                }`}
              >
                <span className="pointer-events-none absolute left-1/2 top-0.5 -translate-x-1/2 text-[11px] font-bold tabular-nums text-rose-900">
                  {qn}
                </span>
                {readOnly ? (
                  <div className="text-center text-sm font-semibold text-gray-800">
                    {placed || "—"}
                  </div>
                ) : (
                  <div className="flex flex-col items-stretch gap-0.5">
                    <input
                      type="text"
                      value={placed}
                      onChange={(e) => setSlot(i, e.target.value)}
                      className="w-full bg-transparent text-center text-sm font-semibold text-gray-900 placeholder:text-rose-400/60 focus:outline-none"
                      placeholder="Answer"
                      aria-label={`Question ${qn}`}
                      autoComplete="off"
                    />
                    {placed ? (
                      <button
                        type="button"
                        onClick={() => clearSlot(i)}
                        className="text-center text-[10px] text-rose-700 underline hover:text-rose-900"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DiagramLabelCompletionPanel;
