import React, { useMemo, useState } from "react";
import { FiBookmark } from "react-icons/fi";

const SENTENCE_ENDING_MIME = "application/x-lexora-sentence-ending";
const SENTENCE_ENDING_SOURCE_MIME =
  "application/x-lexora-sentence-ending-source";

export interface SentenceEndingMatchingPanelProps {
  questionId: string;
  stems: string[];
  endings: string[];
  answer: string[];
  onChange: (next: string[]) => void;
  firstQuestionNumber: number;
  readOnly?: boolean;
  visualVariant?: "default" | "reference";
  showBookmark?: boolean;
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
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
  visualVariant = "default",
  showBookmark = false,
  bookmarked = false,
  onToggleBookmark,
}) => {
  const referenceVariant = visualVariant === "reference";
  const letters = useMemo(
    () => endings.map((_, index) => String.fromCharCode(65 + index)),
    [endings],
  );
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [overSlot, setOverSlot] = useState<number | null>(null);
  const [overBank, setOverBank] = useState(false);

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
    <div
      className={`relative ${referenceVariant ? "space-y-0 pr-10" : "space-y-6"}`}
      data-question-id={questionId}
    >
      <div className={referenceVariant ? "space-y-9" : "space-y-4"}>
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
              className={`flex flex-wrap items-center ${
                referenceVariant ? "gap-4" : "gap-3"
              }`}
            >
              <p
                className={
                  referenceVariant
                    ? "text-base leading-relaxed text-gray-900"
                    : "min-w-[min(100%,280px)] flex-1 text-sm leading-relaxed text-gray-900"
                }
              >
                {!referenceVariant && (
                  <span className="mr-2 font-bold tabular-nums">
                    {questionNumber}
                  </span>
                )}
                {stem.trim() || (
                  <span className="italic text-gray-400">
                    Incomplete sentence
                  </span>
                )}
              </p>
              <div
                role={readOnly ? undefined : "button"}
                tabIndex={readOnly ? undefined : 0}
                draggable={!readOnly && Boolean(placedLetter)}
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
                onDragStart={(event) => {
                  if (readOnly || !placedLetter) return;
                  event.dataTransfer.setData(
                    SENTENCE_ENDING_MIME,
                    placedLetter,
                  );
                  event.dataTransfer.setData(
                    SENTENCE_ENDING_SOURCE_MIME,
                    String(index),
                  );
                  event.dataTransfer.effectAllowed = "move";
                  setSelectedLetter(placedLetter);
                }}
                onDragEnd={() => {
                  setSelectedLetter(null);
                  setOverSlot(null);
                  setOverBank(false);
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
                className={`group relative flex items-center justify-center transition-colors ${
                  referenceVariant
                    ? placedLetter
                      ? "min-h-9 w-fit max-w-full cursor-grab border border-solid border-gray-600 bg-white px-5 py-1.5 text-left active:cursor-grabbing"
                      : "h-9 w-40 border border-dashed border-gray-600 px-3 py-1"
                    : "min-h-[48px] w-full max-w-[260px] rounded-sm border-2 border-dashed px-3 py-2"
                } ${
                  placedLetter
                    ? referenceVariant
                      ? "border-gray-600 bg-white"
                      : "border-sky-500 bg-sky-50"
                    : isOver
                      ? "border-sky-600 bg-sky-100"
                      : "border-gray-400 bg-white hover:border-sky-500"
                }`}
              >
                {placedLetter ? (
                  <div
                    className={`flex w-full items-start ${
                      referenceVariant ? "gap-0" : "gap-2"
                    }`}
                  >
                    <span
                      className={`shrink-0 ${
                        referenceVariant
                          ? "mr-1 text-gray-900"
                          : "font-bold text-sky-800"
                      }`}
                    >
                      {placedLetter}
                      {referenceVariant ? "." : ""}
                    </span>
                    <span
                      className={`min-w-0 flex-1 text-gray-900 ${
                        referenceVariant
                          ? "text-base"
                          : "text-sm leading-snug"
                      }`}
                    >
                     {placedEnding}
                   </span>
                    {!readOnly && !referenceVariant && (
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
                  <span className="pointer-events-none text-sm font-bold tabular-nums text-gray-700">
                    {questionNumber}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div
        onDragOver={(event) => {
          if (readOnly) return;
          if (
            !Array.from(event.dataTransfer.types).includes(
              SENTENCE_ENDING_SOURCE_MIME,
            )
          )
            return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setOverBank(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setOverBank(false);
          }
        }}
        onDrop={(event) => {
          if (readOnly) return;
          event.preventDefault();
          const sourceSlot = Number.parseInt(
            event.dataTransfer.getData(SENTENCE_ENDING_SOURCE_MIME),
            10,
          );
          if (
            Number.isInteger(sourceSlot) &&
            sourceSlot >= 0 &&
            sourceSlot < stems.length
          ) {
            clearSlot(sourceSlot);
          }
          setSelectedLetter(null);
          setOverBank(false);
        }}
        className={`${
          referenceVariant
            ? "min-h-[220px] pl-4 pt-16"
            : "rounded-sm bg-gray-100 p-3"
        } transition-colors ${overBank ? "bg-sky-50" : ""}`}
      >
        {!referenceVariant && (
          <p className="mb-3 text-sm font-bold text-gray-950">
            List of sentence endings
          </p>
        )}
        <div className="space-y-2">
          {endings.map((ending, index) => {
            const letter = letters[index];
            const used = usedLetters.has(letter);
            const selected = selectedLetter === letter;
            if (!ending.trim()) return null;
            if (referenceVariant && used) return null;

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
                className={`flex items-start border text-left transition-colors ${
                  referenceVariant
                    ? "w-fit max-w-full rounded-none px-5 py-1.5 text-base"
                    : "w-full gap-3 rounded-sm px-3 py-2 text-sm"
                } ${
                  used
                    ? "cursor-default border-gray-200 bg-gray-200 text-gray-400"
                    : selected
                      ? "border-sky-600 bg-sky-50 text-gray-950"
                      : referenceVariant
                        ? "cursor-grab border-gray-600 bg-white text-gray-900 hover:border-gray-800 active:cursor-grabbing"
                        : "cursor-grab border-gray-300 bg-white text-gray-900 hover:border-gray-500 active:cursor-grabbing"
                }`}
              >
                <span className={referenceVariant ? "mr-1" : "font-bold"}>
                  {letter}{referenceVariant ? "." : ""}
                </span>
                <span>{ending}</span>
              </button>
            );
          })}
        </div>
      </div>
      {referenceVariant && showBookmark && (
        <button
          type="button"
          onClick={onToggleBookmark}
          aria-label={bookmarked ? "Remove bookmark" : "Bookmark question"}
          className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center text-gray-700 hover:text-gray-950"
        >
          <FiBookmark className={`h-6 w-6 ${bookmarked ? "fill-current" : ""}`} />
        </button>
      )}
    </div>
  );
};

export default SentenceEndingMatchingPanel;
