import React from "react";
import {
  FLOWCHART_GAP_TOKEN,
  countNoteCompletionGaps,
} from "../../api/reading";

export interface NoteCompletionGapsProps {
  lines: string[];
  answer: string[];
  onChange: (next: string[]) => void;
  /** First displayed question number for this block (gap labels). */
  firstQuestionNumber: number;
  readOnly?: boolean;
  /** Show bullet before each line (note style). */
  showBullet?: boolean;
  /** Placeholder when a line is empty (admin). */
  emptyLinePlaceholder?: string;
  /** Extra classes for line text (e.g. exam font size). */
  lineTextClassName?: string;
  /** Note bullets + rose boxes vs summary paragraph + IELTS-style pink boxes */
  appearance?: "note" | "summary";
}

const NoteCompletionGaps: React.FC<NoteCompletionGapsProps> = ({
  lines,
  answer,
  onChange,
  firstQuestionNumber,
  readOnly = false,
  showBullet = true,
  emptyLinePlaceholder = "Note line…",
  lineTextClassName = "",
  appearance = "note",
}) => {
  const n = countNoteCompletionGaps(lines);
  const vals = Array.from({ length: Math.max(0, n) }, (_, i) =>
    Array.isArray(answer) ? String(answer[i] ?? "") : "",
  );

  const setVal = (globalIdx: number, v: string) => {
    if (readOnly) return;
    const next = [...vals];
    next[globalIdx] = v;
    onChange(next);
  };

  const isSummary = appearance === "summary";
  const gapBoxClassSuffix = isSummary
    ? "flex shrink-0 min-h-[42px] min-w-[min(100%,210px)] max-w-[280px] items-stretch overflow-hidden rounded-sm border border-dashed border-[#C0504D] bg-[#FCE4E4] shadow-sm"
    : "flex shrink-0 min-h-[44px] min-w-[min(100%,220px)] max-w-[300px] items-stretch overflow-hidden rounded-md border-2 border-dashed border-rose-300 bg-rose-50/60 shadow-sm";
  const gapBoxClassInline = isSummary
    ? "inline-flex min-h-[36px] min-w-[9rem] max-w-[13rem] items-stretch overflow-hidden align-baseline rounded-sm border border-dashed border-[#C0504D] bg-[#FCE4E4] shadow-sm"
    : "inline-flex min-h-[40px] min-w-[10rem] max-w-[14rem] items-stretch overflow-hidden align-baseline rounded-md border-2 border-dashed border-rose-300 bg-rose-50/60 shadow-sm";
  const qnClass = isSummary
    ? "pointer-events-none flex min-w-9 shrink-0 items-center justify-center border-r border-[#C0504D]/40 bg-white/65 px-2 text-xs font-bold tabular-nums text-gray-900"
    : "pointer-events-none flex min-w-10 shrink-0 items-center justify-center border-r border-rose-300 bg-white/70 px-2 text-xs font-bold tabular-nums text-rose-900";

  const renderGap = (globalIdx: number, variant: "suffix" | "inline") => {
    const qn = firstQuestionNumber + globalIdx;
    const boxClass = variant === "suffix" ? gapBoxClassSuffix : gapBoxClassInline;
    return (
      <div key={`g-${globalIdx}`} className={boxClass}>
        <span className={qnClass} aria-hidden>
          {qn}
        </span>
        <input
          type="text"
          value={vals[globalIdx]}
          onChange={(e) => setVal(globalIdx, e.target.value)}
          readOnly={readOnly}
          disabled={readOnly}
          aria-label={`Gap ${qn}`}
          className="min-w-0 flex-1 bg-transparent px-2.5 py-2 text-center text-sm text-gray-900 placeholder:text-gray-400/70 focus:outline-none focus:ring-0 disabled:cursor-default"
          placeholder={readOnly ? "—" : "Type here"}
          autoComplete="off"
        />
      </div>
    );
  };

  let g = 0;
  const items: React.ReactNode[] = [];

  lines.forEach((row, li) => {
    const line = typeof row === "string" ? row : "";
    if (line.includes(FLOWCHART_GAP_TOKEN)) {
      const parts = line.split(FLOWCHART_GAP_TOKEN);
      const inner: React.ReactNode[] = [];
      for (let pi = 0; pi < parts.length; pi++) {
        const part = parts[pi] ?? "";
        if (part) {
          inner.push(
            <span
              key={`${li}-p-${pi}`}
              className={`${lineTextClassName} text-sm text-gray-900 leading-relaxed`.trim()}
            >
              {part}
            </span>,
          );
        }
        if (pi < parts.length - 1) {
          const gi = g;
          g += 1;
          inner.push(renderGap(gi, "inline"));
        }
      }
      items.push(
        <li
          key={li}
          className="flex flex-wrap items-baseline gap-x-2 gap-y-2 text-sm text-gray-900 leading-relaxed"
        >
          {showBullet ? (
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 self-start rounded-full bg-gray-500"
              aria-hidden
            />
          ) : null}
          <span className="inline-flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-2">
            {inner}
          </span>
        </li>,
      );
    } else {
      const gi = g;
      g += 1;
      items.push(
        <li
          key={li}
          className="flex flex-wrap items-end gap-x-3 gap-y-2 text-sm text-gray-900 leading-relaxed"
        >
          {showBullet ? (
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-500"
              aria-hidden
            />
          ) : null}
          <span className={`min-w-0 flex-1 ${lineTextClassName}`.trim()}>
            {line.trim() ? (
              line.trim()
            ) : (
              <span className="text-gray-400 italic">{emptyLinePlaceholder}</span>
            )}
          </span>
          {renderGap(gi, "suffix")}
        </li>,
      );
    }
  });

  return (
    <ul
      className={`list-none pl-0 ${isSummary ? "space-y-3" : "space-y-4"}`}
    >
      {items}
    </ul>
  );
};

export default NoteCompletionGaps;
