import React from "react";
import { FiX } from "react-icons/fi";
import {
  IReadingQuestion,
  ReadingQuestionType,
  QUESTION_TYPE_LABELS,
  countFlowchartGapTokens,
  countNoteCompletionGaps,
  countTableGapTokens,
  FLOWCHART_GAP_TOKEN,
  TABLE_ROW_CELL_DELIM,
} from "../../../api/reading";

// ─── Question type groups (same as AdminReadingQuestions) ─────────
export const Q_TYPE_GROUPS = [
  {
    label: "True/False/Yes/No",
    types: [
      ReadingQuestionType.TRUE_FALSE_NOT_GIVEN,
      ReadingQuestionType.YES_NO_NOT_GIVEN,
    ],
  },
  {
    label: "Multiple Choice",
    types: [ReadingQuestionType.MCQ_SINGLE, ReadingQuestionType.MCQ_MULTIPLE],
  },
  {
    label: "Fill / Complete",
    types: [
      ReadingQuestionType.FILL_IN_BLANKS,
      ReadingQuestionType.SENTENCE_COMPLETION,
      ReadingQuestionType.SUMMARY_COMPLETION,
      ReadingQuestionType.NOTE_COMPLETION,
      ReadingQuestionType.TABLE_COMPLETION,
      ReadingQuestionType.FLOWCHART_COMPLETION,
      ReadingQuestionType.DIAGRAM_LABEL_COMPLETION,
      ReadingQuestionType.SHORT_ANSWER,
    ],
  },
  {
    label: "Matching",
    types: [
      ReadingQuestionType.MATCHING_HEADINGS,
      ReadingQuestionType.MATCHING_INFORMATION,
      ReadingQuestionType.MATCHING_FEATURES,
      ReadingQuestionType.LIST_MATCHING,
      ReadingQuestionType.CLASSIFICATION,
      ReadingQuestionType.MATCHING_SENTENCE_ENDINGS,
    ],
  },
  {
    label: "Other",
    types: [
      ReadingQuestionType.DRAG_AND_DROP,
    ],
  },
];

export const needsOptions = (t: ReadingQuestionType) =>
  [
    ReadingQuestionType.MCQ_SINGLE,
    ReadingQuestionType.MCQ_MULTIPLE,
    ReadingQuestionType.MATCHING_HEADINGS,
    ReadingQuestionType.MATCHING_INFORMATION,
    ReadingQuestionType.MATCHING_FEATURES,
    ReadingQuestionType.LIST_MATCHING,
    ReadingQuestionType.CLASSIFICATION,
    ReadingQuestionType.MATCHING_SENTENCE_ENDINGS,
    ReadingQuestionType.NOTE_COMPLETION,
    ReadingQuestionType.SUMMARY_COMPLETION,
    ReadingQuestionType.TABLE_COMPLETION,
    ReadingQuestionType.FLOWCHART_COMPLETION,
    ReadingQuestionType.DIAGRAM_LABEL_COMPLETION,
    ReadingQuestionType.SHORT_ANSWER,
  ].includes(t);

export const needsWordBank = (t: ReadingQuestionType) =>
  [
    ReadingQuestionType.DRAG_AND_DROP,
    ReadingQuestionType.TABLE_COMPLETION,
    ReadingQuestionType.FLOWCHART_COMPLETION,
    /** Headings pool (often longer than paragraphs) — distractors live here */
    ReadingQuestionType.MATCHING_HEADINGS,
    /** Ending pool (often more endings than gaps) — distractors live here */
    ReadingQuestionType.MATCHING_SENTENCE_ENDINGS,
    /** Paragraph letters as column headers (A–G) */
    ReadingQuestionType.MATCHING_INFORMATION,
    ReadingQuestionType.MATCHING_FEATURES,
    ReadingQuestionType.LIST_MATCHING,
    ReadingQuestionType.CLASSIFICATION,
    ReadingQuestionType.DIAGRAM_LABEL_COMPLETION,
  ].includes(t);

export const isTFNG = (t: ReadingQuestionType) =>
  [
    ReadingQuestionType.TRUE_FALSE_NOT_GIVEN,
    ReadingQuestionType.YES_NO_NOT_GIVEN,
  ].includes(t);

export const isMultiAnswer = (t: ReadingQuestionType) =>
  [
    ReadingQuestionType.MCQ_MULTIPLE,
    ReadingQuestionType.DRAG_AND_DROP,
    ReadingQuestionType.MATCHING_HEADINGS,
    ReadingQuestionType.MATCHING_INFORMATION,
    ReadingQuestionType.MATCHING_FEATURES,
    ReadingQuestionType.LIST_MATCHING,
    ReadingQuestionType.CLASSIFICATION,
    ReadingQuestionType.MATCHING_SENTENCE_ENDINGS,
    ReadingQuestionType.NOTE_COMPLETION,
    ReadingQuestionType.SUMMARY_COMPLETION,
    ReadingQuestionType.FLOWCHART_COMPLETION,
    ReadingQuestionType.TABLE_COMPLETION,
    ReadingQuestionType.DIAGRAM_LABEL_COMPLETION,
    ReadingQuestionType.SHORT_ANSWER,
  ].includes(t);

const TFNG_OPTIONS = ["TRUE", "FALSE", "NOT GIVEN"];
const YNNG_OPTIONS = ["YES", "NO", "NOT GIVEN"];

