import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { FiArrowLeft, FiEdit2, FiFileText } from "react-icons/fi";
import {
  readingApi,
  IReadingTest,
  IReadingQuestion,
  QUESTION_TYPE_LABELS,
  ReadingQuestionType,
  countFlowchartGapTokens,
  countNoteCompletionGaps,
  countTableGapTokens,
  FLOWCHART_GAP_TOKEN,
  parseTableOptions,
  tableGapIndexBefore,
} from "../../../api/reading";
import Button from "../../../components/ui/Button";
import { PageLoader } from "../../../components/ui/Spinner";
import Badge from "../../../components/ui/Badge";
import MatchingInformationGrid from "../../../components/reading/MatchingInformationGrid";
import StatementMatchingPanel from "../../../components/reading/StatementMatchingPanel";
import ListMatchingPanel from "../../../components/reading/ListMatchingPanel";
import DiagramLabelCompletionPanel from "../../../components/reading/DiagramLabelCompletionPanel";
import NoteCompletionGaps from "../../../components/reading/NoteCompletionGaps";

function previewFlowchartGapsBeforeRow(rows: string[], rowIdx: number): number {
  let n = 0;
  for (let i = 0; i < rowIdx; i++) {
    const row = rows[i] ?? "";
    n += Math.max(0, row.split(FLOWCHART_GAP_TOKEN).length - 1);
  }
  return n;
}

