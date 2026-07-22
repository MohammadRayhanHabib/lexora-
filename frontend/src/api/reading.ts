import api from "./axios";
import type { ApiResponse } from "../types";

// ─── Enums mirroring backend ───────────────────────────────
export enum ReadingQuestionType {
  TRUE_FALSE_NOT_GIVEN = "true_false_not_given",
  YES_NO_NOT_GIVEN = "yes_no_not_given",
  MCQ_SINGLE = "mcq_single",
  MCQ_MULTIPLE = "mcq_multiple",
  FILL_IN_BLANKS = "fill_in_blanks",
  SENTENCE_COMPLETION = "sentence_completion",
  SUMMARY_COMPLETION = "summary_completion",
  NOTE_COMPLETION = "note_completion",
  MATCHING_HEADINGS = "matching_headings",
  MATCHING_INFORMATION = "matching_information",
  MATCHING_FEATURES = "matching_features",
  LIST_MATCHING = "list_matching",
  CLASSIFICATION = "classification",
  MATCHING_SENTENCE_ENDINGS = "matching_sentence_endings",
  DRAG_AND_DROP = "drag_and_drop",
  TABLE_COMPLETION = "table_completion",
  FLOWCHART_COMPLETION = "flowchart_completion",
  DIAGRAM_LABEL_COMPLETION = "diagram_label_completion",
  SHORT_ANSWER = "short_answer",
}

export const QUESTION_TYPE_LABELS: Record<ReadingQuestionType, string> = {
  [ReadingQuestionType.TRUE_FALSE_NOT_GIVEN]: "True / False / Not Given",
  [ReadingQuestionType.YES_NO_NOT_GIVEN]: "Yes / No / Not Given",
  [ReadingQuestionType.MCQ_SINGLE]: "Multiple Choice (Single Answer)",
  [ReadingQuestionType.MCQ_MULTIPLE]: "Multiple Choice (Multiple Answers)",
  [ReadingQuestionType.FILL_IN_BLANKS]: "Fill in the Blanks",
  [ReadingQuestionType.SENTENCE_COMPLETION]: "Sentence Completion",
  [ReadingQuestionType.SUMMARY_COMPLETION]: "Summary Completion",
  [ReadingQuestionType.NOTE_COMPLETION]: "Note Completion",
  [ReadingQuestionType.MATCHING_HEADINGS]: "Matching Headings",
  [ReadingQuestionType.MATCHING_INFORMATION]: "Information Matching",
  [ReadingQuestionType.MATCHING_FEATURES]: "Statement Matching",
  [ReadingQuestionType.LIST_MATCHING]: "List Matching",
  [ReadingQuestionType.CLASSIFICATION]: "Classification",
  [ReadingQuestionType.MATCHING_SENTENCE_ENDINGS]: "Matching Sentence Endings",
  [ReadingQuestionType.DRAG_AND_DROP]: "Drag and Drop",
  [ReadingQuestionType.TABLE_COMPLETION]: "Table Completion",
  [ReadingQuestionType.FLOWCHART_COMPLETION]: "Flowchart Completion",
  [ReadingQuestionType.DIAGRAM_LABEL_COMPLETION]: "Diagram Label Completion",
  [ReadingQuestionType.SHORT_ANSWER]: "Short Answer Questions",
};

/** One typed blank inside a flowchart step line (set in admin). */
export const FLOWCHART_GAP_TOKEN = "[[GAP]]";

export function countFlowchartGapTokens(rows: string[] | undefined): number {
  if (!rows?.length) return 0;
  let n = 0;
  for (const row of rows) {
    if (typeof row !== "string") continue;
    n += Math.max(0, row.split(FLOWCHART_GAP_TOKEN).length - 1);
  }
  return n;
}

/**
 * Note / short-answer option rows: each `[[GAP]]` is one inline blank. Rows
 * without the token keep one trailing blank (classic “line + box” note style).
 */
export function countNoteCompletionGaps(lines: string[] | undefined): number {
  if (!lines?.length) return 0;
  let n = 0;
  for (const row of lines) {
    if (typeof row !== "string") continue;
    if (row.includes(FLOWCHART_GAP_TOKEN)) {
      n += Math.max(0, row.split(FLOWCHART_GAP_TOKEN).length - 1);
    } else {
      n += 1;
    }
  }
  return n;
}

/**
 * Listening note completion: lines starting with `#` are section headings (no
 * gap). Lines without `[[GAP]]` are plain bullets (no trailing box). Only
 * `[[GAP]]` segments create blanks.
 */
