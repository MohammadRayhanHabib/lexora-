import {
  ListeningQuestion,
  ListeningQuestionType,
} from "../../entities/ListeningTest";

const FLOWCHART_GAP_TOKEN = "[[GAP]]";
const TABLE_ROW_CELL_DELIM = "|||";

/** Flowchart: each options[] row is a step; count [[GAP]] tokens (same as Reading). */
export function countListeningFlowchartGaps(
  options: string[] | undefined,
): number {
  if (!options?.length) return 0;
  let n = 0;
  for (const row of options) {
    n += Math.max(0, String(row ?? "").split(FLOWCHART_GAP_TOKEN).length - 1);
  }
  return n;
}

/** Listening note: see frontend `countListeningNoteGaps` (same rules). */
export function countListeningNoteGaps(options: string[] | undefined): number {
  if (!options?.length) return 0;
  let n = 0;
  for (const row of options) {
    const line = String(row ?? "").trim();
    if (!line || line.startsWith("#")) continue;
    if (line.includes(FLOWCHART_GAP_TOKEN)) {
      n += Math.max(0, line.split(FLOWCHART_GAP_TOKEN).length - 1);
    }
  }
  return n;
}

/** Table: first options row = header; body rows count [[GAP]] in cells. */
export function countTableGapTokens(options: string[] | undefined): number {
  if (!options?.length || options.length < 2) return 0;
  let n = 0;
  for (let i = 1; i < options.length; i++) {
    const cells = options[i].split(TABLE_ROW_CELL_DELIM);
    for (const cell of cells) {
      n += Math.max(0, cell.split(FLOWCHART_GAP_TOKEN).length - 1);
    }
  }
  return n;
}

export function multiMcqSelectCount(q: ListeningQuestion): number {
  const n = (q as any).selectCount;
  if (typeof n === "number" && Number.isFinite(n) && n >= 1 && n <= 20) {
    return Math.floor(n);
  }
  return 2;
}

function parseJsonStringArray(raw: string): string[] {
  try {
    const p = JSON.parse(raw || "[]");
    return Array.isArray(p) ? p.map((x) => String(x ?? "").trim()) : [];
  } catch {
    return [];
  }
}

/** Normalize admin/student multi-MCQ answers to sorted uppercase letters (length `count`). */
export function normalizeLetterChoiceList(
  raw: unknown,
  count: number,
): string[] {
  let arr: string[] = [];
  if (Array.isArray(raw)) {
    arr = raw.map((x) => String(x ?? "").trim().toUpperCase());
  } else if (typeof raw === "string") {
    const s = raw.trim();
    if (s.startsWith("[")) {
      try {
        const p = JSON.parse(s);
        if (Array.isArray(p))
          arr = p.map((x: unknown) => String(x ?? "").trim().toUpperCase());
      } catch {
        /* ignore */
      }
    }
    if (arr.length === 0 && s) {
      arr = s
        .split(/[|,]/)
        .map((x) => x.trim().toUpperCase())
        .filter(Boolean);
    }
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of arr) {
    const c = x.charAt(0);
    if (/^[A-Z]$/.test(c) && !seen.has(c)) {
      seen.add(c);
      out.push(c);
    }
    if (out.length >= count) break;
  }
  while (out.length < count) out.push("");
  return out.slice(0, count).sort();
}

export function listeningMatchStemCount(q: ListeningQuestion): number {
  if (q.type !== ListeningQuestionType.MATCHING) return 0;
  const n = (q as any).matchStemCount;
  if (typeof n === "number" && Number.isFinite(n) && n >= 1 && n <= 30) {
    return Math.floor(n);
  }
  return 0;
}

/** Stems in options[0..stemCount-1], pool in options[stemCount..]. */
export function isListeningBoxMatching(q: ListeningQuestion): boolean {
  const stems = listeningMatchStemCount(q);
  const opts = (q as any).options as string[] | undefined;
  if (!stems || !opts?.length) return false;
  return opts.length > stems;
}

