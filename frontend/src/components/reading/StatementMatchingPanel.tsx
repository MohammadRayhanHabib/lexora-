import React, { useMemo, useState } from "react";

const STATEMENT_MATCH_LETTER_MIME = "application/x-lexora-matching-letter";

export type StatementMatchChoice = {
  letter: string;
  description: string;
};

/** Derive A/B/C letters from word-bank rows (leading "A …" or fallback by index). */
export function parseStatementMatchChoices(
  wordBank: string[] | undefined,
): StatementMatchChoice[] {
  const rows = (wordBank ?? [])
    .map((row) => String(row ?? "").trim())
    .filter(Boolean);
  return rows.map((row, i) => {
    const m = row.match(/^([A-Za-z])\b\s*(?:[–\-:.]\s*)?(.*)$/);
    if (m)
      return {
        letter: m[1].toUpperCase(),
        description: (m[2] ?? "").trim() || row,
      };
    return {
      letter: String.fromCharCode(65 + i),
      description: row,
    };
  });
}

export interface StatementMatchingPanelProps {
  questionId: string;
  statements: string[];
  wordBank: string[];
  answer: string[];
  onChange: (next: string[]) => void;
  firstQuestionNumber: number;
  readOnly?: boolean;
}

const StatementMatchingPanel: React.FC<StatementMatchingPanelProps> = ({
  questionId,
  statements,
  wordBank,
  answer,
  onChange,
  firstQuestionNumber,
  readOnly = false,
}) => {
  const choices = useMemo(() => parseStatementMatchChoices(wordBank), [wordBank]);
  const letters = useMemo(
    () => choices.map((c) => c.letter),
    [choices],
  );
  const [overSlot, setOverSlot] = useState<number | null>(null);

  const getArr = () => {
    const n = statements.length;
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

  const readLetterFromDrag = (e: React.DragEvent) =>
    e.dataTransfer.getData(STATEMENT_MATCH_LETTER_MIME).trim().toUpperCase();

  const startDragLetter = (e: React.DragEvent, letter: string) => {
    e.dataTransfer.setData(STATEMENT_MATCH_LETTER_MIME, letter);
    e.dataTransfer.effectAllowed = "copy";
  };

  const onDropSlot = (e: React.DragEvent, slotIdx: number) => {
    e.preventDefault();
    const letter = readLetterFromDrag(e);
    if (letter) setSlot(slotIdx, letter);
    setOverSlot(null);
  };

  if (!statements.length) {
    return (
      <p className="text-sm text-gray-500 italic">
        No statements configured for this question.
      </p>
    );
  }

  return (
    <div className="space-y-5" data-question-id={questionId}>
      <ul className="list-none space-y-4 pl-0">
        {statements.map((line, i) => {
          const qn = firstQuestionNumber + i;
          const placed = getArr()[i] ?? "";
          const isOver = overSlot === i;
          return (
            <li
              key={i}
              className="flex flex-wrap items-end gap-x-3 gap-y-2 text-sm text-gray-900 leading-relaxed"
            >
              <span className="min-w-0 flex-1">
                <span className="font-semibold tabular-nums">{qn}.</span>{" "}
                {line.trim() || (
                  <span className="text-gray-400 italic">Statement…</span>
                )}
              </span>
              <div
                onDragOver={(e) => {
                  if (readOnly) return;
                  e.preventDefault();
                  setOverSlot(i);
                }}
                onDragLeave={() => setOverSlot(null)}
                onDrop={(e) => onDropSlot(e, i)}
                className={`relative min-h-[48px] min-w-[min(100%,5.5rem)] max-w-[5.5rem] shrink-0 rounded-md border-2 border-dashed px-2 py-2 transition-colors ${
                  placed
                    ? "border-rose-400 bg-rose-50"
                    : isOver
                      ? "border-rose-500 bg-rose-100/80 scale-[1.02]"
                      : "border-rose-300 bg-rose-50/60"
                }`}
              >
                {!placed ? (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums text-rose-900">
                    {qn}
                  </span>
                ) : null}
                {readOnly ? (
                  <div className="text-center text-sm font-semibold text-gray-800">
                    {placed}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-0.5">
                    <input
                      type="text"
                      inputMode="text"
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
                      className="ielts-numbered-answer-input relative z-[1] w-full bg-transparent text-center text-sm font-semibold text-gray-900 focus:outline-none focus:ring-0 uppercase"
                      placeholder=""
                      aria-label={`Question ${qn}, choose ${letters.join(", ")}`}
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
            </li>
          );
        })}
      </ul>

      {choices.length > 0 && !readOnly ? (
        <div className="rounded-lg border border-dashed border-rose-200 bg-rose-50/50 p-3">
          <p className="text-xs font-semibold text-rose-900/90 uppercase tracking-wide mb-2 text-center">
            Drag a letter into each gap
          </p>
          <p className="text-[11px] text-center text-rose-800/90 mb-3">
            You may use the same letter more than once.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {choices.map((c) => (
              <div
                key={c.letter}
                draggable
                onDragStart={(e) => startDragLetter(e, c.letter)}
                className="cursor-grab active:cursor-grabbing select-none rounded-lg border border-rose-200 bg-white px-3 py-2 shadow-sm text-sm text-gray-800 hover:border-rose-400 hover:bg-rose-50/80 transition-colors"
              >
                <span className="font-bold text-rose-900">{c.letter}</span>
                {c.description ? (
                  <span className="text-gray-700"> · {c.description}</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default StatementMatchingPanel;
