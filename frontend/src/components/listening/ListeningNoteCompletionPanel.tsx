import React from "react";
import { FLOWCHART_GAP_TOKEN } from "../../api/reading";

export interface ListeningNoteCompletionPanelProps {
  lines: string[];
  answerJson: string;
  onChange: (next: string) => void;
  firstQuestionNumber: number;
  /** Shown as a bold title above the notes (e.g. task title). */
  title?: string;
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

/** Gaps on lines before `rowIdx` (Listening note rules: skip `#` lines; only `[[GAP]]` rows). */
function gapsBeforeLineIndex(lines: string[], rowIdx: number): number {
  let n = 0;
  for (let i = 0; i < rowIdx; i++) {
    const line = String(lines[i] ?? "").trim();
    if (!line || line.startsWith("#")) continue;
    if (line.includes(FLOWCHART_GAP_TOKEN)) {
      n += Math.max(0, line.split(FLOWCHART_GAP_TOKEN).length - 1);
    }
  }
  return n;
}

function countListeningNoteGapsLocal(lines: string[]): number {
  let n = 0;
  for (const row of lines) {
    const line = String(row ?? "").trim();
    if (!line || line.startsWith("#")) continue;
    if (line.includes(FLOWCHART_GAP_TOKEN)) {
      n += Math.max(0, line.split(FLOWCHART_GAP_TOKEN).length - 1);
    }
  }
  return n;
}

const ListeningNoteCompletionPanel: React.FC<
  ListeningNoteCompletionPanelProps
> = ({ lines, answerJson, onChange, firstQuestionNumber, title }) => {
  const gapCount = countListeningNoteGapsLocal(lines);
  const parsed = parseJsonStringArray(answerJson);
  const vals = Array.from({ length: gapCount }, (_, i) =>
    String(parsed[i] ?? ""),
  );

  const setVal = (g: number, v: string) => {
    const next = [...vals];
    next[g] = v;
    onChange(JSON.stringify(next));
  };

  const gapBoxClass =
    "relative inline-flex min-h-[38px] min-w-[4.75rem] max-w-[10rem] align-baseline rounded-md border-2 border-dashed border-rose-300 bg-rose-50/60 px-1.5 pb-1 pt-4 shadow-sm";
  const qnClass =
    "pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 text-xs font-bold tabular-nums text-rose-900";

  const renderGap = (globalIdx: number) => {
    const qn = firstQuestionNumber + globalIdx;
    return (
      <span key={`g-${globalIdx}`} className={`${gapBoxClass} mx-0.5`}>
        <span className={qnClass} aria-hidden>
          {qn}
        </span>
        <input
          type="text"
          value={vals[globalIdx]}
          onChange={(e) => setVal(globalIdx, e.target.value)}
          aria-label={`Question ${qn}`}
          className="w-full min-w-0 bg-transparent text-center text-sm text-gray-900 placeholder:text-gray-400/70 focus:outline-none focus:ring-0"
          placeholder="Type here"
          autoComplete="off"
        />
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {title?.trim() ? (
        <h3 className="text-center text-base font-bold text-gray-900 leading-snug">
          {title.trim()}
        </h3>
      ) : null}
      <ul className="list-none space-y-3 pl-0">
        {lines.map((row, li) => {
          const raw = typeof row === "string" ? row : "";
          const line = raw.trim();
          if (!line) {
            return (
              <li key={li} className="text-xs text-gray-400 italic">
                (empty line)
              </li>
            );
          }
          if (line.startsWith("#")) {
            const heading = line.replace(/^#+\s*/, "").trim() || raw;
            return (
              <li key={li} className="list-none">
                <p className="text-sm font-bold text-gray-900 leading-snug pt-1">
                  {heading}
                </p>
              </li>
            );
          }
          if (line.includes(FLOWCHART_GAP_TOKEN)) {
            const parts = line.split(FLOWCHART_GAP_TOKEN);
            const base = gapsBeforeLineIndex(lines, li);
            const inner: React.ReactNode[] = [];
            for (let pi = 0; pi < parts.length; pi++) {
              const part = parts[pi] ?? "";
              if (part) {
                inner.push(
                  <span
                    key={`${li}-p-${pi}`}
                    className="whitespace-pre-wrap text-sm text-gray-900 leading-relaxed"
                  >
                    {part}
                  </span>,
                );
              }
              if (pi < parts.length - 1) {
                inner.push(renderGap(base + pi));
              }
            }
            return (
              <li
                key={li}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-2 text-sm text-gray-900 leading-relaxed"
              >
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 self-start rounded-full bg-gray-500"
                  aria-hidden
                />
                <span className="inline-flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1 gap-y-2">
                  {inner}
                </span>
              </li>
            );
          }
          return (
            <li
              key={li}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-2 text-sm text-gray-900 leading-relaxed"
            >
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 self-start rounded-full bg-gray-500"
                aria-hidden
              />
              <span className="whitespace-pre-wrap">{line}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ListeningNoteCompletionPanel;