function listeningMatchingPool(q: ListeningQuestion): string[] {
  const stems = listeningMatchStemCount(q);
  return (((q as any).options ?? []) as string[]).slice(stems).map(String);
}

/** Normalize one admin/student cell to a pool letter A, B, … */
export function matchingCellToLetter(cell: string, pool: string[]): string {
  const p = cell.trim();
  if (!p) return "";
  const c0 = p.charAt(0).toUpperCase();
  if (p.length <= 2 && /^[A-Z]$/i.test(p.trim())) {
    return c0;
  }
  const low = p.toLowerCase();
  for (let j = 0; j < pool.length; j++) {
    if (pool[j].trim().toLowerCase() === low) {
      return String.fromCharCode(65 + j);
    }
  }
  return /^[A-Z]$/i.test(c0) ? c0 : "";
}

function normalizeMatchingAnswerLetters(
  raw: unknown,
  stemCount: number,
  pool: string[],
): string[] {
  const parts = normalizeTableAnswerArray(raw, stemCount);
  return parts.map((cell) => matchingCellToLetter(cell, pool));
}

export function mapLabelChoiceCount(q: ListeningQuestion): number {
  if (q.type !== ListeningQuestionType.MAP_LABELING) return 8;
  const n = (q as any).mapChoiceCount;
  if (typeof n === "number" && Number.isFinite(n) && n >= 2 && n <= 20) {
    return Math.floor(n);
  }
  return 8;
}

/** Map image URL set + at least one label row in `options`. */
export function isListeningMapLabeling(q: ListeningQuestion): boolean {
  if (q.type !== ListeningQuestionType.MAP_LABELING) return false;
  const img = String((q as any).mapImageUrl ?? "").trim();
  const n = ((q as any).options as string[] | undefined)?.length ?? 0;
  return img.length > 0 && n >= 1;
}

function normalizeMapLabelLetters(
  raw: unknown,
  rowCount: number,
  choices: number,
): string[] {
  const parts = normalizeTableAnswerArray(raw, rowCount);
  return parts.map((cell) => {
    const c = cell.trim().toUpperCase().charAt(0);
    if (!/^[A-Z]$/.test(c)) return "";
    if (c.charCodeAt(0) > 64 + choices) return "";
    return c;
  });
}

export function listeningQuestionWeight(q: ListeningQuestion): number {
  if (q.type === ListeningQuestionType.FLOWCHART_COMPLETION) {
    return countListeningFlowchartGaps((q as any).options);
  }
  if (q.type === ListeningQuestionType.NOTE_COMPLETION) {
    return countListeningNoteGaps((q as any).options);
  }
  if (q.type === ListeningQuestionType.TABLE_COMPLETION) {
    return countTableGapTokens(q.options);
  }
  if (q.type === ListeningQuestionType.MULTIPLE_CHOICE_MULTIPLE) {
    return multiMcqSelectCount(q);
  }
  if (q.type === ListeningQuestionType.MATCHING && isListeningBoxMatching(q)) {
    return listeningMatchStemCount(q);
  }
  if (q.type === ListeningQuestionType.MAP_LABELING && isListeningMapLabeling(q)) {
    return ((q as any).options as string[]).length;
  }
  return 1;
}

export function normalizeTableAnswerArray(
  raw: unknown,
  gapCount: number,
): string[] {
  const gc = Math.max(1, gapCount);
  let parts: string[] = [];
  if (Array.isArray(raw)) {
    parts = raw.map((x) => String(x ?? "").trim());
  } else if (typeof raw === "string") {
    const s = raw.trim();
    if (s.startsWith("[")) {
      try {
        const p = JSON.parse(s);
        if (Array.isArray(p))
          parts = p.map((x: unknown) => String(x ?? "").trim());
      } catch {
        /* ignore */
      }
    }
    if (parts.length === 0 && s) {
      parts = s.split("|").map((x) => x.trim());
    }
  }
  while (parts.length < gc) parts.push("");
  return parts.slice(0, gc);
}