/** Merge type change into a draft (options / correctAnswer / wordBank reset). */
export function mergeTypeChange(
  prev: Partial<IReadingQuestion>,
  type: ReadingQuestionType,
): Partial<IReadingQuestion> {
  const next: Partial<IReadingQuestion> = { ...prev, questionType: type };
  if (isTFNG(type)) {
    next.options =
      type === ReadingQuestionType.YES_NO_NOT_GIVEN
        ? YNNG_OPTIONS
        : TFNG_OPTIONS;
    next.correctAnswer = "";
  } else if (needsOptions(type)) {
    if (type === ReadingQuestionType.NOTE_COMPLETION) {
      next.options = new Array(5).fill("");
      next.correctAnswer = new Array(
        countNoteCompletionGaps(next.options),
      ).fill("");
    } else if (type === ReadingQuestionType.SHORT_ANSWER) {
      next.options = [
        "My job is to look at seeds from",
        "The seed sample is contained in a",
        "However, during the eighteenth century this became fashionable among the middle classes.",
        "At some places in the journey the expensive nutmeg was protected by",
      ];
      next.correctAnswer = new Array(
        countNoteCompletionGaps(next.options),
      ).fill("");
      next.questionText = "The nutmeg tree and fruit";
      next.instructions =
        "Complete the notes below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in each gap.";
    } else if (type === ReadingQuestionType.SUMMARY_COMPLETION) {
      next.questionText = "Calls by the umpire";
      next.instructions =
        "Complete the summary below. Choose ONE WORD ONLY from the passage for each answer.";
      next.options = [
        "The quality of TV coverage of professional [[GAP]] had improved, and viewers were hearing conversations between umpires and [[GAP]]. They were as interested in these as they had been in [[GAP]] during tennis matches.",
      ];
      next.correctAnswer = new Array(
        countNoteCompletionGaps(next.options),
      ).fill("");
      next.wordBank = [];
    } else if (type === ReadingQuestionType.FLOWCHART_COMPLETION) {
      next.options = [
        "The bottom pot is detached from the upper basin by [[GAP]] it.",
        "When filling water in the bottom pot, ensure the level does not exceed the [[GAP]].",
        "Add 1 ½ tablespoons of [[GAP]] coffee to the basket.",
        "Firmly screw the upper and lower portions of the percolator together.",
        "As the water boils, the valve releases the air from the [[GAP]].",
        "Percolated coffee enters the upper basin through the [[GAP]].",
      ];
      next.correctAnswer = new Array(5).fill("");
    } else if (type === ReadingQuestionType.TABLE_COMPLETION) {
      next.options = [
        `Test${TABLE_ROW_CELL_DELIM}Findings`,
        `Observing the ${FLOWCHART_GAP_TOKEN} of Russian-speaking bilingual people when asked to select certain objects${TABLE_ROW_CELL_DELIM}Bilingual people engage both languages simultaneously; a mechanism known as ${FLOWCHART_GAP_TOKEN}`,
        `A test called the ${FLOWCHART_GAP_TOKEN}, focusing on naming colours${TABLE_ROW_CELL_DELIM}Bilingual people are more able to handle tasks involving a skill called ${FLOWCHART_GAP_TOKEN}`,
        `A test involving switching between tasks${TABLE_ROW_CELL_DELIM}When changing strategies, bilingual people have superior ${FLOWCHART_GAP_TOKEN}`,
      ];
      next.correctAnswer = new Array(5).fill("");
    } else if (type === ReadingQuestionType.MATCHING_INFORMATION) {
      next.options = [
        "a reference to a denial of involvement in piracy",
        "mention of a motive for criminal activity",
        "what global communication is",
      ];
      next.wordBank = ["A", "B", "C", "D", "E", "F", "G"];
      next.correctAnswer = new Array(3).fill("");
    } else if (type === ReadingQuestionType.MATCHING_FEATURES) {
      next.options = [
        "For our own safety, humans will need to restrict the abilities of robots.",
        "The risk of robots harming us is less serious than humans believe it to be.",
        "It will take many decades for robot intelligence to be as imaginative as human intelligence.",
        "Robots will never achieve the level of consciousness that humans possess.",
        "Humans should be careful about giving robots too much responsibility.",
      ];
      next.wordBank = [
        "A  Professor Smith",
        "B  Dr Jones",
        "C  Other expert",
      ];
      next.correctAnswer = new Array(5).fill("");
    } else if (type === ReadingQuestionType.LIST_MATCHING) {
      next.options = [
        "to remove trees that are diseased",
        "to generate income from the sale of mature trees",
        "to replant an area of trees",
      ];
      next.wordBank = [
        "A  a TSI Cut",
        "B  a Clearfell",
        "C  a CRS Cut",
      ];
      next.correctAnswer = new Array(3).fill("");
      next.questionText = "List of Timber Cuts";
    } else if (type === ReadingQuestionType.CLASSIFICATION) {
      next.options = [
        "cameras",
        "sensors",
        "protein tests",
        "altitude tents",
      ];
      next.wordBank = [
        "A  Recovery aid",
        "B  Monitoring equipment",
        "C  Training facility",
      ];
      next.correctAnswer = new Array(4).fill("");
      next.questionText = "Types of equipment";
      next.instructions =
        "Write the correct letter, A, B or C, in each box on your answer sheet.";
    } else if (type === ReadingQuestionType.DIAGRAM_LABEL_COMPLETION) {
      next.options = ["", "", ""];
      next.wordBank = [
        "French",
        "Mediterranean",
        "Australian native",
        "Spanish",
        "South African",
        "South African ball roller",
      ];
      next.correctAnswer = new Array(3).fill("");
      next.questionText = "Dung Beetle Types";
      next.instructions =
        "Label the tunnels on the diagram below using words from the box.";
    } else {
      next.options = ["", "", "", ""];
      next.correctAnswer = isMultiAnswer(type) ? [] : "";
    }
  } else {
    next.options = [];
    next.correctAnswer = isMultiAnswer(type) ? [] : "";
  }
  if (type === ReadingQuestionType.MATCHING_HEADINGS) {
    // Typical IELTS: fewer paragraph slots than heading options (distractors)
    next.wordBank = new Array(8).fill("");
  } else if (type === ReadingQuestionType.MATCHING_SENTENCE_ENDINGS) {
    next.wordBank = new Array(6).fill("");
  } else if (needsWordBank(type)) {
    if (
      type !== ReadingQuestionType.MATCHING_INFORMATION &&
      type !== ReadingQuestionType.MATCHING_FEATURES &&
      type !== ReadingQuestionType.LIST_MATCHING &&
      type !== ReadingQuestionType.CLASSIFICATION &&
      type !== ReadingQuestionType.DIAGRAM_LABEL_COMPLETION
    ) {
      next.wordBank = [""];
    }
  } else {
    next.wordBank = [];
  }
  return next;
}

export interface ReadingQuestionFormFieldsProps {
  value: Partial<IReadingQuestion>;
  onPatch: (patch: Partial<IReadingQuestion>) => void;
  /** Unique id for radio groups (MCQ single) when multiple editors on screen */
  fieldInstanceId: string | number;
  /** Show page #, order #, marks grid + section heading (single-question edit) */
  showPlacementFields: boolean;
}

export const ReadingQuestionFormFields: React.FC<
  ReadingQuestionFormFieldsProps
