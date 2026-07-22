import React, { useMemo, useState } from "react";
import { parseStatementMatchChoices } from "./StatementMatchingPanel";

const LIST_MATCH_LETTER_MIME = "application/x-lexora-matching-letter";

export interface ListMatchingPanelProps {
  questionId: string;
  /** Right-hand text for each row (e.g. purpose to match). */
  purposes: string[];
  wordBank: string[];
  /** Shown above the bank (e.g. "List of Timber Cuts"). */
  bankTitle: string;
  answer: string[];
  onChange: (next: string[]) => void;
  firstQuestionNumber: number;
  readOnly?: boolean;
  /** IELTS classification: slightly different dashed border tone. */
  visualVariant?: "list" | "classification";
}

const ListMatchingPanel: React.FC<ListMatchingPanelProps> = ({
  questionId,
  purposes,
  wordBank,
  bankTitle,
  answer,
  onChange,
  firstQuestionNumber,
  readOnly = false,
  visualVariant = "list",
}) => {
  const choices = useMemo(() => parseStatementMatchChoices(wordBank), [wordBank]);
  const letters = useMemo(() => choices.map((c) => c.letter), [choices]);
  const [overSlot, setOverSlot] = useState<number | null>(null);

  const getArr = () => {
    const n = purposes.length;
    const base = Array.from({ length: n }, () => "");
    answer.forEach((v, i) => {
      if (i < n) base[i] = String(v ?? "").trim().toUpperCase();
    });
    return base;
  };

  const setSlot = (slotIdx: number, letter: string) => {
    if (readOnly) return;
    const u = letter.trim().toUpperCase();
    if (!u || !letters.includes(u)) return;
    const arr = getArr();
    arr[slotIdx] = u;
    onChange(arr);
  };

  const clearSlot = (slotIdx: number) => {
    if (readOnly) return;
    const arr = getArr();
    arr[slotIdx] = "";
    onChange(arr);
  };

  const readLetter = (e: React.DragEvent) =>
    e.dataTransfer.getData(LIST_MATCH_LETTER_MIME).trim().toUpperCase();

  const startDrag = (e: React.DragEvent, letter: string) => {
    e.dataTransfer.setData(LIST_MATCH_LETTER_MIME, letter);
    e.dataTransfer.effectAllowed = "copy";
  };

  const onDrop = (e: React.DragEvent, slotIdx: number) => {
    e.preventDefault();
    const letter = readLetter(e);
    if (letter) setSlot(slotIdx, letter);
    setOverSlot(null);
  };

  if (!purposes.length) {
    return (
      <p className="text-sm text-gray-500 italic">
        No purposes configured for this question.
      </p>
    );
  }

  const title =
    bankTitle.trim() ||
    (visualVariant === "classification" ? "Categories" : "List of options");

  const dashBorder = (placed: boolean, isOver: boolean) => {
    if (visualVariant === "classification") {
      if (placed) return "border-[#c47676] bg-[#fceaea]";
      if (isOver) return "border-[#D98E8E] bg-rose-100/80 scale-[1.02]";
      return "border-[#D98E8E] bg-[#FCE4E4]/90";
    }
    if (placed) return "border-rose-400 bg-rose-50";
    if (isOver) return "border-rose-500 bg-rose-100/80 scale-[1.02]";
    return "border-rose-300 bg-rose-50/60";
  };

  const qnColor =
    visualVariant === "classification"
      ? "text-rose-800/90"
      : "text-rose-900";

  return (
    <div className="space-y-6" data-question-id={questionId}>
      <ul className="list-none space-y-4 pl-0">
        {purposes.map((purpose, i) => {
          const qn = firstQuestionNumber + i;
          const placed = getArr()[i] ?? "";
          const isOver = overSlot === i;
          return (
            <li
              key={i}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-900"
            >
              <div
                onDragOver={(e) => {
                  if (readOnly) return;
                  e.preventDefault();
                  setOverSlot(i);
                }}
                onDragLeave={() => setOverSlot(null)}
                onDrop={(e) => onDrop(e, i)}
                className={`relative order-1 min-h-[48px] w-[4.5rem] shrink-0 rounded-md border-2 border-dashed px-1.5 pb-1 pt-5 transition-colors ${dashBorder(
                  Boolean(placed),
                  isOver,
                )}`}
              >
                <span
                  className={`pointer-events-none absolute left-1/2 top-0.5 -translate-x-1/2 text-[11px] font-bold tabular-nums ${qnColor}`}
                >
                  {qn}
                </span>
                {readOnly ? (
                  <div className="text-center text-sm font-semibold text-gray-800">
                    {placed || "—"}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-0.5">
                    <input
                      type="text"
                      maxLength={2}
                      value={placed}
                      onChange={(e) => {
                        const raw = e.target.value.trim().toUpperCase();
                        if (!raw) {
                          clearSlot(i);
                          return;
                        }
                        const ch = raw.slice(-1);
                        if (letters.includes(ch)) setSlot(i, ch);
                      }}
                      className="w-full bg-transparent text-center text-sm font-semibold text-gray-900 placeholder:text-rose-400/60 focus:outline-none uppercase"
                      placeholder="·"
                      aria-label={`Question ${qn}`}
                      autoComplete="off"
                    />
                    {placed ? (
                      <button
                        type="button"
                        onClick={() => clearSlot(i)}
                        className="text-[10px] text-rose-700 underline hover:text-rose-900"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
              <span className="order-2 min-w-0 flex-1 leading-relaxed text-gray-800">
                {purpose.trim() || (
                  <span className="text-gray-400 italic">
                    {visualVariant === "classification"
                      ? "Item to classify…"
                      : "Purpose…"}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {choices.length > 0 ? (
        <div className="rounded-xl border-2 border-dashed border-rose-200 bg-rose-50/60 p-4">
          <p className="text-center text-sm font-bold text-gray-900 mb-3">
            {title}
          </p>
          {!readOnly ? (
            <p className="text-[11px] text-center text-rose-800/90 mb-3">
              {visualVariant === "classification"
                ? "Drag A, B, or C into each numbered box (letters can be reused)."
                : "Drag a letter into a numbered box. You may use any letter more than once."}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            {choices.map((c) => (
              <div
                key={c.letter}
                draggable={!readOnly}
                onDragStart={
                  readOnly ? undefined : (e) => startDrag(e, c.letter)
                }
                className={`min-w-[min(100%,14rem)] rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm text-sm text-gray-800 transition-colors ${
                  readOnly
                    ? "opacity-90"
                    : "cursor-grab active:cursor-grabbing hover:border-rose-300 hover:bg-rose-50/50"
                }`}
              >
                <span className="font-bold text-rose-900">{c.letter}</span>
                {c.description ? (
                  <span className="text-gray-700"> {c.description}</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ListMatchingPanel;