/** One answer-key entry per question (table → JSON string array). */
export function buildAnswerKeyValue(q: ListeningQuestion): string {
  const fcGaps = countListeningFlowchartGaps((q as any).options);
  if (q.type === ListeningQuestionType.FLOWCHART_COMPLETION) {
    if (fcGaps < 1) return "";
    const raw = (q as any).answer ?? (q as any).correctAnswer;
    const arr = normalizeTableAnswerArray(raw, fcGaps);
    return JSON.stringify(arr);
  }
  const noteGaps = countListeningNoteGaps((q as any).options);
  if (q.type === ListeningQuestionType.NOTE_COMPLETION) {
    if (noteGaps < 1) return "";
    const raw = (q as any).answer ?? (q as any).correctAnswer;
    const arr = normalizeTableAnswerArray(raw, noteGaps);
    return JSON.stringify(arr);
  }
  const gaps = countTableGapTokens(q.options);
  if (q.type === ListeningQuestionType.TABLE_COMPLETION) {
    if (gaps < 1) return "";
    const raw = (q as any).answer ?? (q as any).correctAnswer;
    const arr = normalizeTableAnswerArray(raw, gaps);
    return JSON.stringify(arr);
  }
  if (q.type === ListeningQuestionType.MULTIPLE_CHOICE_MULTIPLE) {
    const k = multiMcqSelectCount(q);
    const raw = (q as any).answer ?? (q as any).correctAnswer;
    const letters = normalizeLetterChoiceList(raw, k);
    return JSON.stringify(letters);
  }
  if (q.type === ListeningQuestionType.MATCHING && isListeningBoxMatching(q)) {
    const stems = listeningMatchStemCount(q);
    const pool = listeningMatchingPool(q);
    if (stems < 1 || pool.length < 1) return "";
    const raw = (q as any).answer ?? (q as any).correctAnswer;
    const letters = normalizeMatchingAnswerLetters(raw, stems, pool);
    return JSON.stringify(letters);
  }
  if (q.type === ListeningQuestionType.MAP_LABELING && isListeningMapLabeling(q)) {
    const rows = ((q as any).options as string[]).length;
    const ch = mapLabelChoiceCount(q);
    if (rows < 1) return "";
    const raw = (q as any).answer ?? (q as any).correctAnswer;
    const letters = normalizeMapLabelLetters(raw, rows, ch);
    return JSON.stringify(letters);
  }
  const v = (q as any).answer ?? (q as any).correctAnswer;
  return String(v ?? "").trim();
}

export function countMultiMcqPartialScore(
  studentRaw: string,
  correctJson: string,
): number {
  const student = parseJsonStringArray(studentRaw)
    .map((s) => s.trim().toUpperCase().charAt(0))
    .filter((c) => /^[A-Z]$/.test(c));
  const correct = parseJsonStringArray(correctJson)
    .map((s) => s.trim().toUpperCase().charAt(0))
    .filter((c) => /^[A-Z]$/.test(c));
  if (!correct.length) return 0;
  const ss = new Set(student);
  let m = 0;
  for (const c of new Set(correct)) {
    if (ss.has(c)) m++;
  }
  return m;
}

/** How many scored slots this question contributes (for attempt.totalQuestions). */
export function listeningQuestionScoreSlots(q: ListeningQuestion): number {
  return listeningQuestionWeight(q);
}

export function countCorrectTableCells(
  studentRaw: string,
  correctJson: string,
): number {
  let student: string[];
  try {
    const p = JSON.parse(studentRaw || "[]");
    student = Array.isArray(p) ? p.map((x) => String(x ?? "")) : [];
  } catch {
    student = [];
  }
  let correct: string[];
  try {
    const p = JSON.parse(correctJson || "[]");
    correct = Array.isArray(p) ? p.map((x) => String(x ?? "")) : [];
  } catch {
    correct = [];
  }
  if (!correct.length) return 0;
  let matches = 0;
  for (let i = 0; i < correct.length; i++) {
    const a = (student[i] ?? "").trim().toLowerCase();
    const b = correct[i].trim().toLowerCase();
    if (a === b) matches++;
  }
  return matches;
}