export function countListeningNoteGaps(lines: string[] | undefined): number {
  if (!lines?.length) return 0;
  let n = 0;
  for (const row of lines) {
    if (typeof row !== "string") continue;
    const line = row.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.includes(FLOWCHART_GAP_TOKEN)) {
      n += Math.max(0, line.split(FLOWCHART_GAP_TOKEN).length - 1);
    }
  }
  return n;
}

/** Table: first `options` row = header; rest = body. Split cells with this token. */
export const TABLE_ROW_CELL_DELIM = "|||";

export type ParsedTableOptions = {
  headers: string[];
  bodyRows: string[][];
};

export function parseTableOptions(
  options: string[] | undefined,
): ParsedTableOptions | null {
  if (!options?.length) return null;
  const headers = (options[0] ?? "")
    .split(TABLE_ROW_CELL_DELIM)
    .map((s) => s.trim());
  const bodyRows = options
    .slice(1)
    .map((row) => row.split(TABLE_ROW_CELL_DELIM).map((s) => s.trim()));
  return { headers, bodyRows };
}

export function countTableGapTokens(options: string[] | undefined): number {
  const p = parseTableOptions(options);
  if (!p?.bodyRows.length) return 0;
  let n = 0;
  for (const row of p.bodyRows) {
    for (const cell of row) {
      n += Math.max(0, cell.split(FLOWCHART_GAP_TOKEN).length - 1);
    }
  }
  return n;
}

/** 0-based global gap index for the gap after `parts[partIndex]` in body cell (rowIdx, colIdx). */
export function tableGapIndexBefore(
  bodyRows: string[][],
  rowIdx: number,
  colIdx: number,
  partIndexInCell: number,
): number {
  let n = 0;
  for (let r = 0; r < bodyRows.length; r++) {
    const cells = bodyRows[r] ?? [];
    for (let c = 0; c < cells.length; c++) {
      const cell = cells[c] ?? "";
      const gapsHere = Math.max(0, cell.split(FLOWCHART_GAP_TOKEN).length - 1);
      if (r < rowIdx || (r === rowIdx && c < colIdx)) {
        n += gapsHere;
      } else if (r === rowIdx && c === colIdx) {
        n += partIndexInCell;
        return n;
      }
    }
  }
  return n;
}

// ─── Interfaces ────────────────────────────────────────────
export interface IReadingTest {
  _id: string;
  title: string;
  passageTitle: string;
  passageContent: string;
  passageImage?: string;
  duration: number;
  totalQuestions: number;
  isActive: boolean;
  showExplanations: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Hierarchy grouping
  academicNumber?: number;
  testNumber?: number;
  partNumber?: number;
  partTypeLabel?: string;
}

// Grouped structures returned by /reading/tests/grouped
export interface IReadingTestPart extends IReadingTest {}
export interface IReadingTestGroup {
  testNumber: number;
  parts: IReadingTestPart[];
}
export interface IReadingAcademicGroup {
  academicNumber: number;
  tests: IReadingTestGroup[];
}
export interface IReadingGroupedResponse {
  academicGroups: IReadingAcademicGroup[];
  ungrouped: IReadingTest[];
}

export interface IReadingQuestion {
  _id: string;
  readingTestId: string;
  questionType: ReadingQuestionType;
  instructions?: string;
  questionText: string;
  options?: string[];
  wordBank?: string[];
  correctAnswer: string | string[];
  orderNumber: number;
  groupLabel?: string;
  /** Page number for group-based pagination. All questions sharing the same
   *  pageNumber are displayed together on one scrollable page. Default: 1. */
  pageNumber?: number;
  marks: number;
  explanation?: string;
}

/** Sanitised version served to students (no correctAnswer) */
export interface IReadingQuestionStudent {
  _id: string;
  questionType: ReadingQuestionType;
  instructions?: string;
  questionText: string;
  options?: string[];
  wordBank?: string[];
  orderNumber: number;
  groupLabel?: string;
  pageNumber?: number;
  marks: number;
}

export interface IReadingAnswerEntry {
  questionId: string;
  answer: string | string[];
}

export interface IReadingAnswerResult extends IReadingAnswerEntry {
  isCorrect: boolean;
  correctAnswer: string | string[];
  explanation?: string;
}