const AdminReadingPreview: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<IReadingTest | null>(null);
  const [questions, setQuestions] = useState<IReadingQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQ, setActiveQ] = useState(0);

  useEffect(() => {
    if (!testId) return;
    readingApi
      .adminGetTest(testId)
      .then((r) => {
        setTest(r.data.data?.test ?? null);
        setQuestions(r.data.data?.questions ?? []);
      })
      .catch(() => toast.error("Failed to load preview"))
      .finally(() => setLoading(false));
  }, [testId]);

  if (loading) return <PageLoader />;
  if (!test)
    return <p className="text-center text-gray-500 mt-20">Test not found.</p>;

  const current = questions[activeQ];

  return (
    <>
      <Helmet>
        <title>Preview – {test.title} – Lexora</title>
      </Helmet>

      <div className="space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/reading")}
            >
              <FiArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <span className="text-sm text-gray-500">
              Admin Preview —{" "}
              <span className="font-medium text-gray-900">{test.title}</span>
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/admin/reading/${testId}/edit`)}
              className="gap-2"
            >
              <FiEdit2 className="w-4 h-4" /> Edit Test
            </Button>
            <Button
              size="sm"
              onClick={() => navigate(`/admin/reading/${testId}/questions`)}
              className="gap-2"
            >
              <FiFileText className="w-4 h-4" /> Manage Questions
            </Button>
          </div>
        </div>

        {/* Reading UI preview */}
        <div className="h-[calc(100vh-160px)] flex flex-col rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
          {/* Header bar (simulating CBT timer bar) */}
          <div className="flex items-center justify-between px-6 py-2.5 bg-gray-800 text-white text-sm">
            <span className="font-semibold">{test.title}</span>
            <span className="flex items-center gap-2">
              <span className="text-gray-300 text-xs">ADMIN PREVIEW</span>
              <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded">
                {test.duration}:00
              </span>
            </span>
          </div>

          {/* Two-column layout */}
          <div className="flex flex-1 overflow-hidden">
            {/* LEFT – Passage */}
            <div className="w-1/2 border-r border-gray-200 overflow-y-auto p-6 bg-white">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {test.passageTitle}
              </h2>
              {test.passageImage && (
                <img
                  src={test.passageImage}
                  alt="Passage illustration"
                  className="w-full rounded-lg mb-4 object-cover"
                />
              )}
              <div
                className="prose prose-sm max-w-none text-gray-800 leading-relaxed text-[15px]"
                dangerouslySetInnerHTML={{ __html: test.passageContent }}
              />
            </div>

            {/* RIGHT – Questions */}
            <div className="w-1/2 flex flex-col bg-gray-50">
              {questions.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                  No questions added yet.
                </div>
              ) : (
                <>
                  {/* Question area */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {current && (
                      <div className="space-y-4">
                        {/* Group label */}
                        {current.groupLabel && (
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {current.groupLabel}
                          </p>
                        )}

                        {/* Type badge */}
                        <div className="flex items-center gap-2">
                          <Badge variant="info">
                            {QUESTION_TYPE_LABELS[current.questionType]}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {current.marks} mark{current.marks !== 1 ? "s" : ""}
                          </span>
                        </div>

                        {/* Instructions */}
                        {current.instructions && (
                          <p className="text-sm font-medium text-gray-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                            {current.instructions}
                          </p>
                        )}

                        {/* Question text (bank title only for list / diagram label) */}
                        {(current.questionType ===
                          ReadingQuestionType.LIST_MATCHING ||
                          current.questionType ===
                            ReadingQuestionType.CLASSIFICATION ||
                          current.questionType ===
                            ReadingQuestionType.DIAGRAM_LABEL_COMPLETION) ? (
                          <p className="text-sm text-gray-700 font-medium text-center">
                            Questions {activeQ + 1}
                            {(current.options?.length ?? 0) > 1
                              ? ` – ${activeQ + (current.options?.length ?? 0)}`
                              : ""}
                          </p>
                        ) : (
                          <p className="text-base text-gray-900 font-semibold leading-snug">
                            {activeQ + 1}. {current.questionText}
                          </p>
                        )}

                        {/* Options preview */}
                        <AnswerPreview q={current} />

                        {/* Correct answer (admin only) */}
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-xs font-semibold text-green-700 mb-1">
                            ✓ Correct Answer
                          </p>
                          <p className="text-sm text-green-800">
                            {Array.isArray(current.correctAnswer)
                              ? current.correctAnswer.join(", ")
                              : current.correctAnswer}
                          </p>
                          {current.explanation && (
                            <p className="mt-2 text-xs text-green-700 italic">
                              {current.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Navigation */}
                  <div className="border-t border-gray-200 bg-white px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={activeQ === 0}
                        onClick={() => setActiveQ((p) => p - 1)}
                      >
                        ← Previous
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={activeQ === questions.length - 1}
                        onClick={() => setActiveQ((p) => p + 1)}
                      >
                        Next →
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {questions.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveQ(i)}
                          className={`w-8 h-8 text-xs rounded font-medium transition-colors ${
                            i === activeQ
                              ? "bg-primary-600 text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Answer Preview Subcomponent ─────────────────────────
const AnswerPreview: React.FC<{ q: IReadingQuestion }> = ({ q }) => {
  const { questionType: t, options, wordBank, questionText } = q;

  if (
    t === ReadingQuestionType.TRUE_FALSE_NOT_GIVEN ||
    t === ReadingQuestionType.YES_NO_NOT_GIVEN
  ) {
    const opts =
      t === ReadingQuestionType.YES_NO_NOT_GIVEN
        ? ["YES", "NO", "NOT GIVEN"]
        : ["TRUE", "FALSE", "NOT GIVEN"];
    return (
      <div className="flex gap-2">
        {opts.map((o) => (
          <div
            key={o}
            className="flex-1 py-2 rounded-lg bg-white border border-gray-200 text-center text-sm text-gray-700"
          >
            {o}
          </div>
        ))}
      </div>
    );
  }

  if (
    t === ReadingQuestionType.MCQ_SINGLE ||
    t === ReadingQuestionType.MCQ_MULTIPLE ||
    t === ReadingQuestionType.TITLE_SUBTITLE_FINDING
  ) {
    return (
      <div className="space-y-2">
        {(options ?? []).map((o, i) =>
          o ? (
            <div
              key={i}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-white border border-gray-200"
            >
              <input
                type={
                  t === ReadingQuestionType.MCQ_MULTIPLE ? "checkbox" : "radio"
                }
                disabled
                className="pointer-events-none"
              />
              <span className="font-mono text-xs text-gray-500">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-sm text-gray-800">{o}</span>
            </div>
          ) : null,
        )}
      </div>
    );
  }

  if (
    t === ReadingQuestionType.NOTE_COMPLETION ||
    (t === ReadingQuestionType.SHORT_ANSWER && (options?.length ?? 0) > 0)
  ) {
    const n = countNoteCompletionGaps(options ?? []);
    return (
      <NoteCompletionGaps
        lines={options ?? []}
        answer={new Array(n).fill("")}
        onChange={() => {}}
        firstQuestionNumber={q.orderNumber}
        readOnly
        lineTextClassName="text-sm text-gray-800"
      />
    );
  }

  if (
    t === ReadingQuestionType.SUMMARY_COMPLETION &&
    countNoteCompletionGaps(options ?? []) > 0
  ) {
    const n = countNoteCompletionGaps(options ?? []);
    return (
      <div className="space-y-3">
        {(wordBank?.filter((word) => word.trim()).length ?? 0) > 0 && (
          <div className="rounded-sm bg-gray-100 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
              Clue list
            </p>
            <div className="flex flex-wrap gap-2">
              {wordBank
                ?.filter((word) => word.trim())
                .map((word, index) => (
                  <span
                    key={`${word}-${index}`}
                    className="rounded-sm border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-900"
                  >
                    <strong className="mr-1">
                      {String.fromCharCode(65 + index)}
                    </strong>
                    {word}
                  </span>
                ))}
            </div>
          </div>
        )}
        <NoteCompletionGaps
          lines={options ?? []}
          answer={new Array(n).fill("")}
          onChange={() => {}}
          firstQuestionNumber={q.orderNumber}
          readOnly
          showBullet={false}
          appearance="summary"
          lineTextClassName="text-sm text-gray-800"
          emptyLinePlaceholder="Summary paragraph…"
        />
      </div>
    );
  }

  if (
    t === ReadingQuestionType.FLOWCHART_COMPLETION &&
    countFlowchartGapTokens(options ?? []) > 0
  ) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-gray-500">Flowchart (preview)</p>
        <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-1">
          {(options ?? []).map((row, ri) => (
            <div key={ri}>
              {ri > 0 && (
                <div className="text-center text-gray-500 text-sm py-0.5">↓</div>
              )}
              <div className="text-sm text-gray-800 text-center flex flex-wrap justify-center gap-1">
                {(row ?? "").split(FLOWCHART_GAP_TOKEN).map((part, pi) => {
                  const parts = (row ?? "").split(FLOWCHART_GAP_TOKEN);
                  const gapNum =
                    previewFlowchartGapsBeforeRow(options ?? [], ri) + pi + 1;
                  return (
                    <React.Fragment key={pi}>
                      {part ? <span>{part}</span> : null}
                      {pi < parts.length - 1 ? (
                        <span className="inline-block min-w-[3rem] rounded border-2 border-dashed border-rose-300 bg-rose-50 px-2 py-0.5 text-xs text-rose-800 tabular-nums">
                          ({gapNum})
                        </span>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (
    t === ReadingQuestionType.TABLE_COMPLETION &&
    countTableGapTokens(options ?? []) > 0
  ) {
    const parsed = parseTableOptions(options ?? []);
    if (!parsed?.bodyRows.length) return null;
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
    return (
      <div className="space-y-2">
        <p className="text-xs text-gray-500">Table completion (preview)</p>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white text-xs">
          <table className="w-full border-collapse text-gray-800">
            <thead>
              <tr className="border-b-2 border-gray-200 bg-gray-50">
                {paddedHeaders.map((h, i) => (
                  <th
                    key={i}
                    className="px-2 py-2 text-left font-bold border-r border-gray-200 last:border-r-0"
                  >
                    {h || "—"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paddedBody.map((cells, ri) => (
                <tr key={ri} className="border-b border-gray-100 last:border-b-0">
                  {cells.map((_, ci) => {
                    const rawCell = bodyRows[ri]?.[ci] ?? "";
                    const parts = rawCell.split(FLOWCHART_GAP_TOKEN);
                    return (
                      <td
                        key={ci}
                        className="px-2 py-2 align-top border-r border-gray-100 last:border-r-0"
                      >
                        <div className="flex flex-wrap items-center gap-1">
                          {parts.map((part, pi) => (
                            <React.Fragment key={pi}>
                              {part ? <span>{part}</span> : null}
                              {pi < parts.length - 1 ? (
                                <span className="inline-flex rounded border-2 border-dashed border-rose-300 bg-rose-50 text-rose-900">
                                  <span className="shrink-0 border-r border-rose-200 px-1.5 py-0.5 font-bold tabular-nums">
                                    {1 +
                                      tableGapIndexBefore(
                                        bodyRows,
                                        ri,
                                        ci,
                                        pi,
                                      )}
                                  </span>
                                  <span className="px-2 py-0.5 text-gray-500">
                                    …
                                  </span>
                                </span>
                              ) : null}
                            </React.Fragment>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (
    t === ReadingQuestionType.DRAG_AND_DROP &&
    wordBank &&
    wordBank.length > 0
  ) {
    return (
      <div>
        <p className="text-xs text-gray-500 mb-2">Word Bank:</p>
        <div className="flex flex-wrap gap-2">
          {wordBank.map((w, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm text-gray-700 cursor-pointer hover:bg-primary-50"
            >
              {w}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (
    t === ReadingQuestionType.MATCHING_SENTENCE_ENDINGS &&
    wordBank &&
    wordBank.length > 0
  ) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-gray-500">Stems + gaps (preview)</p>
        {(options ?? []).map((stem, i) => (
          <div
            key={i}
            className="flex flex-wrap items-center gap-2 text-sm text-gray-800"
          >
            <span className="flex-1 min-w-0">{stem || "—"}</span>
            <span className="shrink-0 w-9 h-9 flex items-center justify-center rounded border-2 border-dashed border-rose-300 bg-rose-50 text-xs font-semibold text-rose-700">
              {i + 1}
            </span>
          </div>
        ))}
        <p className="text-xs text-gray-500 pt-1">Ending bank</p>
        <div className="rounded-lg border border-dashed border-rose-200 bg-rose-50/50 p-2 space-y-1.5">
          {wordBank.map((w, i) =>
            w ? (
              <div key={i} className="flex gap-2 text-xs text-gray-800">
                <span className="font-bold text-rose-800 w-5 shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{w}</span>
              </div>
            ) : null,
          )}
        </div>
      </div>
    );
  }

  if (t === ReadingQuestionType.MATCHING_INFORMATION) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-gray-500">Information matching (preview)</p>
        <MatchingInformationGrid
          questionId="preview"
          statements={options ?? []}
          columnLabels={wordBank ?? []}
          answer={[]}
          onChange={() => {}}
          firstQuestionNumber={1}
          readOnly
        />
      </div>
    );
  }

  if (t === ReadingQuestionType.MATCHING_FEATURES) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-gray-500">Statement matching (preview)</p>
        <StatementMatchingPanel
          questionId="preview"
          statements={options ?? []}
          wordBank={wordBank ?? []}
          answer={[]}
          onChange={() => {}}
          firstQuestionNumber={1}
          readOnly
        />
      </div>
    );
  }

  if (t === ReadingQuestionType.LIST_MATCHING) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-gray-500">List matching (preview)</p>
        <ListMatchingPanel
          questionId="preview"
          purposes={options ?? []}
          wordBank={wordBank ?? []}
          bankTitle={questionText ?? ""}
          answer={[]}
          onChange={() => {}}
          firstQuestionNumber={1}
          readOnly
        />
      </div>
    );
  }

  if (t === ReadingQuestionType.CLASSIFICATION) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-gray-500">Classification (preview)</p>
        <ListMatchingPanel
          questionId="preview"
          purposes={options ?? []}
          wordBank={wordBank ?? []}
          bankTitle={questionText ?? ""}
          answer={[]}
          onChange={() => {}}
          firstQuestionNumber={1}
          readOnly
          visualVariant="classification"
        />
      </div>
    );
  }

  if (t === ReadingQuestionType.DIAGRAM_LABEL_COMPLETION) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-gray-500">Diagram label completion (preview)</p>
        <DiagramLabelCompletionPanel
          questionId="preview"
          bankTitle={questionText ?? ""}
          gapHints={options ?? []}
          wordBank={wordBank ?? []}
          answer={[]}
          onChange={() => {}}
          firstQuestionNumber={1}
          readOnly
        />
      </div>
    );
  }

  if (
    [
      ReadingQuestionType.MATCHING_HEADINGS,
      ReadingQuestionType.MATCHING_SENTENCE_ENDINGS,
    ].includes(t)
  ) {
    return (
      <div className="space-y-2">
        {(options ?? []).map((o, i) =>
          o ? (
            <div
              key={i}
              className="flex items-center gap-3 p-2 rounded-lg bg-white border border-gray-200"
            >
              <span className="font-mono text-xs font-bold text-gray-500 w-5">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-sm text-gray-800 flex-1">{o}</span>
              <select
                disabled
                className="rounded border border-gray-200 text-xs px-1"
              >
                <option>– Select –</option>
              </select>
            </div>
          ) : null,
        )}
      </div>
    );
  }

  // Fill / sentence / summary / short etc
  return (
    <input
      type="text"
      disabled
      placeholder="Type your answer here..."
      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-400"
    />
  );
};

export default AdminReadingPreview;
