import React, { useMemo } from "react";

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
}) => {
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
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[320px] border-collapse text-sm text-gray-900">
        <thead>
          <tr className="border-b border-gray-300 bg-gray-50">
            <th
              scope="col"
              className="sticky left-0 z-[1] bg-gray-50 px-3 py-2.5 text-left font-bold text-gray-900 border-r border-gray-200 min-w-[10rem] max-w-[28rem]"
            >
              {statementHeader}
            </th>
            {columns.map((col) => (
              <th
                key={col}
                scope="col"
                className="px-2 py-2.5 text-center font-bold text-gray-900 border-r border-gray-200 last:border-r-0 w-10 min-w-[2.25rem]"
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
                className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50/90 transition-colors"
              >
                <td className="sticky left-0 z-[1] bg-white px-3 py-2.5 align-top border-r border-gray-200 leading-snug max-w-[28rem]">
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
                    className="border-r border-gray-100 last:border-r-0 p-1 align-middle text-center"
                  >
                    <label className="flex h-10 w-full cursor-pointer items-center justify-center">
                      <input
                        type="radio"
                        name={`info-match-${questionId}-${ri}`}
                        checked={rowSelectedValue(rowVals[ri], col)}
                        onChange={() => {
                          if (!readOnly) setRow(ri, col);
                        }}
                        disabled={readOnly}
                        className="h-4 w-4 text-primary-600 border-gray-400 focus:ring-primary-500 disabled:opacity-60"
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
  );
};

export default MatchingInformationGrid;
