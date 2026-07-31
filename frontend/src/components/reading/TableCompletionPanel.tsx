import React from "react";
import {
  FLOWCHART_GAP_TOKEN,
  parseTableOptions,
  countTableGapTokens,
  tableGapIndexBefore,
} from "../../api/reading";

export interface TableCompletionPanelProps {
  title: string;
  /** First IELTS-style question number for gap 1 (e.g. 27). */
  firstQuestionNumber: number;
  options: string[];
  hints: string[];
  answer: string[];
  onChange: (next: string[]) => void;
  /** Listening / exam UI: bold centred column titles */
  centerTableHeaders?: boolean;
}

const TableCompletionPanel: React.FC<TableCompletionPanelProps> = ({
  title,
  firstQuestionNumber,
  options,
  hints,
  answer,
  onChange,
  centerTableHeaders = false,
}) => {
  const parsed = parseTableOptions(options);
  const gapCount = countTableGapTokens(options);
  const vals = Array.from({ length: gapCount }, (_, i) =>
    String(answer[i] ?? ""),
  );
  const setVal = (g: number, v: string) => {
    const next = [...vals];
    next[g] = v;
    onChange(next);
  };

  if (!parsed || !parsed.bodyRows.length) return null;

  const { headers, bodyRows } = parsed;
  const colCount = Math.max(
    headers.length,
    ...bodyRows.map((r) => r.length),
    1,
  );
  const paddedHeaders = [...headers];
  while (paddedHeaders.length < colCount) paddedHeaders.push("");
  const paddedBody = bodyRows.map((row) => {
    const x = [...row];
    while (x.length < colCount) x.push("");
    return x;
  });

  const lastQ = firstQuestionNumber + gapCount - 1;

  return (
    <div className="space-y-3">
      {title.trim() ? (
        <h3 className="text-center text-base font-bold text-gray-900">
          {title.trim()}
        </h3>
      ) : null}
      {gapCount > 0 ? (
        <p className="text-center text-sm font-semibold text-gray-800">
          Questions {firstQuestionNumber}
          {gapCount > 1 ? ` – ${lastQ}` : ""}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border-2 border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[280px] border-collapse text-sm text-gray-900">
          <thead>
            <tr className="border-b-2 border-gray-300 bg-gray-50/90">
              {paddedHeaders.map((h, i) => (
                <th
                  key={i}
                  scope="col"
                  className={`px-3 py-2.5 font-bold text-gray-900 border-r border-gray-200 last:border-r-0 align-bottom ${
                    centerTableHeaders ? "text-center" : "text-left"
                  }`}
                >
                  {h || `\u00A0`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paddedBody.map((cells, ri) => (
              <tr
                key={ri}
                className="border-b border-gray-200 last:border-b-0 bg-white"
              >
                {cells.map((_, ci) => {
                  const rawCell = bodyRows[ri]?.[ci] ?? "";
                  const parts = rawCell.split(FLOWCHART_GAP_TOKEN);
                  return (
                    <td
                      key={ci}
                      className="px-3 py-2.5 align-top border-r border-gray-100 last:border-r-0"
                    >
                      <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5 leading-relaxed">
                        {parts.map((part, pi) => {
                          const gapIndex = tableGapIndexBefore(
                            bodyRows,
                            ri,
                            ci,
                            pi,
                          );
                          const questionNumber =
                            firstQuestionNumber + gapIndex;
                          const gapValue = vals[gapIndex] ?? "";

                          return (
                            <React.Fragment key={`${ri}-${ci}-${pi}`}>
                              {part ? (
                                <span className="whitespace-pre-wrap">
                                  {part}
                                </span>
                              ) : null}
                              {pi < parts.length - 1 ? (
                                <span className="relative inline-flex min-h-[2.25rem] min-w-0 max-w-full flex-1 items-stretch rounded-md border-2 border-dashed border-rose-300 bg-rose-50/70">
                                  {!gapValue.trim() ? (
                                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums text-gray-900">
                                      {questionNumber}
                                    </span>
                                  ) : null}
                                  <input
                                    type="text"
                                    value={gapValue}
                                    onChange={(e) =>
                                      setVal(gapIndex, e.target.value)
                                    }
                                    aria-label={`Question ${questionNumber}`}
                                    className="ielts-numbered-answer-input relative z-[1] min-w-0 flex-1 bg-transparent px-2 py-1.5 text-center text-sm text-gray-900 focus:outline-none focus:ring-0"
                                    placeholder=""
                                    autoComplete="off"
                                  />
                                </span>
                              ) : null}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
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

export default TableCompletionPanel;
