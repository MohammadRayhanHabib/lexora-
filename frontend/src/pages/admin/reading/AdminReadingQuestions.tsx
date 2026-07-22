import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiChevronUp,
  FiChevronDown,
  FiEye,
  FiX,
  FiCheck,
} from "react-icons/fi";
import {
  readingApi,
  IReadingTest,
  IReadingQuestion,
  ReadingQuestionType,
  QUESTION_TYPE_LABELS,
} from "../../../api/reading";
import Button from "../../../components/ui/Button";
import Card, { CardBody } from "../../../components/ui/Card";
import { PageLoader } from "../../../components/ui/Spinner";
import { ReadingQuestionFormFields } from "./ReadingQuestionFormFields";

// ─── Blank question form ─────────────────────────────────
const blankForm = (): Partial<IReadingQuestion> => ({
  questionType: ReadingQuestionType.MCQ_SINGLE,
  instructions: "",
  questionText: "",
  options: ["", "", "", ""],
  wordBank: [],
  correctAnswer: "",
  orderNumber: 1,
  groupLabel: "",
  pageNumber: 1,
  marks: 1,
  explanation: "",
});

// ─────────────────────────────────────────────────────────
const AdminReadingQuestions: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  const [test, setTest] = useState<IReadingTest | null>(null);
  const [questions, setQuestions] = useState<IReadingQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<IReadingQuestion>>(blankForm());
  /** Bulk-add mode: multiple drafts for one new page */
  const [createDrafts, setCreateDrafts] = useState<Partial<IReadingQuestion>[]>(
    [],
  );
  const [batchPageNumber, setBatchPageNumber] = useState(1);
  const [batchGroupLabel, setBatchGroupLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    if (!testId) return;
    setLoading(true);
    readingApi
      .adminGetTest(testId)
      .then((r) => {
        setTest(r.data.data?.test ?? null);
        setQuestions(r.data.data?.questions ?? []);
      })
      .catch(() => toast.error("Failed to load test data"))
      .finally(() => setLoading(false));
  }, [testId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Form helpers ───────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    // Each "Add question" opens a NEW page (next page number).
    const maxPage =
      questions.length > 0
        ? Math.max(...questions.map((q) => q.pageNumber ?? 1))
        : 0;
    const nextPage = maxPage + 1;
    setBatchPageNumber(nextPage);
    setBatchGroupLabel("");
    setCreateDrafts([
      {
        ...blankForm(),
        pageNumber: nextPage,
        orderNumber: questions.length + 1,
      },
    ]);
    setForm(blankForm());
    setShowForm(true);
  };

  const openEdit = (q: IReadingQuestion) => {
    setEditingId(q._id);
    setCreateDrafts([]);
    setForm({
      questionType: q.questionType,
      instructions: q.instructions ?? "",
      questionText: q.questionText,
      options: q.options ?? ["", "", "", ""],
      wordBank: q.wordBank ?? [],
      correctAnswer: q.correctAnswer,
      orderNumber: q.orderNumber,
      groupLabel: q.groupLabel ?? "",
      pageNumber: q.pageNumber ?? 1,
      marks: q.marks,
      explanation: q.explanation ?? "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(blankForm());
    setCreateDrafts([]);
    setBatchGroupLabel("");
  };

  const isCorrectAnswerEmpty = (answer: unknown) => {
    if (answer === undefined || answer === null) return true;
    if (Array.isArray(answer)) {
      if (answer.length === 0) return true;
      // Matching / MCQ-multiple etc.: ["", "", ""] still means "no answer chosen"
      return !answer.some((entry) => {
        if (entry === undefined || entry === null) return false;
        return String(entry).trim().length > 0;
      });
    }
    return !String(answer).trim();
  };

  const patchDraft = (idx: number, patch: Partial<IReadingQuestion>) => {
    setCreateDrafts((prev) =>
      prev.map((row, j) => (j === idx ? { ...row, ...patch } : row)),
    );
  };

  const addDraftRow = () => {
    setCreateDrafts((prev) => [...prev, { ...blankForm(), marks: 1 }]);
  };

  const removeDraftRow = (idx: number) => {
    setCreateDrafts((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, j) => j !== idx);
    });
  };

  // ── Save question(s) ──────────────────────────────────

  const handleSave = async () => {
    if (editingId) {
      if (!form.questionText?.trim()) {
        toast.error("Question text is required");
        return;
      }
      if (isCorrectAnswerEmpty(form.correctAnswer)) {
        toast.error("Correct answer is required");
        return;
      }

      setSaving(true);
      try {
        await readingApi.adminUpdateQuestion(editingId, form);
        toast.success("Question updated");
        closeForm();
        fetchData();
      } catch (err: any) {
        toast.error(err?.response?.data?.message || "Failed to save question");
      } finally {
        setSaving(false);
      }
      return;
    }

    const rowsToSave: Partial<IReadingQuestion>[] = [];
    for (let i = 0; i < createDrafts.length; i++) {
      const d = createDrafts[i];
      const hasText = !!d.questionText?.trim();
      const emptyAns = isCorrectAnswerEmpty(d.correctAnswer);
      if (!hasText && emptyAns) continue;
      if (!hasText || emptyAns) {
        const missing: string[] = [];
        if (!hasText) missing.push("question text");
        if (emptyAns) missing.push("correct answer");
        toast.error(
          `Question ${i + 1}: add ${missing.join(" and ")}, or remove this empty block.`,
        );
        return;
      }
      rowsToSave.push(d);
    }

    if (rowsToSave.length === 0) {
      toast.error("Add at least one complete question for this page");
      return;
    }

    setSaving(true);
    let order = questions.length + 1;
    const gl = batchGroupLabel.trim();
    try {
      for (const draft of rowsToSave) {
        await readingApi.adminCreateQuestion(testId!, {
          ...draft,
          pageNumber: batchPageNumber,
          groupLabel: gl || undefined,
          orderNumber: order++,
          marks: draft.marks ?? 1,
        });
      }
      toast.success(
        `${rowsToSave.length} question${rowsToSave.length !== 1 ? "s" : ""} added (page ${batchPageNumber})`,
      );
      closeForm();
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save questions");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete question ────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this question?")) return;
    setDeletingId(id);
    try {
      await readingApi.adminDeleteQuestion(id);
      toast.success("Question deleted");
      fetchData();
    } catch {
      toast.error("Failed to delete question");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Reorder helpers ────────────────────────────────────

  const move = async (qId: string, dir: "up" | "down") => {
    const idx = questions.findIndex((q) => q._id === qId);
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === questions.length - 1) return;
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    const updated = [...questions];
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
    const order = updated.map((q, i) => ({ id: q._id, orderNumber: i + 1 }));
    try {
      await readingApi.adminReorderQuestions(testId!, order);
      fetchData();
    } catch {
      toast.error("Failed to reorder");
    }
  };

  // ── Build page groups for list display ────────────────

  const pageGroups: { pageNum: number; qs: IReadingQuestion[] }[] =
    (() => {
      const map = new Map<number, IReadingQuestion[]>();
      questions.forEach((q) => {
        const p = q.pageNumber ?? 1;
        if (!map.has(p)) map.set(p, []);
        map.get(p)!.push(q);
      });
      return Array.from(map.entries())
        .sort(([a], [b]) => a - b)
        .map(([pageNum, qs]) => ({ pageNum, qs }));
    })();

  // ── Render ─────────────────────────────────────────────

  if (loading) return <PageLoader />;

  return (
    <>
      <Helmet>
        <title>Question Manager – {test?.title} – Lexora</title>
      </Helmet>

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/reading")}
            >
              <FiArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">
                {test?.title}
              </h1>
              <p className="text-sm text-gray-500">
                {questions.length} question{questions.length !== 1 ? "s" : ""} ·{" "}
                {test?.duration} min
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/admin/reading/${testId}/preview`)}
              className="gap-2"
            >
              <FiEye className="w-4 h-4" />
              Preview
            </Button>
            <Button size="sm" className="gap-2" onClick={openCreate}>
              <FiPlus className="w-4 h-4" />
              Add Question
            </Button>
          </div>
        </div>

        {/* Question list — grouped by page */}
        {questions.length === 0 ? (
          <Card>
            <CardBody className="text-center py-12">
              <p className="text-gray-500">
                No questions yet. Use Add Question to create your first page of
                questions.
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-6">
            {pageGroups.map(({ pageNum, qs }) => (
              <div key={pageNum}>
                {/* Page header */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-bold shrink-0">
                    {pageNum}
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Page {pageNum} · {qs.length} question
                    {qs.length !== 1 ? "s" : ""}
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Questions in this page */}
                <div className="space-y-2">
                  {qs.map((q) => {
                    const globalIdx = questions.findIndex(
                      (x) => x._id === q._id,
                    );
                    return (
                      <Card key={q._id} className="group">
                        <CardBody className="flex items-start gap-4 py-4">
                          {/* Order controls */}
                          <div className="flex flex-col items-center gap-0.5 pt-0.5">
                            <span className="text-2xl font-bold text-gray-200 leading-none">
                              {globalIdx + 1}
                            </span>
                            <button
                              onClick={() => move(q._id, "up")}
                              disabled={globalIdx === 0}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              <FiChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => move(q._id, "down")}
                              disabled={globalIdx === questions.length - 1}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              <FiChevronDown className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs font-medium bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                                {QUESTION_TYPE_LABELS[q.questionType]}
                              </span>
                              {q.groupLabel && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                  {q.groupLabel}
                                </span>
                              )}
                              <span className="text-xs text-gray-400">
                                {q.marks} mark{q.marks !== 1 ? "s" : ""}
                              </span>
                            </div>
                            {q.instructions && (
                              <p className="text-xs text-gray-500 italic mb-1">
                                {q.instructions}
                              </p>
                            )}
                            <p className="text-sm text-gray-800 font-medium line-clamp-2">
                              {q.questionText}
                            </p>
                            {q.options && q.options.length > 0 && (
                              <p className="text-xs text-gray-400 mt-1">
                                {q.options.slice(0, 4).join(" · ")}
                                {q.options.length > 4
                                  ? ` · +${q.options.length - 4} more`
                                  : ""}
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(q)}
                            >
                              <FiEdit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:bg-red-50"
                              loading={deletingId === q._id}
                              onClick={() => handleDelete(q._id)}
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardBody>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Question Form Modal ──────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto p-4">
          <div
            className={`bg-white rounded-xl shadow-2xl w-full my-8 ${
              editingId ? "max-w-2xl" : "max-w-3xl"
            }`}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingId
                    ? "Edit question"
                    : `Add questions — page ${batchPageNumber}`}
                </h2>
                {!editingId && (
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Each time you open Add Question, a new page is created. Add
                    several question blocks below, then save once. Students
                    answer them on one scrolling screen for this page.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="text-gray-400 hover:text-gray-600 shrink-0"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[80vh] overflow-y-auto">
              {editingId ? (
                <ReadingQuestionFormFields
                  value={form}
                  onPatch={(p) =>
                    setForm((prev) => ({ ...prev, ...p }))
                  }
                  fieldInstanceId="edit"
                  showPlacementFields
                />
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 rounded-lg border border-primary-100 bg-primary-50/40 p-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Page #
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={batchPageNumber}
                        onChange={(e) =>
                          setBatchPageNumber(
                            parseInt(e.target.value, 10) || 1,
                          )
                        }
                        className="block w-full rounded-lg border border-primary-300 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Usually leave as shown. All blocks below share this
                        page.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Section heading (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Questions 1–6 · True / False / Not Given"
                        value={batchGroupLabel}
                        onChange={(e) => setBatchGroupLabel(e.target.value)}
                        className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Shown once above this group on the student test.
                      </p>
                    </div>
                  </div>

                  {createDrafts.map((draft, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 sm:p-5"
                    >
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <span className="text-sm font-bold text-gray-800">
                          Question {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeDraftRow(idx)}
                          disabled={createDrafts.length <= 1}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:hover:bg-white"
                          title="Remove this block"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      </div>
                      <ReadingQuestionFormFields
                        value={draft}
                        onPatch={(p) => patchDraft(idx, p)}
                        fieldInstanceId={`draft-${idx}`}
                        showPlacementFields={false}
                      />
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addDraftRow}
                    className="inline-flex items-center gap-2 rounded-lg border-2 border-dashed border-primary-300 bg-white px-4 py-3 text-sm font-semibold text-primary-700 hover:bg-primary-50 w-full justify-center transition-colors"
                  >
                    <FiPlus className="w-4 h-4" />
                    Add another question to this page
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <Button variant="secondary" onClick={closeForm}>
                Cancel
              </Button>
              <Button loading={saving} onClick={handleSave} className="gap-2">
                <FiCheck className="w-4 h-4" />
                {editingId ? "Update question" : "Save all on this page"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminReadingQuestions;