> = ({ value: form, onPatch, fieldInstanceId, showPlacementFields }) => {
  const setField = (key: keyof IReadingQuestion, val: unknown) =>
    onPatch({ [key]: val } as Partial<IReadingQuestion>);

  const handleTypeChange = (type: ReadingQuestionType) => {
    onPatch(mergeTypeChange(form, type));
  };

  const syncFlowchartCorrectLength = (
    opts: string[],
    prevCorrect: string | string[] | undefined,
  ) => {
    const n = countFlowchartGapTokens(opts);
    const ca = Array.isArray(prevCorrect) ? [...prevCorrect] : [];
    while (ca.length < n) ca.push("");
    ca.length = Math.max(0, n);
    setField("correctAnswer", ca);
  };

  const syncTableCorrectLength = (
    opts: string[],
    prevCorrect: string | string[] | undefined,
  ) => {
    const n = countTableGapTokens(opts);
    const ca = Array.isArray(prevCorrect) ? [...prevCorrect] : [];
    while (ca.length < n) ca.push("");
    ca.length = Math.max(0, n);
    setField("correctAnswer", ca);
  };

  const syncDiagramCorrectLength = (
    opts: string[],
    prevCorrect: string | string[] | undefined,
  ) => {
    const n = opts.length;
    const ca = Array.isArray(prevCorrect) ? [...prevCorrect] : [];
    while (ca.length < n) ca.push("");
    ca.length = Math.max(0, n);
    setField("correctAnswer", ca);
  };

  const syncNoteCompletionCorrectLength = (
    opts: string[],
    prevCorrect: string | string[] | undefined,
  ) => {
    const n = countNoteCompletionGaps(opts);
    const ca = Array.isArray(prevCorrect) ? [...prevCorrect] : [];
    while (ca.length < n) ca.push("");
    ca.length = Math.max(0, n);
    setField("correctAnswer", ca);
  };

  const handleOptionChange = (idx: number, val: string) => {
    const opts = [...(form.options ?? [])];
    opts[idx] = val;
    setField("options", opts);
    if (form.questionType === ReadingQuestionType.FLOWCHART_COMPLETION) {
      syncFlowchartCorrectLength(opts, form.correctAnswer);
    }
    if (form.questionType === ReadingQuestionType.TABLE_COMPLETION) {
      syncTableCorrectLength(opts, form.correctAnswer);
    }
    if (form.questionType === ReadingQuestionType.DIAGRAM_LABEL_COMPLETION) {
      syncDiagramCorrectLength(opts, form.correctAnswer);
    }
    if (
      form.questionType === ReadingQuestionType.NOTE_COMPLETION ||
      form.questionType === ReadingQuestionType.SHORT_ANSWER ||
      form.questionType === ReadingQuestionType.SUMMARY_COMPLETION
    ) {
      syncNoteCompletionCorrectLength(opts, form.correctAnswer);
    }
  };

  const addOption = () => {
    const nextOpts = [...(form.options ?? []), ""];
    setField("options", nextOpts);
    if (
      form.questionType === ReadingQuestionType.NOTE_COMPLETION ||
      form.questionType === ReadingQuestionType.SHORT_ANSWER ||
      form.questionType === ReadingQuestionType.SUMMARY_COMPLETION
    ) {
      syncNoteCompletionCorrectLength(nextOpts, form.correctAnswer);
    }
    if (
      (form.questionType === ReadingQuestionType.MATCHING_INFORMATION ||
        form.questionType === ReadingQuestionType.MATCHING_FEATURES ||
        form.questionType === ReadingQuestionType.LIST_MATCHING ||
        form.questionType === ReadingQuestionType.CLASSIFICATION) &&
      Array.isArray(form.correctAnswer)
    ) {
      setField("correctAnswer", [...form.correctAnswer, ""]);
    }
    if (form.questionType === ReadingQuestionType.FLOWCHART_COMPLETION) {
      syncFlowchartCorrectLength(nextOpts, form.correctAnswer);
    }
    if (form.questionType === ReadingQuestionType.TABLE_COMPLETION) {
      syncTableCorrectLength(nextOpts, form.correctAnswer);
    }
    if (form.questionType === ReadingQuestionType.DIAGRAM_LABEL_COMPLETION) {
      syncDiagramCorrectLength(nextOpts, form.correctAnswer);
    }
  };
  const removeOption = (idx: number) => {
    const opts = (form.options ?? []).filter((_, i) => i !== idx);
    setField("options", opts);
    if (
      form.questionType === ReadingQuestionType.NOTE_COMPLETION ||
      form.questionType === ReadingQuestionType.SHORT_ANSWER ||
      form.questionType === ReadingQuestionType.SUMMARY_COMPLETION
    ) {
      syncNoteCompletionCorrectLength(opts, form.correctAnswer);
    }
    if (
      form.questionType === ReadingQuestionType.DIAGRAM_LABEL_COMPLETION &&
      Array.isArray(form.correctAnswer)
    ) {
      setField(
        "correctAnswer",
        form.correctAnswer.filter((_, i) => i !== idx),
      );
    }
    if (
      (form.questionType === ReadingQuestionType.MATCHING_INFORMATION ||
        form.questionType === ReadingQuestionType.MATCHING_FEATURES ||
        form.questionType === ReadingQuestionType.LIST_MATCHING ||
        form.questionType === ReadingQuestionType.CLASSIFICATION) &&
      Array.isArray(form.correctAnswer)
    ) {
      setField(
        "correctAnswer",
        form.correctAnswer.filter((_, i) => i !== idx),
      );
    }
    if (form.questionType === ReadingQuestionType.FLOWCHART_COMPLETION) {
      syncFlowchartCorrectLength(opts, form.correctAnswer);
    }
    if (form.questionType === ReadingQuestionType.TABLE_COMPLETION) {
      syncTableCorrectLength(opts, form.correctAnswer);
    }
    if (form.questionType === ReadingQuestionType.DIAGRAM_LABEL_COMPLETION) {
      syncDiagramCorrectLength(opts, form.correctAnswer);
    }
  };

  const handleWordBankChange = (idx: number, val: string) => {
    const wb = [...(form.wordBank ?? [])];
    wb[idx] = val;
    setField("wordBank", wb);
  };

  const addWordBank = () =>
    setField("wordBank", [...(form.wordBank ?? []), ""]);
  const removeWordBank = (idx: number) =>
    setField(
      "wordBank",
      (form.wordBank ?? []).filter((_, i) => i !== idx),
    );

  const toggleMultiAnswer = (val: string) => {
    const current = Array.isArray(form.correctAnswer) ? form.correctAnswer : [];
    if (current.includes(val))
      setField(
        "correctAnswer",
        current.filter((v) => v !== val),
      );
    else setField("correctAnswer", [...current, val]);
  };

  const handleIndexedAnswer = (idx: number, val: string) => {
    const arr = Array.isArray(form.correctAnswer)
      ? [...form.correctAnswer]
      : new Array(form.options?.length ?? 0).fill("");
    arr[idx] = val;
    setField("correctAnswer", arr);
  };

  const handleFlowchartIndexedAnswer = (idx: number, val: string) => {
    const n = countFlowchartGapTokens(form.options);
    const arr = Array.isArray(form.correctAnswer)
      ? [...form.correctAnswer]
      : new Array(n).fill("");
    while (arr.length < n) arr.push("");
    arr.length = n;
    arr[idx] = val;
    setField("correctAnswer", arr);
  };

  const handleTableIndexedAnswer = (idx: number, val: string) => {
    const n = countTableGapTokens(form.options);
    const arr = Array.isArray(form.correctAnswer)
      ? [...form.correctAnswer]
      : new Array(n).fill("");
    while (arr.length < n) arr.push("");
    arr.length = n;
    arr[idx] = val;
    setField("correctAnswer", arr);
  };

  const handleNoteCompletionIndexedAnswer = (idx: number, val: string) => {
    const n = countNoteCompletionGaps(form.options);
    const arr = Array.isArray(form.correctAnswer)
      ? [...form.correctAnswer]
      : new Array(n).fill("");
    while (arr.length < n) arr.push("");
    arr.length = n;
    arr[idx] = val;
    setField("correctAnswer", arr);
  };

  const qType = form.questionType as ReadingQuestionType;
  const tfngOpts =
    qType === ReadingQuestionType.YES_NO_NOT_GIVEN
      ? YNNG_OPTIONS
      : TFNG_OPTIONS;

  return (
    <div className="space-y-5">
      {/* Question type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Question Type *
        </label>
        <select
          value={form.questionType}
          onChange={(e) =>
            handleTypeChange(e.target.value as ReadingQuestionType)
          }
          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
        >
          {Q_TYPE_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.types.map((t) => (
                <option key={t} value={t}>
                  {QUESTION_TYPE_LABELS[t]}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Instructions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Instructions (shown above question)
        </label>
        <textarea
          rows={2}
          placeholder="e.g. Choose ONE letter A–D"
          value={form.instructions}
          onChange={(e) => setField("instructions", e.target.value)}
          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
        />
      </div>

      {/* Question text */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Question Text *
        </label>
        <textarea
          rows={3}
          placeholder={
            qType === ReadingQuestionType.NOTE_COMPLETION
              ? "e.g. Marie Curie's research on radioactivity (shown as the note heading)"
              : qType === ReadingQuestionType.SUMMARY_COMPLETION
                ? "e.g. Calls by the umpire (bold sub-heading above the summary)"
                : qType === ReadingQuestionType.FLOWCHART_COMPLETION
                ? "e.g. The Percolation Process (title centered above the flowchart)"
                : qType === ReadingQuestionType.TABLE_COMPLETION
                  ? "e.g. The Benefits of Being Bilingual (title above the table)"
                  : qType === ReadingQuestionType.LIST_MATCHING ||
                      qType === ReadingQuestionType.CLASSIFICATION
                    ? 'e.g. List of Timber Cuts (title above the A/B/C bank — not the passage)'
                    : qType === ReadingQuestionType.DIAGRAM_LABEL_COMPLETION
                      ? 'e.g. Dung Beetle Types (title shown above the word box)'
                      : "Enter the question stem here..."
          }
          value={form.questionText}
          onChange={(e) => setField("questionText", e.target.value)}
          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
        />
      </div>

      {/* Options (MCQ / Matching) */}
      {needsOptions(qType) && !isTFNG(qType) && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              {qType === ReadingQuestionType.MATCHING_HEADINGS
                ? "Paragraphs / sections (one per slot)"
                  : qType === ReadingQuestionType.MATCHING_SENTENCE_ENDINGS
                  ? "Sentence stems (one per gap)"
                  : qType === ReadingQuestionType.SUMMARY_COMPLETION
                    ? "Summary lines (one paragraph per row; use [[GAP]] for each blank)"
                  : qType === ReadingQuestionType.NOTE_COMPLETION
                    ? "Note lines (one row; optional inline blanks with [[GAP]])"
                    : qType === ReadingQuestionType.SHORT_ANSWER
                      ? "Answer lines (one row; optional inline blanks with [[GAP]])"
                    : qType === ReadingQuestionType.FLOWCHART_COMPLETION
                      ? "Flowchart steps (one row per box)"
                      : qType === ReadingQuestionType.TABLE_COMPLETION
                        ? "Table rows (row 1 = header, split cells with |||)"
                        : qType === ReadingQuestionType.DIAGRAM_LABEL_COMPLETION
                          ? "Diagram gaps (one row per answer box; optional hint only)"
                          : qType === ReadingQuestionType.LIST_MATCHING ||
                              qType === ReadingQuestionType.CLASSIFICATION
                          ? qType === ReadingQuestionType.CLASSIFICATION
                            ? "Items to classify (one row per gap; letter box on the left)"
                            : "Purposes (one row per gap, text on the right of the box)"
                          : qType.startsWith("matching")
                            ? "Items to Match"
                            : "Answer Options"}
            </label>
            <button
              type="button"
              onClick={addOption}
              className="text-xs text-primary-600 hover:underline"
            >
              + Add
            </button>
          </div>
          {qType === ReadingQuestionType.MATCHING_HEADINGS && (
            <p className="text-xs text-gray-500 mb-2">
              One row per paragraph or section the student assigns a heading to
              (e.g. shorter summaries of A–E). This list defines how many drop
              slots appear — not the heading pool.
            </p>
          )}
          {qType === ReadingQuestionType.MATCHING_SENTENCE_ENDINGS && (
            <p className="text-xs text-gray-500 mb-2">
              One incomplete sentence per row (the part before the gap). Students
              drag an ending from the bank into the numbered gap beside each stem.
            </p>
          )}
          {(qType === ReadingQuestionType.NOTE_COMPLETION ||
            qType === ReadingQuestionType.SHORT_ANSWER ||
            qType === ReadingQuestionType.SUMMARY_COMPLETION) && (
            <p className="text-xs text-gray-500 mb-2">
              {qType === ReadingQuestionType.SHORT_ANSWER ? (
                <>
                  One row per bullet line. Text appears before each numbered box,
                  or use{" "}
                  <code className="rounded bg-gray-100 px-1">{FLOWCHART_GAP_TOKEN}</code>{" "}
                  inside a row for a blank in the middle of the sentence. Rows
                  without the token get one trailing box. Put the full task in{" "}
                  <strong>Instructions</strong>.
                </>
              ) : qType === ReadingQuestionType.SUMMARY_COMPLETION ? (
                <>
                  Summary without a phrase list: students type one word (or your
                  rubric) per gap. Use{" "}
                  <code className="rounded bg-gray-100 px-1">{FLOWCHART_GAP_TOKEN}</code>{" "}
                  in the text for each blank; rows without the token get one box
                  at the end. Optional extra rows for another paragraph.
                </>
              ) : (
                <>
                  One row per bullet line. Use{" "}
                  <code className="rounded bg-gray-100 px-1">{FLOWCHART_GAP_TOKEN}</code>{" "}
                  for blanks inside the line; otherwise one dashed box appears at
                  the end of that row.
                </>
              )}
            </p>
          )}
          {qType === ReadingQuestionType.FLOWCHART_COMPLETION && (
            <p className="text-xs text-gray-500 mb-2">
              One row per flowchart box. Put the exact token{" "}
              <code className="rounded bg-gray-100 px-1">{FLOWCHART_GAP_TOKEN}</code>{" "}
              wherever the student should type (top to bottom = gap 1, 2, 3…).
              Rows without the token are plain text steps.
            </p>
          )}
          {qType === ReadingQuestionType.TABLE_COMPLETION && (
            <p className="text-xs text-gray-500 mb-2">
              Row <strong>1</strong> = header cells separated by{" "}
              <code className="rounded bg-gray-100 px-1">{TABLE_ROW_CELL_DELIM}</code>
              . Each following row is one table row (same columns). Use{" "}
              <code className="rounded bg-gray-100 px-1">{FLOWCHART_GAP_TOKEN}</code>{" "}
              for each blank. Gaps are numbered left-to-right, then next row
              (same order as correct answers).
            </p>
          )}
          {qType === ReadingQuestionType.DIAGRAM_LABEL_COMPLETION && (
            <p className="text-xs text-gray-500 mb-2">
              One row per <strong>answer box</strong> (same count as question
              numbers in the booklet, e.g. 6, 7, 8). Rows can stay empty or hold a
              short hint beside each number on the test. Put the diagram in the
              passage if needed — not here.
            </p>
          )}
          {qType === ReadingQuestionType.MATCHING_INFORMATION && (
            <p className="text-xs text-gray-500 mb-2">
              One row per <strong>statement</strong> matched to a paragraph.
              Add paragraph letters (e.g. A–G) in the word bank — each becomes a
              column in the grid. The same letter may be correct for more than one
              statement.
            </p>
          )}
          {qType === ReadingQuestionType.MATCHING_FEATURES && (
            <p className="text-xs text-gray-500 mb-2">
              One row per <strong>statement</strong>. Students drag{" "}
              <strong>A, B, C</strong> (or type a letter) into the dashed box
              beside each line. List experts or categories in the word bank; each
              row can start with its letter (e.g. &quot;A Professor Smith&quot;).
            </p>
          )}
          {(qType === ReadingQuestionType.LIST_MATCHING ||
            qType === ReadingQuestionType.CLASSIFICATION) && (
            <p className="text-xs text-gray-500 mb-2">
              {qType === ReadingQuestionType.CLASSIFICATION ? (
                <>
                  One row per <strong>item</strong> to classify (text on the right
                  of the dashed box). Students drag <strong>A, B, C</strong> (or
                  type) into the box on the left. Put task wording in{" "}
                  <strong>Instructions</strong>; use Question Text for the
                  category list title only.
                </>
              ) : (
                <>
                  One row per <strong>purpose</strong> (or description) to match to the
                  list below. Students drag <strong>A, B, C</strong> (or type) into the
                  dashed box on the left. Put the full task wording in{" "}
                  <strong>Instructions</strong>; use Question Text for the bank title
                  only (e.g. &quot;List of Timber Cuts&quot;).
                </>
              )}
            </p>
          )}
          <div className="space-y-2">
            {(form.options ?? []).map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-500 w-8 shrink-0">
                  {qType === ReadingQuestionType.MATCHING_HEADINGS ||
                  qType === ReadingQuestionType.MATCHING_SENTENCE_ENDINGS ||
                  qType === ReadingQuestionType.MATCHING_INFORMATION ||
                  qType === ReadingQuestionType.MATCHING_FEATURES ||
                  qType === ReadingQuestionType.LIST_MATCHING ||
                  qType === ReadingQuestionType.CLASSIFICATION ||
                  qType === ReadingQuestionType.SUMMARY_COMPLETION ||
                  qType === ReadingQuestionType.NOTE_COMPLETION ||
                  qType === ReadingQuestionType.SHORT_ANSWER ||
                  qType === ReadingQuestionType.FLOWCHART_COMPLETION ||
                  qType === ReadingQuestionType.TABLE_COMPLETION ||
                  qType === ReadingQuestionType.DIAGRAM_LABEL_COMPLETION
                    ? `${i + 1}.`
                    : String.fromCharCode(65 + i)}
                </span>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => handleOptionChange(i, e.target.value)}
                  placeholder={
                    qType === ReadingQuestionType.MATCHING_HEADINGS
                      ? `Paragraph / section ${i + 1}`
                        : qType === ReadingQuestionType.MATCHING_SENTENCE_ENDINGS
                        ? `Stem for gap ${i + 1} (incomplete sentence)`
                        : qType === ReadingQuestionType.SUMMARY_COMPLETION
                          ? `Summary paragraph ${i + 1} (use ${FLOWCHART_GAP_TOKEN} for each blank)`
                        : qType === ReadingQuestionType.NOTE_COMPLETION
                          ? `Line ${i + 1} (optional ${FLOWCHART_GAP_TOKEN} for inline blank)`
                          : qType === ReadingQuestionType.SHORT_ANSWER
                            ? `Line ${i + 1} (optional ${FLOWCHART_GAP_TOKEN} for inline blank)`
                        : qType === ReadingQuestionType.FLOWCHART_COMPLETION
                          ? `Step ${i + 1} (include ${FLOWCHART_GAP_TOKEN} for each blank)`
                          : qType === ReadingQuestionType.TABLE_COMPLETION
                            ? i === 0
                              ? `Header: Col1${TABLE_ROW_CELL_DELIM}Col2${TABLE_ROW_CELL_DELIM}…`
                              : `Data row ${i} (cells separated by ${TABLE_ROW_CELL_DELIM})`
                            : qType === ReadingQuestionType.DIAGRAM_LABEL_COMPLETION
                              ? `Optional hint for label ${i + 1} (shown under the number)`
                  : qType === ReadingQuestionType.MATCHING_INFORMATION
                    ? `Statement ${i + 1}`
                    : qType === ReadingQuestionType.MATCHING_FEATURES
                      ? `Statement ${i + 1}`
                      : qType === ReadingQuestionType.LIST_MATCHING ||
                          qType === ReadingQuestionType.CLASSIFICATION
                        ? `Item / purpose ${i + 1}`
                        : `Option ${String.fromCharCode(65 + i)}`
                  }
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="text-red-400 hover:text-red-600"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Word bank */}
      {needsWordBank(qType) && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              {qType === ReadingQuestionType.MATCHING_HEADINGS
                ? "Heading list (letters A, B, C…)"
                : qType === ReadingQuestionType.MATCHING_SENTENCE_ENDINGS
                  ? "Ending phrases (letters A, B, C…)"
                : qType === ReadingQuestionType.FLOWCHART_COMPLETION
                  ? "Optional word hints (shown under chart; not scored)"
                : qType === ReadingQuestionType.TABLE_COMPLETION
                  ? "Optional word hints (shown under table; not scored)"
                  : qType === ReadingQuestionType.MATCHING_INFORMATION
                  ? "Paragraph letters (column headers, e.g. A–G)"
                  : qType === ReadingQuestionType.MATCHING_FEATURES
                    ? "Experts / categories (one row per letter)"
                    : qType === ReadingQuestionType.DIAGRAM_LABEL_COMPLETION
                      ? "Word box (all labels; extras act as distractors)"
                    : qType === ReadingQuestionType.LIST_MATCHING ||
                        qType === ReadingQuestionType.CLASSIFICATION
                      ? "List choices (A/B/C + text; same letter can fill multiple gaps)"
                    : "Word Bank"}
            </label>
            <button
              type="button"
              onClick={addWordBank}
              className="text-xs text-primary-600 hover:underline"
            >
              + Add
            </button>
          </div>
          {qType === ReadingQuestionType.MATCHING_HEADINGS && (
            <p className="text-xs text-gray-500 mb-2">
              Include more headings than paragraph slots (e.g. 8 headings for 5
              paragraphs). Extra rows act as distractors. Students drag letters
              into slots; each letter can be used once.
            </p>
          )}
          {qType === ReadingQuestionType.MATCHING_SENTENCE_ENDINGS && (
            <p className="text-xs text-gray-500 mb-2">
              List every possible ending (correct and incorrect). Usually more
              endings than gaps so some are distractors. Each ending letter can
              only be placed once.
            </p>
          )}
          {qType === ReadingQuestionType.MATCHING_INFORMATION && (
            <p className="text-xs text-gray-500 mb-2">
              One entry per column (typically <strong>A</strong> through{" "}
              <strong>G</strong>). These labels appear as the table header row on
              the test. Leave empty to default to A–G.
            </p>
          )}
          {qType === ReadingQuestionType.MATCHING_FEATURES && (
            <p className="text-xs text-gray-500 mb-2">
              One row per choice (e.g. <strong>A</strong> with the expert name).
              Students drag these letters into the dashed boxes. You can use fewer
              than three rows if the task only has two experts.
            </p>
          )}
          {(qType === ReadingQuestionType.LIST_MATCHING ||
            qType === ReadingQuestionType.CLASSIFICATION) && (
            <p className="text-xs text-gray-500 mb-2">
              One row per list item (e.g. <strong>A</strong> with the cut type).
              Letters can be reused across gaps (IELTS &quot;NB&quot; style).
            </p>
          )}
          {qType === ReadingQuestionType.DIAGRAM_LABEL_COMPLETION && (
            <p className="text-xs text-gray-500 mb-2">
              List every label that may appear in the diagram (correct and
              incorrect). Students drag a label into each numbered box or type the
              word.
            </p>
          )}
          {qType === ReadingQuestionType.FLOWCHART_COMPLETION && (
            <p className="text-xs text-gray-500 mb-2">
              Optional: list words or phrases from the passage as non-interactive
              hints under the chart. Leave empty if you do not need a word bank.
            </p>
          )}
          {qType === ReadingQuestionType.TABLE_COMPLETION && (
            <p className="text-xs text-gray-500 mb-2">
              Optional: non-interactive hints under the table. Leave empty if not
              needed.
            </p>
          )}
          <div className="space-y-2">
            {(form.wordBank ?? []).map((w, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
              >
                <span className="text-xs font-mono font-bold text-primary-700 w-7 shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
                <input
                  type="text"
                  value={w}
                  onChange={(e) => handleWordBankChange(i, e.target.value)}
                  className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none"
                  placeholder={
                    qType === ReadingQuestionType.MATCHING_HEADINGS
                      ? `Heading ${String.fromCharCode(65 + i)} (e.g. ii. …)`
                      :                     qType === ReadingQuestionType.MATCHING_SENTENCE_ENDINGS
                      ? `Ending ${String.fromCharCode(65 + i)}`
                      : qType === ReadingQuestionType.FLOWCHART_COMPLETION
                        ? `Hint ${String.fromCharCode(65 + i)}`
                        : qType === ReadingQuestionType.TABLE_COMPLETION
                          ? `Hint ${String.fromCharCode(65 + i)}`
                          : qType === ReadingQuestionType.MATCHING_INFORMATION
                          ? `Column label ${String.fromCharCode(65 + i)}`
                            : qType === ReadingQuestionType.MATCHING_FEATURES
                            ? `e.g. A Professor Smith`
                            : qType === ReadingQuestionType.LIST_MATCHING ||
                                qType === ReadingQuestionType.CLASSIFICATION
                              ? `e.g. A  a TSI Cut`
                              : qType === ReadingQuestionType.DIAGRAM_LABEL_COMPLETION
                                ? `e.g. French`
                            : "word"
                  }
                />
                <button type="button" onClick={() => removeWordBank(i)}>
                  <FiX className="w-3 h-3 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Correct answer */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Correct Answer *
          {(qType === ReadingQuestionType.FILL_IN_BLANKS ||
            qType === ReadingQuestionType.SHORT_ANSWER ||
            qType === ReadingQuestionType.SENTENCE_COMPLETION) && (
            <span className="text-xs text-gray-400 ml-1">
              (separate multiple acceptable answers with | e.g.
              &quot;conservation|Conservation&quot;)
            </span>
          )}
        </label>

        {isTFNG(qType) && (
          <div className="flex gap-3">
            {tfngOpts.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setField("correctAnswer", opt)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  form.correctAnswer === opt
                    ? "bg-primary-600 text-white border-primary-600"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {qType === ReadingQuestionType.MCQ_SINGLE && (
          <div className="space-y-2">
            {(form.options ?? []).map((opt, i) =>
              opt ? (
                <label
                  key={i}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    form.correctAnswer === opt
                      ? "bg-green-50 border-green-400"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name={`correct-${fieldInstanceId}`}
                    checked={form.correctAnswer === opt}
                    onChange={() => setField("correctAnswer", opt)}
                    className="text-green-600"
                  />
                  <span className="font-mono text-xs text-gray-500 mr-1">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-sm text-gray-800">{opt}</span>
                </label>
              ) : null,
            )}
          </div>
        )}

        {qType === ReadingQuestionType.MCQ_MULTIPLE && (
          <div className="space-y-2">
            {(form.options ?? []).map((opt, i) =>
              opt ? (
                <label
                  key={i}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    (Array.isArray(form.correctAnswer)
                      ? form.correctAnswer
                      : []
                    ).includes(opt)
                      ? "bg-green-50 border-green-400"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={(Array.isArray(form.correctAnswer)
                      ? form.correctAnswer
                      : []
                    ).includes(opt)}
                    onChange={() => toggleMultiAnswer(opt)}
                    className="text-green-600 rounded"
                  />
                  <span className="font-mono text-xs text-gray-500 mr-1">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-sm text-gray-800">{opt}</span>
                </label>
              ) : null,
            )}
          </div>
        )}

        {((qType === ReadingQuestionType.NOTE_COMPLETION ||
          qType === ReadingQuestionType.SHORT_ANSWER) ||
          (qType === ReadingQuestionType.SUMMARY_COMPLETION &&
            countNoteCompletionGaps(form.options ?? []) > 0)) && (
          <div className="space-y-2 text-sm">
            <p className="text-xs text-gray-500">
              {qType === ReadingQuestionType.SUMMARY_COMPLETION ? (
                <>
                  One field per gap in reading order (rows first, then left to
                  right). Use{" "}
                  <code className="rounded bg-gray-100 px-1">{FLOWCHART_GAP_TOKEN}</code>{" "}
                  in the summary text for each blank. Use | between synonyms within
                  a gap.
                </>
              ) : (
                <>
                  One field per numbered gap in test order (rows first, then left to
                  right within a row). Use{" "}
                  <code className="rounded bg-gray-100 px-1">{FLOWCHART_GAP_TOKEN}</code>{" "}
                  in a row for blanks inside the sentence; rows without the token
                  keep one box at the end of the line. Use | between synonyms within
                  a gap.
                </>
              )}
            </p>
            {Array.from({
              length: countNoteCompletionGaps(form.options),
            }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-center gap-2"
              >
                <span className="text-xs text-gray-600 shrink-0 sm:w-24">
                  Gap {i + 1}
                </span>
                <input
                  type="text"
                  value={
                    Array.isArray(form.correctAnswer)
                      ? (form.correctAnswer[i] ?? "")
                      : ""
                  }
                  onChange={(e) =>
                    handleNoteCompletionIndexedAnswer(i, e.target.value)
                  }
                  placeholder="Expected answer(s), use | for alternatives"
                  className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            ))}
          </div>
        )}

        {qType === ReadingQuestionType.DIAGRAM_LABEL_COMPLETION && (
          <div className="space-y-2 text-sm">
            <p className="text-xs text-gray-500">
              For each numbered gap (same order as gap rows above), enter the
              accepted label. Use | between synonyms (e.g. South African|South
              african).
            </p>
            {(form.options ?? []).map((opt, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-center gap-2"
              >
                <span
                  className="text-xs text-gray-600 shrink-0 sm:w-44 truncate"
                  title={opt}
                >
                  Gap {i + 1}
                  {opt
                    ? ` · ${opt.slice(0, 40)}${opt.length > 40 ? "…" : ""}`
                    : ""}
                </span>
                <input
                  type="text"
                  value={
                    Array.isArray(form.correctAnswer)
                      ? (form.correctAnswer[i] ?? "")
                      : ""
                  }
                  onChange={(e) => handleIndexedAnswer(i, e.target.value)}
                  placeholder="Expected answer(s), use | for alternatives"
                  className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            ))}
          </div>
        )}

        {qType === ReadingQuestionType.FLOWCHART_COMPLETION && (
          <div className="space-y-2 text-sm">
            <p className="text-xs text-gray-500">
              One field per{" "}
              <code className="rounded bg-gray-100 px-1">{FLOWCHART_GAP_TOKEN}</code>{" "}
              in the steps above (first gap = slot 1). Use | for synonyms within a
              gap.
            </p>
            {Array.from({
              length: countFlowchartGapTokens(form.options),
            }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-center gap-2"
              >
                <span className="text-xs text-gray-600 shrink-0 sm:w-24">
                  Gap {i + 1}
                </span>
                <input
                  type="text"
                  value={
                    Array.isArray(form.correctAnswer)
                      ? (form.correctAnswer[i] ?? "")
                      : ""
                  }
                  onChange={(e) =>
                    handleFlowchartIndexedAnswer(i, e.target.value)
                  }
                  placeholder="Expected answer(s), use | for alternatives"
                  className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            ))}
          </div>
        )}

        {qType === ReadingQuestionType.TABLE_COMPLETION &&
          countTableGapTokens(form.options ?? []) > 0 && (
          <div className="space-y-2 text-sm">
            <p className="text-xs text-gray-500">
              One field per{" "}
              <code className="rounded bg-gray-100 px-1">{FLOWCHART_GAP_TOKEN}</code>{" "}
              in the table body (reading order: row by row, left to right). Use |
              for synonyms within a gap.
            </p>
            {Array.from({
              length: countTableGapTokens(form.options),
            }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-center gap-2"
              >
                <span className="text-xs text-gray-600 shrink-0 sm:w-24">
                  Gap {i + 1}
                </span>
                <input
                  type="text"
                  value={
                    Array.isArray(form.correctAnswer)
                      ? (form.correctAnswer[i] ?? "")
                      : ""
                  }
                  onChange={(e) =>
                    handleTableIndexedAnswer(i, e.target.value)
                  }
                  placeholder="Expected answer(s), use | for alternatives"
                  className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            ))}
          </div>
        )}

        {[
          ReadingQuestionType.MATCHING_HEADINGS,
          ReadingQuestionType.MATCHING_INFORMATION,
          ReadingQuestionType.MATCHING_FEATURES,
          ReadingQuestionType.LIST_MATCHING,
          ReadingQuestionType.CLASSIFICATION,
          ReadingQuestionType.MATCHING_SENTENCE_ENDINGS,
        ].includes(qType) && (
          <div className="space-y-2 text-sm">
            <p className="text-xs text-gray-500">
              {qType === ReadingQuestionType.MATCHING_HEADINGS
                ? "For each paragraph slot, enter the correct heading letter (A, B, C…) from the heading list above — not from the paragraph row numbers."
                : qType === ReadingQuestionType.MATCHING_SENTENCE_ENDINGS &&
                    (form.wordBank?.length ?? 0) > 0
                  ? "For each gap, enter the letter of the correct ending (A, B, C…) from the ending list above."
                  : qType === ReadingQuestionType.MATCHING_INFORMATION
                    ? "For each statement row, enter the correct paragraph letter from the word bank (A, B, …). The same letter may appear more than once in the answer key."
                    : qType === ReadingQuestionType.MATCHING_FEATURES
                      ? "For each statement, enter the correct expert letter (A, B, C…) from the word bank. The same letter may appear more than once."
                      : qType === ReadingQuestionType.LIST_MATCHING
                        ? "For each purpose row, enter the correct list letter (A, B, C…) from the word bank. The same letter may appear more than once."
                        : qType === ReadingQuestionType.CLASSIFICATION
                          ? "For each item row, enter the correct category letter (A, B, C…) from the word bank. The same letter may appear more than once."
                      : "For each item, provide the correct match letter (A, B, C…)"}
            </p>
            {(form.options ?? []).map((opt, i) => {
              if (
                !opt &&
                qType !== ReadingQuestionType.MATCHING_HEADINGS &&
                qType !== ReadingQuestionType.MATCHING_SENTENCE_ENDINGS &&
                qType !== ReadingQuestionType.MATCHING_INFORMATION &&
                qType !== ReadingQuestionType.MATCHING_FEATURES &&
                qType !== ReadingQuestionType.LIST_MATCHING &&
                qType !== ReadingQuestionType.CLASSIFICATION
              ) {
                return null;
              }
              return (
                <div key={i} className="flex items-center gap-3">
                  <span
                    className="w-40 sm:w-48 text-xs text-gray-700 truncate shrink-0"
                    title={opt}
                  >
                    {qType === ReadingQuestionType.MATCHING_HEADINGS
                      ? `Slot ${i + 1}${opt ? `: ${opt}` : ""}`
                      : qType === ReadingQuestionType.MATCHING_SENTENCE_ENDINGS
                        ? `Gap ${i + 1}${opt ? `: ${opt}` : ""}`
                        : qType === ReadingQuestionType.MATCHING_INFORMATION ||
                            qType === ReadingQuestionType.MATCHING_FEATURES ||
                            qType === ReadingQuestionType.LIST_MATCHING ||
                            qType === ReadingQuestionType.CLASSIFICATION
                          ? `${qType === ReadingQuestionType.LIST_MATCHING ? "Purpose" : qType === ReadingQuestionType.CLASSIFICATION ? "Item" : "Statement"} ${i + 1}${opt ? `: ${opt}` : ""}`
                          : `${String.fromCharCode(65 + i)}. ${opt}`}
                  </span>
                  <input
                    type="text"
                    maxLength={3}
                    placeholder="e.g. C"
                    value={
                      Array.isArray(form.correctAnswer)
                        ? (form.correctAnswer[i] ?? "")
                        : ""
                    }
                    onChange={(e) =>
                      handleIndexedAnswer(i, e.target.value.toUpperCase())
                    }
                    className="w-20 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              );
            })}
          </div>
        )}

        {[
          ReadingQuestionType.FILL_IN_BLANKS,
          ReadingQuestionType.SENTENCE_COMPLETION,
          ReadingQuestionType.SHORT_ANSWER,
          ReadingQuestionType.SUMMARY_COMPLETION,
          ReadingQuestionType.TABLE_COMPLETION,
        ].includes(qType) &&
          !(
            qType === ReadingQuestionType.TABLE_COMPLETION &&
            countTableGapTokens(form.options ?? []) > 0
          ) &&
          !(
            (qType === ReadingQuestionType.SHORT_ANSWER ||
              qType === ReadingQuestionType.SUMMARY_COMPLETION) &&
            countNoteCompletionGaps(form.options ?? []) > 0
          ) && (
          <input
            type="text"
            placeholder="Correct answer (use | to separate multiple accepted answers)"
            value={
              Array.isArray(form.correctAnswer)
                ? form.correctAnswer.join("|")
                : ((form.correctAnswer as string) ?? "")
            }
            onChange={(e) => {
              const parts = e.target.value.split("|").map((s) => s.trim());
              setField(
                "correctAnswer",
                parts.length === 1 ? parts[0] : parts,
              );
            }}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
          />
        )}

        {qType === ReadingQuestionType.DRAG_AND_DROP && (
          <div>
            <p className="text-xs text-gray-500 mb-1">
              Enter the correct order of words from the word bank (comma
              separated)
            </p>
            <input
              type="text"
              placeholder="word1, word2, word3"
              value={
                Array.isArray(form.correctAnswer)
                  ? form.correctAnswer.join(", ")
                  : ((form.correctAnswer as string) ?? "")
              }
              onChange={(e) =>
                setField(
                  "correctAnswer",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
            />
          </div>
        )}
      </div>

      {showPlacementFields && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Page #
                <span className="ml-1 text-xs text-gray-400 font-normal block">
                  (same page # = one student screen)
                </span>
              </label>
              <input
                type="number"
                min={1}
                value={form.pageNumber}
                onChange={(e) =>
                  setField("pageNumber", parseInt(e.target.value) || 1)
                }
                className="block w-full rounded-lg border border-primary-400 bg-primary-50 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order #
              </label>
              <input
                type="number"
                min={1}
                value={form.orderNumber}
                onChange={(e) =>
                  setField("orderNumber", parseInt(e.target.value) || 1)
                }
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marks
              </label>
              <input
                type="number"
                min={1}
                value={form.marks}
                onChange={(e) =>
                  setField("marks", parseInt(e.target.value) || 1)
                }
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Section Heading
              <span className="ml-1 text-xs text-gray-400 font-normal">
                (optional — shown above this group of questions)
              </span>
            </label>
            <input
              type="text"
              placeholder="e.g. Questions 1–6 · True / False / Not Given"
              value={form.groupLabel}
              onChange={(e) => setField("groupLabel", e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </>
      )}

      {!showPlacementFields && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Marks
          </label>
          <input
            type="number"
            min={1}
            value={form.marks ?? 1}
            onChange={(e) =>
              setField("marks", parseInt(e.target.value) || 1)
            }
            className="block w-full max-w-[120px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Explanation (optional)
        </label>
        <textarea
          rows={2}
          placeholder="Why is this the correct answer?"
          value={form.explanation}
          onChange={(e) => setField("explanation", e.target.value)}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>
    </div>
  );
};
