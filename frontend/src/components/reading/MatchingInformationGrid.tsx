import React, { useMemo } from "react";
import { FiBookmark } from "react-icons/fi";

const DEFAULT_COLUMN_COUNT = 7;

export interface MatchingInformationGridProps {
  /** Stable id for radio `name` groups */
  questionId: string;
  statements: string[];
  /** Column headers (e.g. A–G). If empty, defaults to A–G. */
  columnLabels: string[];
  answer: string[];
  onChange: (next: string[]) => void;
  /** First question number shown beside row 1 (e.g. 14). */
  firstQuestionNumber: number;
  /** Left column header (e.g. “Column 1”). */
  statementHeader?: string;
  /** When true, radios are disabled (e.g. admin preview). */
  readOnly?: boolean;
  visualVariant?: "default" | "reference";
  showBookmark?: boolean;
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
}

function normalizeColumns(labels: string[]): string[] {
  const trimmed = (labels ?? []).map((s) => String(s ?? "").trim()).filter(Boolean);
  if (trimmed.length > 0) return trimmed;
  return Array.from({ length: DEFAULT_COLUMN_COUNT }, (_, i) =>
    String.fromCharCode(65 + i),
  );
}

function rowSelectedValue(rowVal: string, col: string): boolean {
  const a = String(rowVal ?? "").trim();
  if (!a) return false;
  return a.toUpperCase() === String(col).trim().toUpperCase();
}

const MatchingInformationGrid: React.FC<MatchingInformationGridProps> = ({
  questionId,
  statements,
  columnLabels,
  answer,
  onChange,
  firstQuestionNumber,
  statementHeader = "Column 1",
  readOnly = false,
  visualVariant = "default",
  showBookmark = false,
  bookmarked = false,
  onToggleBookmark,
}) => {
  const referenceVariant = visualVariant === "reference";
  const columns = useMemo(
    () => normalizeColumns(columnLabels),
    [columnLabels],
  );

  const getArr = () => {
    const n = statements.length;
    const base = Array.from({ length: n }, () => "");
    answer.forEach((v, i) => {
      if (i < n) base[i] = String(v ?? "").trim();
    });
    return base;
  };

  const setRow = (rowIdx: number, letter: string) => {
    const arr = getArr();
    arr[rowIdx] = letter;
    onChange(arr);
  };

  if (!statements.length) {
    return (
      <p className="text-sm text-gray-500 italic">
        No statements configured for this question.
      </p>
    );
  }

  return (
    <div className={referenceVariant ? "relative pr-10" : ""}>
      <div
        className={
          referenceVariant
            ? "overflow-x-auto border border-gray-300 bg-white"
            : "overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm"
        }
      >
      <table
        className={`w-full border-collapse text-gray-900 ${
          referenceVariant ? "min-w-[700px] text-base" : "min-w-[320px] text-sm"
        }`}
      >
        <thead>
          <tr
            className={
              referenceVariant
                ? "border-b border-gray-300 bg-white"
                : "border-b border-gray-300 bg-gray-50"
            }
          >
            <th
              scope="col"
              className={
                referenceVariant
                  ? "sticky left-0 z-[1] min-w-[28rem] border-r border-gray-300 bg-white px-5 py-3 text-center font-bold text-gray-900"
                  : "sticky left-0 z-[1] min-w-[10rem] max-w-[28rem] border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-left font-bold text-gray-900"
              }
            >
              {statementHeader}
            </th>
            {columns.map((col) => (
              <th
                key={col}
                scope="col"
                className={
                  referenceVariant
                    ? "w-10 min-w-8 border-r border-gray-300 px-2 py-3 text-center font-bold text-gray-900 last:border-r-0"
                    : "w-10 min-w-[2.25rem] border-r border-gray-200 px-2 py-2.5 text-center font-bold text-gray-900 last:border-r-0"
                }
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {statements.map((stmt, ri) => {
            const rowVals = getArr();
            const qn = firstQuestionNumber + ri;
            return (
              <tr
                key={ri}
                className={`border-b last:border-b-0 transition-colors ${
                  referenceVariant
                    ? "border-gray-300"
                    : "border-gray-200 hover:bg-gray-50/90"
                }`}
              >
                <td
                  className={
                    referenceVariant
                      ? "sticky left-0 z-[1] max-w-[34rem] border-r border-gray-300 bg-white px-5 py-5 align-middle leading-snug"
                      : "sticky left-0 z-[1] max-w-[28rem] border-r border-gray-200 bg-white px-3 py-2.5 align-top leading-snug"
                  }
                >
                  <span className="font-semibold tabular-nums text-gray-900">
                    {qn}.
                  </span>{" "}
                  <span className="text-gray-800">
                    {stmt.trim() || (
                      <span className="text-gray-400 italic">Statement…</span>
                    )}
                  </span>
                </td>
                {columns.map((col) => (
                  <td
                    key={`${ri}-${col}`}
                    className={
                      referenceVariant
                        ? "border-r border-gray-300 p-0 align-middle text-center last:border-r-0"
                        : "border-r border-gray-100 p-1 align-middle text-center last:border-r-0"
                    }
                  >
                    <label
                      className={`flex w-full cursor-pointer items-center justify-center ${
                        referenceVariant ? "min-h-16" : "h-10"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`info-match-${questionId}-${ri}`}
                        checked={rowSelectedValue(rowVals[ri], col)}
                        onChange={() => {
                          if (!readOnly) setRow(ri, col);
                        }}
                        disabled={readOnly}
                        className={`text-primary-600 border-gray-400 focus:ring-primary-500 disabled:opacity-60 ${
                          referenceVariant ? "h-[15px] w-[15px]" : "h-4 w-4"
                        }`}
                        aria-label={`Question ${qn}: paragraph ${col}`}
                      />
                    </label>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      {referenceVariant && showBookmark && (
        <button
          type="button"
          onClick={onToggleBookmark}
          aria-label={bookmarked ? "Remove bookmark" : "Bookmark question"}
          className="absolute right-0 top-[4.75rem] flex h-8 w-8 items-center justify-center text-gray-700 hover:text-gray-950"
        >
          <FiBookmark className={`h-6 w-6 ${bookmarked ? "fill-current" : ""}`} />
        </button>
      )}
    </div>
  );
};

export default MatchingInformationGrid;
