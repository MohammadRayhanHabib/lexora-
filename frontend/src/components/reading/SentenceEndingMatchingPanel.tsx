import React, { useMemo, useState } from "react";

const SENTENCE_ENDING_MIME = "application/x-lexora-sentence-ending";

export interface SentenceEndingMatchingPanelProps {
  questionId: string;
  stems: string[];
  endings: string[];
  answer: string[];
  onChange: (next: string[]) => void;
  firstQuestionNumber: number;
  readOnly?: boolean;
}

const SentenceEndingMatchingPanel: React.FC<
  SentenceEndingMatchingPanelProps
> = ({
  questionId,
  stems,
  endings,
  answer,
  onChange,
  firstQuestionNumber,
  readOnly = false,
}) => {
  const letters = useMemo(
    () => endings.map((_, index) => String.fromCharCode(65 + index)),
    [endings],
  );
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [overSlot, setOverSlot] = useState<number | null>(null);

  const normalizedAnswer = Array.from({ length: stems.length }, (_, index) =>
    String(answer[index] ?? "").trim().toUpperCase(),
  );
  const usedLetters = new Set(normalizedAnswer.filter(Boolean));

  const placeEnding = (slotIndex: number, letter: string) => {
    if (readOnly) return;
    const normalizedLetter = letter.trim().toUpperCase();
    if (!letters.includes(normalizedLetter)) return;

    const next = [...normalizedAnswer];
    const previousSlot = next.indexOf(normalizedLetter);
    if (previousSlot >= 0) next[previousSlot] = "";
    next[slotIndex] = normalizedLetter;
    onChange(next);
    setSelectedLetter(null);
  };

  const clearSlot = (slotIndex: number) => {
    if (readOnly) return;
    const next = [...normalizedAnswer];
    next[slotIndex] = "";
    onChange(next);
  };

  if (!stems.length) {
    return (
      <p className="text-sm italic text-gray-500">
        No sentence stems configured for this question.
      </p>
    );
  }

  return (
    <div className="space-y-6" data-question-id={questionId}>
      <div className="space-y-4">
        {stems.map((stem, index) => {
          const questionNumber = firstQuestionNumber + index;
          const placedLetter = normalizedAnswer[index] ?? "";
          const placedEnding = placedLetter
            ? endings[placedLetter.charCodeAt(0) - 65] ?? ""
            : "";
          const isOver = overSlot === index;

          return (
            <div
              key={`${questionId}-stem-${index}`}
              className="flex flex-wrap items-center gap-3"
            >
              <p className="min-w-[min(100%,280px)] flex-1 text-sm leading-relaxed text-gray-900">
                <span className="mr-2 font-bold tabular-nums">
                  {questionNumber}
                </span>
                {stem.trim() || (
                  <span className="italic text-gray-400">
                    Incomplete sentence
                  </span>
                )}
              </p>
              <div
                role={readOnly ? undefined : "button"}
                tabIndex={readOnly ? undefined : 0}
                aria-label={
                  readOnly
                    ? undefined
                    : `Question ${questionNumber}. ${
                        placedLetter
                          ? `Selected ending ${placedLetter}`
                          : "Choose a sentence ending"
                      }`
                }
                onDragOver={(event) => {
                  if (readOnly) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setOverSlot(index);
                }}
                onDragLeave={() => setOverSlot(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  placeEnding(
                    index,
                    event.dataTransfer.getData(SENTENCE_ENDING_MIME),
                  );
                  setOverSlot(null);
                }}
                onClick={() => {
                  if (selectedLetter) placeEnding(index, selectedLetter);
                  else if (placedLetter && !readOnly)
                    setSelectedLetter(placedLetter);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    if (selectedLetter) placeEnding(index, selectedLetter);
                    else if (placedLetter && !readOnly)
                      setSelectedLetter(placedLetter);
                  }
                }}
                className={`group relative min-h-[48px] w-full max-w-[260px] rounded-sm border-2 border-dashed px-3 pb-2 pt-5 transition-colors ${
                  placedLetter
                    ? "border-sky-500 bg-sky-50"
                    : isOver
                      ? "border-sky-600 bg-sky-100"
                      : "border-gray-400 bg-white hover:border-sky-500"
                }`}
              >
                <span className="pointer-events-none absolute left-2 top-1 text-[11px] font-bold tabular-nums text-gray-700">
                  {questionNumber}
                </span>
                {placedLetter ? (
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 font-bold text-sky-800">
                      {placedLetter}
                    </span>
                    <span className="min-w-0 flex-1 text-sm leading-snug text-gray-900">
                      {placedEnding}
                    </span>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          clearSlot(index);
                        }}
                        aria-label={`Clear answer for question ${questionNumber}`}
                        className="text-gray-400 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100 group-focus-within:opacity-100"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="block text-center text-xs text-gray-500">
                    {readOnly ? "No answer" : "Drop or select an ending"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-sm bg-gray-100 p-3">
        <p className="mb-3 text-sm font-bold text-gray-950">
          List of sentence endings
        </p>
        <div className="space-y-2">
          {endings.map((ending, index) => {
            const letter = letters[index];
            const used = usedLetters.has(letter);
            const selected = selectedLetter === letter;
            if (!ending.trim()) return null;

            return (
              <button
                key={`${questionId}-ending-${letter}`}
                type="button"
                draggable={!readOnly && !used}
                disabled={readOnly || used}
                onDragStart={(event) => {
                  event.dataTransfer.setData(SENTENCE_ENDING_MIME, letter);
                  event.dataTransfer.effectAllowed = "move";
                  setSelectedLetter(letter);
                }}
                onDragEnd={() => setSelectedLetter(null)}
                onClick={() =>
                  setSelectedLetter((current) =>
                    current === letter ? null : letter,
                  )
                }
                className={`flex w-full items-start gap-3 rounded-sm border px-3 py-2 text-left text-sm transition-colors ${
                  used
                    ? "cursor-default border-gray-200 bg-gray-200 text-gray-400"
                    : selected
                      ? "border-sky-600 bg-sky-50 text-gray-950"
                      : "cursor-grab border-gray-300 bg-white text-gray-900 hover:border-gray-500 active:cursor-grabbing"
                }`}
              >
                <span className="font-bold">{letter}</span>
                <span>{ending}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SentenceEndingMatchingPanel;