export interface IReadingAttempt {
  _id: string;
  userId: string;
  testId: string;
  answers: IReadingAnswerEntry[];
  results?: IReadingAnswerResult[];
  score: number;
  totalScore: number;
  bandScore?: number;
  status: "in_progress" | "completed" | "abandoned";
  startedAt: string;
  submittedAt?: string;
  timeRemaining?: number;
  createdAt: string;
}

// ─── API Methods ───────────────────────────────────────────
export const readingApi = {
  // ── Admin ──────────────────────────────────────────────

  adminListTests: (page = 1, limit = 20) =>
    api.get<ApiResponse<{ tests: IReadingTest[]; total: number }>>(
      "/reading/admin/tests",
      {
        params: { page, limit },
      },
    ),

  adminGetTest: (id: string) =>
    api.get<ApiResponse<{ test: IReadingTest; questions: IReadingQuestion[] }>>(
      `/reading/admin/tests/${id}`,
    ),

  adminCreateTest: (data: Partial<IReadingTest> | FormData) =>
    api.post<ApiResponse<IReadingTest>>("/reading/admin/tests", data),

  adminUpdateTest: (id: string, data: Partial<IReadingTest> | FormData) =>
    api.put<ApiResponse<IReadingTest>>(`/reading/admin/tests/${id}`, data),

  adminDeleteTest: (id: string) =>
    api.delete<ApiResponse<null>>(`/reading/admin/tests/${id}`),

  adminGetQuestions: (testId: string) =>
    api.get<ApiResponse<IReadingQuestion[]>>(
      `/reading/admin/tests/${testId}/questions`,
    ),

  adminCreateQuestion: (testId: string, data: Partial<IReadingQuestion>) =>
    api.post<ApiResponse<IReadingQuestion>>(
      `/reading/admin/tests/${testId}/questions`,
      data,
    ),

  adminUpdateQuestion: (questionId: string, data: Partial<IReadingQuestion>) =>
    api.put<ApiResponse<IReadingQuestion>>(
      `/reading/admin/questions/${questionId}`,
      data,
    ),

  adminDeleteQuestion: (questionId: string) =>
    api.delete<ApiResponse<null>>(`/reading/admin/questions/${questionId}`),

  adminReorderQuestions: (
    testId: string,
    order: { id: string; orderNumber: number }[],
  ) =>
    api.post<ApiResponse<null>>(
      `/reading/admin/tests/${testId}/questions/reorder`,
      {
        order,
      },
    ),

  adminGetAttempts: (testId: string, page = 1, limit = 20) =>
    api.get<ApiResponse<{ attempts: IReadingAttempt[]; total: number }>>(
      `/reading/admin/tests/${testId}/attempts`,
      { params: { page, limit } },
    ),

  // ── Student ────────────────────────────────────────────

  listTests: () => api.get<ApiResponse<IReadingTest[]>>("/reading/tests"),

  listGroupedTests: () =>
    api.get<ApiResponse<IReadingGroupedResponse>>("/reading/tests/grouped"),

  getTest: (id: string) =>
    api.get<
      ApiResponse<{ test: IReadingTest; questions: IReadingQuestionStudent[] }>
    >(`/reading/tests/${id}`),

  startAttempt: (testId: string) =>
    api.post<ApiResponse<{ attempt: IReadingAttempt; timeRemaining: number }>>(
      `/reading/tests/${testId}/start`,
    ),

  getTimer: (attemptId: string) =>
    api.get<ApiResponse<{ secondsRemaining: number }>>(
      `/reading/attempts/${attemptId}/timer`,
    ),

  autoSave: (attemptId: string, answers: IReadingAnswerEntry[]) =>
    api.post(`/reading/attempts/${attemptId}/autosave`, { answers }),

  getDraft: (attemptId: string) =>
    api.get<ApiResponse<{ answers: IReadingAnswerEntry[] }>>(
      `/reading/attempts/${attemptId}/draft`,
    ),

  submitAttempt: (attemptId: string, answers: IReadingAnswerEntry[]) =>
    api.post<ApiResponse<IReadingAttempt>>(
      `/reading/attempts/${attemptId}/submit`,
      {
        answers,
      },
    ),

  getAttempt: (attemptId: string) =>
    api.get<ApiResponse<IReadingAttempt>>(`/reading/attempts/${attemptId}`),

  myAttempts: (testId?: string) =>
    api.get<ApiResponse<IReadingAttempt[]>>("/reading/my-attempts", {
      params: testId ? { testId } : undefined,
    }),
};
