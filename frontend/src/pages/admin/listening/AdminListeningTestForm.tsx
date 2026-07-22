import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiPlus,
  FiTrash2,
  FiSave,
  FiUpload,
  FiVolume2,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import {
  adminGetListeningTest,
  adminCreateListeningTest,
  adminUpdateListeningTest,
  adminUploadListeningMapImage,
} from "../../../api/listening";
import {
  FLOWCHART_GAP_TOKEN,
  countTableGapTokens,
  countFlowchartGapTokens,
  countListeningNoteGaps,
} from "../../../api/reading";
import { ListeningQuestionType } from "../../../types";
import Button from "../../../components/ui/Button";
import Card, { CardBody } from "../../../components/ui/Card";
import { PageLoader } from "../../../components/ui/Spinner";

/* ---------- Types ---------- */
interface QuestionDraft {
  questionId: string;
  type: ListeningQuestionType;
  text: string;
  options: string[];
  /** FLOWCHART_COMPLETION: pool words (distractors allowed) */
  wordBank?: string[];
  correctAnswer: string;
  points: number;
  /** MULTIPLE_CHOICE_MULTIPLE: how many letters the student must pick */
  selectCount?: number;
  /** MATCHING (box): stems = first N options */
  matchStemCount?: number;
  mapImageUrl?: string;
  mapChoiceCount?: number;
}

function multiMcqK(q: Pick<QuestionDraft, "selectCount">): number {
  const n = q.selectCount;
  if (typeof n === "number" && n >= 1 && n <= 20) return Math.floor(n);
  return 2;
}

/** Match backend `normalizeLetterChoiceList` for authoring / save. */
function parseMultiMcqLetters(raw: string, count: number): string[] {
  let arr: string[] = [];
  const s = raw.trim();
  if (s.startsWith("[")) {
    try {
      const p = JSON.parse(s);
      if (Array.isArray(p))
        arr = p.map((x) => String(x ?? "").trim().toUpperCase());
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

function matchStemCountAdmin(q: QuestionDraft): number {
  if (q.type !== ListeningQuestionType.MATCHING) return 0;
  const n = q.matchStemCount;
  if (typeof n === "number" && n >= 1 && n <= 30) return Math.floor(n);
  return 0;
}

function isBoxMatchingAdmin(q: QuestionDraft): boolean {
  const s = matchStemCountAdmin(q);
  return s >= 1 && q.options.length > s;
}

/** One letter per stem, in order (not sorted). Accepts `|` or `,` between letters. */
function parseMatchingRowLetters(raw: string, stemCount: number): string[] {
  const s = raw.trim();
  const parts = s
    ? s.split(/[|,]/).map((x) => x.trim().toUpperCase())
    : [];
  while (parts.length < stemCount) parts.push("");
  return parts.slice(0, stemCount).map((p) => {
    const c = p.charAt(0);
    return /^[A-Z]$/.test(c) ? c : "";
  });
}

function mapChoiceCountAdmin(q: QuestionDraft): number {
  if (q.type !== ListeningQuestionType.MAP_LABELING) return 8;
  const n = q.mapChoiceCount;
  if (typeof n === "number" && n >= 2 && n <= 20) return Math.floor(n);
  return 8;
}

/** Map image set + one or more location rows (every row must have label text). */
function isMapLabelAdmin(q: QuestionDraft): boolean {
  if (q.type !== ListeningQuestionType.MAP_LABELING) return false;
  if (!q.mapImageUrl?.trim()) return false;
  const opts = q.options ?? [];
  if (opts.length < 1) return false;
  return opts.every((o) => String(o ?? "").trim().length > 0);
}

/** First validation problem for this draft, or null if OK. */
function listeningQuestionValidationError(q: QuestionDraft): string | null {
  if (q.type === ListeningQuestionType.TABLE_COMPLETION) {
    const gaps = countTableGapTokens(q.options);
    if (gaps < 1) {
      return "Table completion needs at least one gap ([[GAP]]) in the table rows.";
    }
    const parts = q.correctAnswer
      .split("|")
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
    if (parts.length < gaps) {
      return `Table completion needs one non-empty answer per gap (${gaps}), separated by |.`;
    }
    return null;
  }
  if (q.type === ListeningQuestionType.FLOWCHART_COMPLETION) {
    const gaps = countFlowchartGapTokens(q.options);
    if (gaps < 1) {
      return "Flow chart completion needs at least one [[GAP]] in the flow steps.";
    }
    if (!q.text.trim()) {
      return "Flow chart: add instructions or the chart title in the question prompt.";
    }
    const bank = (q.wordBank ?? []).filter((w) => String(w).trim().length > 0);
    if (bank.length < 1) {
      return "Flow chart: add at least one word in the answer pool (word bank).";
    }
    const parts = q.correctAnswer
      .split("|")
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
    if (parts.length < gaps) {
      return `Flow chart: enter ${gaps} correct answers (one per gap, in order), separated by |.`;
    }
    return null;
  }
  if (q.type === ListeningQuestionType.NOTE_COMPLETION) {
    const gaps = countListeningNoteGaps(q.options);
    if (gaps < 1) {
      return "Note completion needs at least one [[GAP]] in a non-heading line (lines starting with # are headings only).";
    }
    if (!q.text.trim()) {
      return "Note completion: add the task title in the question prompt (shown above the notes).";
    }
    const parts = q.correctAnswer
      .split("|")
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
    if (parts.length < gaps) {
      return `Note completion: enter ${gaps} correct answers (one per gap, in order), separated by |.`;
    }
    return null;
  }
  if (q.type === ListeningQuestionType.MULTIPLE_CHOICE_MULTIPLE) {
    if (!q.text.trim()) {
      return "Multi-select MCQ needs question prompt text.";
    }
    const k = multiMcqK(q);
    const nOpts = q.options.filter((o) => o.trim().length > 0).length;
    if (nOpts < 2 || k > nOpts) {
      return "Multi-select MCQ needs at least two options and “how many to choose” not larger than the option count.";
    }
    const letters = parseMultiMcqLetters(q.correctAnswer, k);
    if (letters.some((c) => !c)) {
      return `Multi-select MCQ needs ${k} correct letters (e.g. A, C).`;
    }
    const maxCode = 65 + nOpts - 1;
    if (letters.some((c) => c.charCodeAt(0) > maxCode)) {
      return "Multi-select MCQ: each correct letter must match an option (A…).";
    }
    return null;
  }
  if (q.type === ListeningQuestionType.MATCHING && isBoxMatchingAdmin(q)) {
    if (!q.text.trim()) {
      return "Matching (IELTS box) needs question prompt text above the options.";
    }
    const stems = matchStemCountAdmin(q);
    const poolOpts = q.options.slice(stems);
    const poolLetters = poolOpts.filter((o) => o.trim().length > 0).length;
    if (poolLetters < 1) {
      return "Matching (IELTS box): add at least one answer in the pool (rows after the stems), each with text.";
    }
    if (
      q.options.slice(0, stems).filter((o) => o.trim().length > 0).length <
      stems
    ) {
      return "Matching (IELTS box): every stem row (left column) needs text.";
    }
    const letters = parseMatchingRowLetters(q.correctAnswer, stems);
    if (letters.some((c) => !c)) {
      return `Matching (IELTS box): correct answer must be ${stems} letters (one per stem), separated by | or commas (e.g. A | B | C or A,B,C).`;
    }
    const maxLetterCode = 65 + poolLetters - 1;
    if (letters.some((c) => c.charCodeAt(0) > maxLetterCode)) {
      return `Matching (IELTS box): each letter must be within the pool (A–${String.fromCharCode(maxLetterCode)}).`;
    }
    return null;
  }
  if (q.type === ListeningQuestionType.MAP_LABELING) {
    const hasMapImage = Boolean(q.mapImageUrl?.trim());
    if (hasMapImage) {
      if (!isMapLabelAdmin(q)) {
        return "Map labelling needs a map image URL and a non-empty label on every location row.";
      }
      if (!q.text.trim()) {
        return "Map labelling needs question prompt text.";
      }
      const rows = q.options.length;
      const letters = parseMatchingRowLetters(q.correctAnswer, rows);
      if (letters.some((c) => !c)) {
        return `Map labelling needs ${rows} correct letters (one per row), separated by | or commas.`;
      }
      const ch = mapChoiceCountAdmin(q);
      if (letters.some((c) => c.charCodeAt(0) > 64 + ch)) {
        return `Map labelling: each letter must be within columns A–${String.fromCharCode(64 + ch)}.`;
      }
      return null;
    }
    if (!q.text.trim() || !q.correctAnswer.trim()) {
      return "Add question prompt and correct answer (or add a map image for full map mode).";
    }
    return null;
  }
  if (!q.text.trim() || !q.correctAnswer.trim()) {
    return "Add question prompt and correct answer.";
  }
  return null;
}

interface SectionDraft {
  title: string;
  instructions: string;
  questions: QuestionDraft[];
  collapsed: boolean;
}

/* ---------- Default factories ---------- */
const newQuestion = (): QuestionDraft => ({
  questionId: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  type: ListeningQuestionType.FILL_IN_BLANK,
  text: "",
  options: [],
  correctAnswer: "",
  points: 1,
});

const newSection = (): SectionDraft => ({
  title: "",
  instructions: "",
  questions: [newQuestion()],
  collapsed: false,
});

/* ---------- Question type options ---------- */
const QUESTION_TYPE_LABELS: Record<ListeningQuestionType, string> = {
  [ListeningQuestionType.MULTIPLE_CHOICE]: "Multiple Choice (one answer)",
  [ListeningQuestionType.MULTIPLE_CHOICE_MULTIPLE]:
    "Multiple Choice (choose N letters)",
  [ListeningQuestionType.FILL_IN_BLANK]: "Fill in the Blank",
  [ListeningQuestionType.MATCHING]: "Matching (IELTS box, letters)",
  [ListeningQuestionType.FORM_COMPLETION]: "Form Completion",
  [ListeningQuestionType.MAP_LABELING]: "Map labelling (image + grid)",
  [ListeningQuestionType.TABLE_COMPLETION]: "Table (fill in blanks)",
  [ListeningQuestionType.NOTE_COMPLETION]:
    "Note completion ([[GAP]] in lines; # for headings)",
  [ListeningQuestionType.FLOWCHART_COMPLETION]:
    "Flow chart completion ([[GAP]] + word bank)",
};

const DEFAULT_LISTENING_FLOWCHART = (): {
  options: string[];
  wordBank: string[];
  correctAnswer: string;
} => ({
  options: [
    "A spacecraft lands on a planet and sends out a rover.",
    `The rover is directed to a ${FLOWCHART_GAP_TOKEN} which has organic material.`,
    `It collects a sample from below the surface (in order to avoid the effects of ${FLOWCHART_GAP_TOKEN}).`,
    "The soil and rocks are checked to look for evidence of fossils.",
    "The sample is converted to powder.",
    `The sample is subjected to ${FLOWCHART_GAP_TOKEN}`,
    `A mass spectrometer is used to search for potential proof of life, e.g. ${FLOWCHART_GAP_TOKEN}`,
    `The ${FLOWCHART_GAP_TOKEN} are compared with existing data from Earth.`,
  ],
  wordBank: [
    "fossils",
    "contamination",
    "vehicle",
    "powder",
    "heat",
    "results",
    "radiation",
    "site",
    "microbes",
  ],
  correctAnswer: "site | radiation | heat | microbes | results",
});

const DEFAULT_TABLE_OPTIONS = (): string[] => [
  "Name of restaurant|||Location|||Reason for recommendation|||Other comments",
  `The Junction|||Greyson Street, near the station|||Good for people who are especially keen on ${FLOWCHART_GAP_TOKEN}|||Quite expensive. The ${FLOWCHART_GAP_TOKEN} a good place for a drink`,
  `Paloma|||In Bow Street next to the cinema|||${FLOWCHART_GAP_TOKEN} food, good for sharing|||Staff are very friendly. A limited selection of ${FLOWCHART_GAP_TOKEN} food on the menu`,
  `The ${FLOWCHART_GAP_TOKEN}|||At the top of ${FLOWCHART_GAP_TOKEN}|||A famous chef. All the ${FLOWCHART_GAP_TOKEN} are very good. Only uses ${FLOWCHART_GAP_TOKEN} ingredients.|||Set lunch costs £ ${FLOWCHART_GAP_TOKEN} per person. Portions probably of ${FLOWCHART_GAP_TOKEN} size.`,
];

const DEFAULT_LISTENING_NOTE_COMPLETION = (): {
  options: string[];
  correctAnswer: string;
} => ({
  options: [
    "# Items",
    "# Dining table",
    `${FLOWCHART_GAP_TOKEN} shape`,
    "medium size",
    `${FLOWCHART_GAP_TOKEN} old`,
    "£25.00",
    "# Dining chairs",
    `set of ${FLOWCHART_GAP_TOKEN} chairs`,
    `seats covered in ${FLOWCHART_GAP_TOKEN} material`,
    `in ${FLOWCHART_GAP_TOKEN} condition`,
    "£20.00",
    "# Desk",
    `length: ${FLOWCHART_GAP_TOKEN}`,
    `3 drawers. Top drawer has a ${FLOWCHART_GAP_TOKEN}`,
    "£50.00",
  ],
  correctAnswer: "round | oak | four | leather | good | 1.2m | lock",
});

/** Must match backend multer limit in `backend/src/utils/upload.ts`. */
const MAX_LISTENING_AUDIO_BYTES = 100 * 1024 * 1024;

/** User-facing message from an API / network error. */
function listeningSaveErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const ax = err as {
      response?: { status?: number; data?: { message?: string } };
      code?: string;
      message?: string;
    };
    if (ax.response?.status === 413) {
      return (
        "Upload too large for the server (HTTP 413). Use a smaller mp3 (under ~50 MB), " +
        "or raise client_max_body_size in nginx / Hostinger proxy settings (e.g. 110m), then redeploy."
      );
    }
    const apiMsg = ax.response?.data?.message;
    if (typeof apiMsg === "string" && apiMsg.trim()) return apiMsg.trim();
    if (ax.code === "ECONNABORTED") {
      return "Upload timed out. Try a smaller audio file or check your connection.";
    }
    if (!ax.response) {
      return ax.message?.trim() || "Network error — could not reach the server.";
    }
  }
  if (err instanceof Error && err.message.trim()) return err.message.trim();
  return fallback;
}

/* ---------- Component ---------- */
const AdminListeningTestForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const audioRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // Basic info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(40);
  const [allowReplay, setAllowReplay] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Audio
  const [existingAudioUrl, setExistingAudioUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [mapImageUploading, setMapImageUploading] = useState<
    Record<string, boolean>
  >({});
  /** IELTS box matching: which stem index is selected for “click pool letter” assign */
  const [listeningMatchActiveSlot, setListeningMatchActiveSlot] = useState<
    Record<string, number | null>
  >({});

  // Sections
  const [sections, setSections] = useState<SectionDraft[]>([newSection()]);

  /* ---- Load existing test for edit ---- */
  useEffect(() => {
    if (!id) return;
    adminGetListeningTest(id)
      .then((r) => {
        const t = r.data.data?.test ?? r.data.data;
        if (!t) return;
        setTitle(t.title ?? "");
        setDescription(t.description ?? "");
        setDuration(t.duration ?? 40);
        setAllowReplay(t.allowReplay ?? false);
        setIsActive(t.isActive ?? true);
        setExistingAudioUrl(t.audioUrl ?? null);
        setSections(
          (t.sections ?? []).map((s: any) => ({
            title: s.title ?? "",
            instructions: s.description ?? "",
            collapsed: false,
            questions: (s.questions ?? []).map((q: any) => {
              const qt = q.type ?? ListeningQuestionType.FILL_IN_BLANK;
              let correctAnswer: string;
              if (qt === ListeningQuestionType.MULTIPLE_CHOICE_MULTIPLE) {
                const ans = q.answer ?? q.correctAnswer;
                if (Array.isArray(ans)) {
                  correctAnswer = ans.join(", ");
                } else if (
                  typeof ans === "string" &&
                  ans.trim().startsWith("[")
                ) {
                  try {
                    const p = JSON.parse(ans);
                    correctAnswer = Array.isArray(p)
                      ? p.join(", ")
                      : String(ans ?? "");
                  } catch {
                    correctAnswer = String(ans ?? "");
                  }
                } else {
                  correctAnswer = String(ans ?? "");
                }
              } else if (
                qt === ListeningQuestionType.MATCHING &&
                typeof q.matchStemCount === "number" &&
                q.matchStemCount >= 1 &&
                (q.options?.length ?? 0) > q.matchStemCount
              ) {
                const ans = q.answer ?? q.correctAnswer;
                if (Array.isArray(ans)) {
                  correctAnswer = ans.join(" | ");
                } else if (
                  typeof ans === "string" &&
                  ans.trim().startsWith("[")
                ) {
                  try {
                    const p = JSON.parse(ans);
                    correctAnswer = Array.isArray(p)
                      ? p.map((x: unknown) => String(x ?? "").trim()).join(" | ")
                      : String(ans ?? "");
                  } catch {
                    correctAnswer = String(ans ?? "");
                  }
                } else {
                  correctAnswer = String(ans ?? "");
                }
              } else if (
                qt === ListeningQuestionType.MAP_LABELING &&
                String(q.mapImageUrl ?? "").trim() &&
                (q.options?.length ?? 0) >= 1
              ) {
                const ans = q.answer ?? q.correctAnswer;
                if (Array.isArray(ans)) {
                  correctAnswer = ans.join(" | ");
                } else if (
                  typeof ans === "string" &&
                  ans.trim().startsWith("[")
                ) {
                  try {
                    const p = JSON.parse(ans);
                    correctAnswer = Array.isArray(p)
                      ? p.map((x: unknown) => String(x ?? "").trim()).join(" | ")
                      : String(ans ?? "");
                  } catch {
                    correctAnswer = String(ans ?? "");
                  }
                } else {
                  correctAnswer = String(ans ?? "");
                }
              } else if (
                qt === ListeningQuestionType.FLOWCHART_COMPLETION ||
                qt === ListeningQuestionType.NOTE_COMPLETION
              ) {
                const ans = q.answer ?? q.correctAnswer;
                if (Array.isArray(ans)) {
                  correctAnswer = ans.join(" | ");
                } else if (
                  typeof ans === "string" &&
                  ans.trim().startsWith("[")
                ) {
                  try {
                    const p = JSON.parse(ans);
                    correctAnswer = Array.isArray(p)
                      ? p.map((x: unknown) => String(x ?? "").trim()).join(" | ")
                      : String(ans ?? "");
                  } catch {
                    correctAnswer = String(ans ?? "");
                  }
                } else {
                  correctAnswer = String(ans ?? "");
                }
              } else {
                correctAnswer = Array.isArray(q.answer)
                  ? (q.answer as string[]).join(" | ")
                  : (q.answer ?? q.correctAnswer ?? "");
              }
              return {
                questionId:
                  q.id ??
                  q.questionId ??
                  `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                type: qt,
                text: q.questionText ?? q.text ?? "",
                options: q.options ?? [],
                correctAnswer,
                points: q.points ?? 1,
                selectCount:
                  qt === ListeningQuestionType.MULTIPLE_CHOICE_MULTIPLE
                    ? (typeof q.selectCount === "number" ? q.selectCount : 2)
                    : undefined,
                matchStemCount:
                  qt === ListeningQuestionType.MATCHING &&
                  typeof q.matchStemCount === "number"
                    ? q.matchStemCount
                    : undefined,
                mapImageUrl:
                  qt === ListeningQuestionType.MAP_LABELING
                    ? (q.mapImageUrl ?? "")
                    : undefined,
                mapChoiceCount:
                  qt === ListeningQuestionType.MAP_LABELING &&
                  typeof q.mapChoiceCount === "number"
                    ? q.mapChoiceCount
                    : undefined,
                wordBank:
                  qt === ListeningQuestionType.FLOWCHART_COMPLETION &&
                  Array.isArray(q.wordBank)
                    ? (q.wordBank as unknown[]).map((x) => String(x ?? ""))
                    : qt === ListeningQuestionType.FLOWCHART_COMPLETION
                      ? []
                      : undefined,
              };
            }),
          })),
        );
      })
      .catch(() => toast.error("Failed to load test"))
      .finally(() => setLoading(false));
  }, [id]);

  /* ---- Section helpers ---- */
  const updateSection = (idx: number, patch: Partial<SectionDraft>) => {
    setSections((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    );
  };

  const addSection = () => setSections((prev) => [...prev, newSection()]);
  const removeSection = (idx: number) =>
    setSections((prev) => prev.filter((_, i) => i !== idx));
  const toggleSection = (idx: number) =>
    updateSection(idx, { collapsed: !sections[idx].collapsed });

  /* ---- Question helpers ---- */
  const updateQuestion = (
    sIdx: number,
    qIdx: number,
    patch: Partial<QuestionDraft>,
  ) => {
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== sIdx) return s;
        return {
          ...s,
          questions: s.questions.map((q, j) =>
            j === qIdx ? { ...q, ...patch } : q,
          ),
        };
      }),
    );
  };

  const addQuestion = (sIdx: number) => {
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== sIdx) return s;
        return { ...s, questions: [...s.questions, newQuestion()] };
      }),
    );
  };

  const removeQuestion = (sIdx: number, qIdx: number) => {
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== sIdx) return s;
        return { ...s, questions: s.questions.filter((_, j) => j !== qIdx) };
      }),
    );
  };

  const updateOption = (
    sIdx: number,
    qIdx: number,
    optIdx: number,
    value: string,
  ) => {
    const q = sections[sIdx].questions[qIdx];
    const newOpts = [...q.options];
    newOpts[optIdx] = value;
    updateQuestion(sIdx, qIdx, { options: newOpts });
  };

  const addOption = (sIdx: number, qIdx: number) => {
    const q = sections[sIdx].questions[qIdx];
    updateQuestion(sIdx, qIdx, { options: [...q.options, ""] });
  };

  const removeOption = (sIdx: number, qIdx: number, optIdx: number) => {
    const q = sections[sIdx].questions[qIdx];
    updateQuestion(sIdx, qIdx, {
      options: q.options.filter((_, i) => i !== optIdx),
    });
  };

  const listeningMatchQKey = (sIdx: number, qIdx: number) => `${sIdx}-${qIdx}`;

  const updateListeningMatchStemLetter = (
    sIdx: number,
    qIdx: number,
    stemIdx: number,
    letter: string,
  ) => {
    const q = sections[sIdx].questions[qIdx];
    const stems = matchStemCountAdmin(q);
    const parts = parseMatchingRowLetters(q.correctAnswer, stems);
    const L = letter.replace(/[^A-Z]/gi, "").charAt(0).toUpperCase();
    parts[stemIdx] = /^[A-Z]$/.test(L) ? L : "";
    updateQuestion(sIdx, qIdx, { correctAnswer: parts.join(" | ") });
  };

  const assignListeningPoolLetterToActiveStem = (
    sIdx: number,
    qIdx: number,
    letter: string,
  ) => {
    const q = sections[sIdx].questions[qIdx];
    const stems = matchStemCountAdmin(q);
    const slot = listeningMatchActiveSlot[listeningMatchQKey(sIdx, qIdx)];
    if (slot == null || slot < 0 || slot >= stems) {
      toast.error(
        "Click a stem row on the left first, then click a letter in the pool.",
      );
      return;
    }
    updateListeningMatchStemLetter(sIdx, qIdx, slot, letter);
  };

  const removeListeningMatchBoxOption = (
    sIdx: number,
    qIdx: number,
    optIdx: number,
  ) => {
    const q = sections[sIdx].questions[qIdx];
    const stems = matchStemCountAdmin(q);
    if (optIdx < stems) {
      if (stems <= 1) return;
      const newStems = stems - 1;
      const newOpts = q.options.filter((_, i) => i !== optIdx);
      const parts = parseMatchingRowLetters(q.correctAnswer, stems);
      parts.splice(optIdx, 1);
      updateQuestion(sIdx, qIdx, {
        matchStemCount: newStems,
        options: newOpts,
        correctAnswer: parts.join(" | "),
      });
    } else {
      removeOption(sIdx, qIdx, optIdx);
    }
  };

  const handleMapImageUpload = async (
    sIdx: number,
    qIdx: number,
    file: File,
  ) => {
    const key = `${sIdx}-${qIdx}`;
    setMapImageUploading((prev) => ({ ...prev, [key]: true }));
    try {
      const { data: body } = await adminUploadListeningMapImage(file);
      const url = (body as { data?: { url?: string } })?.data?.url;
      if (!url || typeof url !== "string") {
        throw new Error("Upload did not return a URL");
      }
      updateQuestion(sIdx, qIdx, { mapImageUrl: url });
      toast.success("Map image uploaded to storage");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? (err as Error)?.message ?? "Upload failed";
      toast.error(String(msg));
    } finally {
      setMapImageUploading((prev) => ({ ...prev, [key]: false }));
    }
  };

  /* ---- Submit ---- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required");
    if (sections.some((s) => !s.title.trim()))
      return toast.error("All sections must have a title");
    for (let si = 0; si < sections.length; si++) {
      const s = sections[si];
      for (let qi = 0; qi < s.questions.length; qi++) {
        const err = listeningQuestionValidationError(s.questions[qi]);
        if (err) {
          toast.error(`${err} (Section ${si + 1}, Q${qi + 1})`);
          return;
        }
      }
    }

    if (!isEdit && !audioFile) {
      toast.error("Upload an audio file before creating the test.");
      return;
    }
    if (isEdit && !audioFile && !existingAudioUrl) {
      toast.error("This test has no audio file. Upload one before saving.");
      return;
    }
    if (audioFile && audioFile.size > MAX_LISTENING_AUDIO_BYTES) {
      toast.error(
        `Audio file is too large (${(audioFile.size / 1024 / 1024).toFixed(1)} MB). Maximum is 100 MB.`,
      );
      return;
    }

    setSaving(true);
    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("duration", String(duration));
    formData.append("allowReplay", String(allowReplay));
    formData.append("isActive", String(isActive));
    formData.append(
      "sections",
      JSON.stringify(
        sections.map((s, idx) => ({
          title: s.title,
          description: s.instructions,
          partNumber: idx + 1,
          questions: s.questions.map((q) => {
            let answer: string | string[] = q.correctAnswer.trim();
            if (q.type === ListeningQuestionType.TABLE_COMPLETION) {
              const gaps = countTableGapTokens(q.options);
              const parts = q.correctAnswer
                .split("|")
                .map((x) => x.trim());
              while (parts.length < gaps) parts.push("");
              answer = parts.slice(0, gaps);
            } else if (
              q.type === ListeningQuestionType.FLOWCHART_COMPLETION
            ) {
              const gaps = countFlowchartGapTokens(q.options);
              const parts = q.correctAnswer
                .split("|")
                .map((x) => x.trim());
              while (parts.length < gaps) parts.push("");
              answer = parts.slice(0, gaps);
            } else if (q.type === ListeningQuestionType.NOTE_COMPLETION) {
              const gaps = countListeningNoteGaps(q.options);
              const parts = q.correctAnswer
                .split("|")
                .map((x) => x.trim());
              while (parts.length < gaps) parts.push("");
              answer = parts.slice(0, gaps);
            } else if (
              q.type === ListeningQuestionType.MULTIPLE_CHOICE_MULTIPLE
            ) {
              const k = multiMcqK(q);
              answer = parseMultiMcqLetters(q.correctAnswer, k);
            } else if (
              q.type === ListeningQuestionType.MATCHING &&
              isBoxMatchingAdmin(q)
            ) {
              const stems = matchStemCountAdmin(q);
              answer = parseMatchingRowLetters(q.correctAnswer, stems);
            } else if (
              q.type === ListeningQuestionType.MAP_LABELING &&
              isMapLabelAdmin(q)
            ) {
              const rows = q.options.length;
              answer = parseMatchingRowLetters(q.correctAnswer, rows);
            }
            const row: Record<string, unknown> = {
              id: q.questionId,
              type: q.type,
              questionText: q.text,
              options: q.options,
              answer,
              points: q.points,
            };
            if (q.type === ListeningQuestionType.MULTIPLE_CHOICE_MULTIPLE) {
              row.selectCount = multiMcqK(q);
            }
            if (
              q.type === ListeningQuestionType.MATCHING &&
              isBoxMatchingAdmin(q)
            ) {
              row.matchStemCount = matchStemCountAdmin(q);
            }
            if (
              q.type === ListeningQuestionType.MAP_LABELING &&
              isMapLabelAdmin(q)
            ) {
              row.mapImageUrl = q.mapImageUrl?.trim() ?? "";
              row.mapChoiceCount = mapChoiceCountAdmin(q);
            }
            if (q.type === ListeningQuestionType.FLOWCHART_COMPLETION) {
              row.wordBank = (q.wordBank ?? []).map((w) => String(w ?? ""));
            }
            return row;
          }),
        })),
      ),
    );
    if (audioFile) formData.append("audio", audioFile);

    try {
      if (isEdit && id) {
        await adminUpdateListeningTest(id, formData);
        toast.success("Listening test updated");
      } else {
        await adminCreateListeningTest(formData);
        toast.success("Listening test created");
      }
      navigate("/admin/listening");
    } catch (err: unknown) {
      toast.error(listeningSaveErrorMessage(err, "Failed to save test"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  const totalQuestions = sections.reduce(
    (acc, s) =>
      acc +
      s.questions.reduce((a, q) => {
        if (q.type === ListeningQuestionType.TABLE_COMPLETION) {
          return a + countTableGapTokens(q.options);
        }
        if (q.type === ListeningQuestionType.FLOWCHART_COMPLETION) {
          return a + countFlowchartGapTokens(q.options);
        }
        if (q.type === ListeningQuestionType.NOTE_COMPLETION) {
          return a + countListeningNoteGaps(q.options);
        }
        if (q.type === ListeningQuestionType.MULTIPLE_CHOICE_MULTIPLE) {
          return a + multiMcqK(q);
        }
        if (q.type === ListeningQuestionType.MATCHING && isBoxMatchingAdmin(q)) {
          return a + matchStemCountAdmin(q);
        }
        if (q.type === ListeningQuestionType.MAP_LABELING && isMapLabelAdmin(q)) {
          return a + q.options.length;
        }
        return a + 1;
      }, 0),
    0,
  );

  return (
    <>
      <Helmet>
        <title>
          {isEdit ? "Edit Listening Test" : "New Listening Test"} – Admin –
          Lexora
        </title>
      </Helmet>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin/listening")}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? "Edit Listening Test" : "Create Listening Test"}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {totalQuestions} question{totalQuestions !== 1 ? "s" : ""} across{" "}
              {sections.length} section{sections.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button type="submit" disabled={saving} className="gap-2 min-w-32">
            {saving ? (
              "Saving…"
            ) : (
              <>
                <FiSave className="w-4 h-4" />
                {isEdit ? "Update" : "Create"}
              </>
            )}
          </Button>
        </div>

        {/* Basic info */}
        <Card>
          <CardBody className="space-y-4">
            <h2 className="font-semibold text-gray-800">Basic Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. IELTS Listening Practice Test 1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Optional brief description…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  min={1}
                  max={180}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-3 justify-end">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allowReplay}
                    onChange={(e) => setAllowReplay(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">
                    Allow audio replay
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">
                    Active (visible to students)
                  </span>
                </label>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Audio Upload */}
        <Card>
          <CardBody className="space-y-3">
            <h2 className="font-semibold text-gray-800">
              Audio File
              {!isEdit ? (
                <span className="text-red-500 font-normal"> *</span>
              ) : null}
            </h2>
            {!isEdit && !audioFile ? (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Required for new tests (mp3, wav, ogg, webm, or m4a). Keep under
                ~50 MB on shared hosting; server allows up to 100 MB after nginx
                is configured.
              </p>
            ) : null}

            {existingAudioUrl && !audioFile && (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <FiVolume2 className="w-5 h-5 text-green-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-800">
                    Current audio file
                  </p>
                  <audio
                    controls
                    src={existingAudioUrl}
                    className="mt-1 w-full h-8"
                  />
                </div>
              </div>
            )}

            {audioFile && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <FiVolume2 className="w-5 h-5 text-blue-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-800">
                    New file: {audioFile.name}
                  </p>
                  <p className="text-xs text-blue-600">
                    {(audioFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAudioFile(null)}
                  className="text-blue-400 hover:text-blue-600"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => audioRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
            >
              <FiUpload className="w-4 h-4" />
              {existingAudioUrl || audioFile
                ? "Replace audio file"
                : "Upload audio file"}
              <span className="text-xs text-gray-400 ml-1">
                (MP3, WAV, OGG, WebM – max 100 MB)
              </span>
            </button>
            <input
              ref={audioRef}
              type="file"
              accept=".mp3,.wav,.ogg,.webm,.m4a,audio/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > MAX_LISTENING_AUDIO_BYTES) {
                  toast.error(
                    `Audio file is too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Maximum is 100 MB.`,
                  );
                  e.target.value = "";
                  return;
                }
                setAudioFile(f);
                e.target.value = "";
              }}
            />
          </CardBody>
        </Card>

        {/* Sections builder */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">
              Sections &amp; Questions
            </h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addSection}
              className="gap-1"
            >
              <FiPlus className="w-4 h-4" />
              Add Section
            </Button>
          </div>

          {sections.map((section, sIdx) => (
            <Card key={sIdx}>
              {/* Section header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleSection(sIdx)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {section.collapsed ? (
                    <FiChevronDown className="w-4 h-4" />
                  ) : (
                    <FiChevronUp className="w-4 h-4" />
                  )}
                </button>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Section {sIdx + 1}
                </span>
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) =>
                    updateSection(sIdx, { title: e.target.value })
                  }
                  placeholder="Section title…"
                  className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                />
                <span className="text-xs text-gray-400">
                  {section.questions.length} Q
                </span>
                {sections.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSection(sIdx)}
                    className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {!section.collapsed && (
                <CardBody className="space-y-4">
                  {/* Instructions */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Instructions (optional)
                    </label>
                    <textarea
                      value={section.instructions}
                      onChange={(e) =>
                        updateSection(sIdx, { instructions: e.target.value })
                      }
                      rows={2}
                      placeholder="Listening section instructions…"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                    />
                  </div>

                  {/* Questions */}
                  <div className="space-y-4">
                    {section.questions.map((q, qIdx) => (
                      <div
                        key={q.questionId}
                        className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                            Q{qIdx + 1}
                          </span>
                          <select
                            value={q.type}
                            onChange={(e) => {
                              const next = e.target
                                .value as ListeningQuestionType;
                              if (next === ListeningQuestionType.TABLE_COMPLETION) {
                                const opts = DEFAULT_TABLE_OPTIONS();
                                const nGaps = countTableGapTokens(opts);
                                updateQuestion(sIdx, qIdx, {
                                  type: next,
                                  options: opts,
                                  correctAnswer: Array.from(
                                    { length: nGaps },
                                    () => "answer",
                                  ).join(" | "),
                                  selectCount: undefined,
                                  matchStemCount: undefined,
                                  mapImageUrl: undefined,
                                  mapChoiceCount: undefined,
                                  wordBank: undefined,
                                });
                              } else if (
                                next ===
                                ListeningQuestionType.MULTIPLE_CHOICE_MULTIPLE
                              ) {
                                updateQuestion(sIdx, qIdx, {
                                  type: next,
                                  options: ["", "", "", "", ""],
                                  correctAnswer: "A, B",
                                  selectCount: 2,
                                  matchStemCount: undefined,
                                  mapImageUrl: undefined,
                                  mapChoiceCount: undefined,
                                  wordBank: undefined,
                                });
                              } else if (
                                next === ListeningQuestionType.MATCHING
                              ) {
                                updateQuestion(sIdx, qIdx, {
                                  type: next,
                                  matchStemCount: 6,
                                  text:
                                    (q.text ?? "").trim() ||
                                    "Match each description to the correct letter.",
                                  options: [
                                    "walking around the town centre",
                                    "helping at concerts",
                                    "getting involved with community groups",
                                    "helping with a magazine",
                                    "participating at lunches for retired people",
                                    "helping with the website",
                                    "Providing entertainment",
                                    "Selling tickets",
                                    "Helping people find their seats",
                                    "Contacting local businesses",
                                  ],
                                  correctAnswer: "A | B | C | D | E | F",
                                  selectCount: undefined,
                                  mapImageUrl: undefined,
                                  mapChoiceCount: undefined,
                                  wordBank: undefined,
                                });
                              } else if (
                                next === ListeningQuestionType.MAP_LABELING
                              ) {
                                updateQuestion(sIdx, qIdx, {
                                  type: next,
                                  mapImageUrl: "",
                                  mapChoiceCount: 8,
                                  options: [
                                    "Farm shop",
                                    "Disabled entry",
                                    "Adventure playground",
                                    "Kitchen gardens",
                                    "The Temple of the Four Winds",
                                  ],
                                  correctAnswer: "A | B | C | D | E",
                                  text: "Label the map below.",
                                  selectCount: undefined,
                                  matchStemCount: undefined,
                                  wordBank: undefined,
                                });
                              } else if (
                                next === ListeningQuestionType.FLOWCHART_COMPLETION
                              ) {
                                const fc = DEFAULT_LISTENING_FLOWCHART();
                                updateQuestion(sIdx, qIdx, {
                                  type: next,
                                  options: fc.options,
                                  wordBank: fc.wordBank,
                                  correctAnswer: fc.correctAnswer,
                                  text:
                                    (q.text ?? "").trim() ||
                                    "Complete the flow-chart. Choose the correct answer and move it into each gap.",
                                  selectCount: undefined,
                                  matchStemCount: undefined,
                                  mapImageUrl: undefined,
                                  mapChoiceCount: undefined,
                                });
                              } else if (
                                next === ListeningQuestionType.NOTE_COMPLETION
                              ) {
                                const nb = DEFAULT_LISTENING_NOTE_COMPLETION();
                                updateQuestion(sIdx, qIdx, {
                                  type: next,
                                  options: nb.options,
                                  correctAnswer: nb.correctAnswer,
                                  text:
                                    (q.text ?? "").trim() ||
                                    "Phone call about second-hand furniture",
                                  selectCount: undefined,
                                  matchStemCount: undefined,
                                  mapImageUrl: undefined,
                                  mapChoiceCount: undefined,
                                  wordBank: undefined,
                                });
                              } else {
                                updateQuestion(sIdx, qIdx, {
                                  type: next,
                                  options: [],
                                  selectCount: undefined,
                                  matchStemCount: undefined,
                                  mapImageUrl: undefined,
                                  mapChoiceCount: undefined,
                                  wordBank: undefined,
                                });
                              }
                            }}
                            className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                          >
                            {Object.entries(QUESTION_TYPE_LABELS).map(
                              ([val, label]) => (
                                <option key={val} value={val}>
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                          <div className="flex items-center gap-1 ml-auto">
                            <span className="text-xs text-gray-500">
                              Points:
                            </span>
                            <input
                              type="number"
                              value={q.points}
                              min={1}
                              max={10}
                              onChange={(e) =>
                                updateQuestion(sIdx, qIdx, {
                                  points: Number(e.target.value),
                                })
                              }
                              className="w-14 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                            />
                          </div>
                          {section.questions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeQuestion(sIdx, qIdx)}
                              className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Question text */}
                        <textarea
                          value={q.text}
                          onChange={(e) =>
                            updateQuestion(sIdx, qIdx, { text: e.target.value })
                          }
                          rows={2}
                          placeholder="Question text…"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none bg-white"
                        />

                        {q.type === ListeningQuestionType.MATCHING && (
                          <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <label className="text-xs font-medium text-gray-700">
                                Stems (left column)
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={20}
                                value={q.matchStemCount ?? ""}
                                placeholder="—"
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  if (raw === "")
                                    updateQuestion(sIdx, qIdx, {
                                      matchStemCount: undefined,
                                    });
                                  else {
                                    const v = Number(raw);
                                    if (Number.isFinite(v) && v >= 1 && v <= 20)
                                      updateQuestion(sIdx, qIdx, {
                                        matchStemCount: v,
                                      });
                                  }
                                }}
                                className="w-16 text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                              />
                              <span className="text-[11px] text-gray-600">
                                Leave empty for legacy single dropdown. Set a
                                number for IELTS box matching — then use the{" "}
                                <strong>two-column editor</strong> below
                                (stems left, pool right), like Reading Matching
                                Headings.
                              </span>
                            </div>
                          </div>
                        )}

                        {q.type === ListeningQuestionType.MAP_LABELING && (
                          <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 space-y-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Map image{" "}
                                <span className="text-red-500">*</span>
                                <span className="font-normal text-gray-500">
                                  {" "}
                                  (paste URL or upload to storage)
                                </span>
                              </label>
                              <div className="flex flex-wrap items-stretch gap-2">
                                <input
                                  type="url"
                                  value={q.mapImageUrl ?? ""}
                                  onChange={(e) =>
                                    updateQuestion(sIdx, qIdx, {
                                      mapImageUrl: e.target.value,
                                    })
                                  }
                                  placeholder="https://… or use Upload"
                                  className="min-w-[200px] flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
                                />
                                <input
                                  type="file"
                                  id={`map-img-${sIdx}-${qIdx}`}
                                  accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,.jpg,.jpeg,.png,.webp,.gif,.svg"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    e.target.value = "";
                                    if (f) void handleMapImageUpload(sIdx, qIdx, f);
                                  }}
                                />
                                <button
                                  type="button"
                                  disabled={Boolean(
                                    mapImageUploading[`${sIdx}-${qIdx}`],
                                  )}
                                  onClick={() =>
                                    document
                                      .getElementById(`map-img-${sIdx}-${qIdx}`)
                                      ?.click()
                                  }
                                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <FiUpload className="w-3.5 h-3.5" />
                                  {mapImageUploading[`${sIdx}-${qIdx}`]
                                    ? "Uploading…"
                                    : "Upload"}
                                </button>
                              </div>
                              {q.mapImageUrl?.trim() ? (
                                <div className="mt-2 rounded-md border border-gray-200 bg-white p-2 max-w-sm">
                                  <img
                                    src={q.mapImageUrl.trim()}
                                    alt="Map preview"
                                    className="max-h-36 w-full object-contain"
                                  />
                                </div>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <label className="text-xs font-medium text-gray-700">
                                Map letters (columns A–…)
                              </label>
                              <input
                                type="number"
                                min={2}
                                max={20}
                                value={mapChoiceCountAdmin(q)}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  updateQuestion(sIdx, qIdx, {
                                    mapChoiceCount:
                                      Number.isFinite(v) && v >= 2 && v <= 20
                                        ? v
                                        : 8,
                                  });
                                }}
                                className="w-16 text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                              />
                            </div>
                            <p className="text-[11px] text-gray-600">
                              Each option row = one location on the grid (all
                              rows need text). Correct key: one letter per row,
                              separated by <code className="rounded bg-white/80 px-0.5">|</code>{" "}
                              (e.g. A | C | B), within columns A–… above. Leave
                              image empty for legacy single-answer mode. Upload
                              uses your listening storage bucket (same as audio).
                            </p>
                          </div>
                        )}

                        {/* Table completion rows */}
                        {q.type === ListeningQuestionType.TABLE_COMPLETION && (
                          <div className="space-y-2">
                            <p className="text-xs text-gray-600 leading-relaxed">
                              First row = table header (cells separated by{" "}
                              <code className="rounded bg-gray-100 px-1">
                                |||
                              </code>
                              ). Each following row is a data row. Use{" "}
                              <code className="rounded bg-gray-100 px-1">
                                {FLOWCHART_GAP_TOKEN}
                              </code>{" "}
                              for each blank (
                              {countTableGapTokens(q.options)} gap
                              {countTableGapTokens(q.options) !== 1 ? "s" : ""}).
                            </p>
                            {q.options.map((row, ri) => (
                              <div key={ri} className="flex gap-2 items-start">
                                <span className="text-[10px] text-gray-400 w-14 shrink-0 pt-2">
                                  {ri === 0 ? "Header" : `Row ${ri}`}
                                </span>
                                <textarea
                                  value={row}
                                  onChange={(e) => {
                                    const next = [...q.options];
                                    next[ri] = e.target.value;
                                    updateQuestion(sIdx, qIdx, {
                                      options: next,
                                    });
                                  }}
                                  rows={ri === 0 ? 1 : 2}
                                  className="flex-1 px-2 py-1.5 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white resize-y min-h-[2rem]"
                                  placeholder={
                                    ri === 0
                                      ? "Col1|||Col2|||Col3"
                                      : "Text with [[GAP]] in cells…"
                                  }
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (q.options.length < 2) return;
                                    updateQuestion(sIdx, qIdx, {
                                      options: q.options.filter(
                                        (_, i) => i !== ri,
                                      ),
                                    });
                                  }}
                                  disabled={q.options.length < 2}
                                  className="mt-1 text-gray-300 hover:text-red-500 disabled:opacity-30"
                                  title="Remove row"
                                >
                                  <FiTrash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() =>
                                updateQuestion(sIdx, qIdx, {
                                  options: [
                                    ...q.options,
                                    `New|||${FLOWCHART_GAP_TOKEN}`,
                                  ],
                                })
                              }
                              className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
                            >
                              <FiPlus className="w-3 h-3" /> Add data row
                            </button>
                          </div>
                        )}

                        {q.type ===
                          ListeningQuestionType.FLOWCHART_COMPLETION && (
                          <div className="space-y-3 rounded-lg border border-rose-100 bg-rose-50/40 px-3 py-3">
                            <p className="text-xs text-gray-600 leading-relaxed">
                              One row per flowchart box (in order, top → bottom).
                              Use{" "}
                              <code className="rounded bg-white px-1">
                                {FLOWCHART_GAP_TOKEN}
                              </code>{" "}
                              for each blank. Students see a chart on the left
                              and drag words from the pool on the right.
                            </p>
                            <div className="text-xs font-medium text-rose-900/90">
                              Flow steps (
                              {countFlowchartGapTokens(q.options)} gap
                              {countFlowchartGapTokens(q.options) !== 1
                                ? "s"
                                : ""}
                              )
                            </div>
                            {q.options.map((row, ri) => (
                              <div key={ri} className="flex gap-2 items-start">
                                <span className="text-[10px] text-gray-500 w-10 shrink-0 pt-2">
                                  {ri + 1}
                                </span>
                                <textarea
                                  value={row}
                                  onChange={(e) => {
                                    const next = [...q.options];
                                    next[ri] = e.target.value;
                                    updateQuestion(sIdx, qIdx, {
                                      options: next,
                                    });
                                  }}
                                  rows={2}
                                  className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-400 bg-white resize-y min-h-[2.5rem]"
                                  placeholder={`Step ${ri + 1}… include ${FLOWCHART_GAP_TOKEN} for blanks`}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (q.options.length < 2) return;
                                    updateQuestion(sIdx, qIdx, {
                                      options: q.options.filter(
                                        (_, i) => i !== ri,
                                      ),
                                    });
                                  }}
                                  disabled={q.options.length < 2}
                                  className="mt-1 text-gray-300 hover:text-red-500 disabled:opacity-30"
                                  title="Remove step"
                                >
                                  <FiTrash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() =>
                                updateQuestion(sIdx, qIdx, {
                                  options: [
                                    ...q.options,
                                    `Next step ${FLOWCHART_GAP_TOKEN}`,
                                  ],
                                })
                              }
                              className="text-xs text-rose-700 hover:text-rose-900 flex items-center gap-1"
                            >
                              <FiPlus className="w-3 h-3" /> Add flow step
                            </button>
                            <div className="border-t border-rose-200/80 pt-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-700">
                                  Word bank (answer pool)
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuestion(sIdx, qIdx, {
                                      wordBank: [...(q.wordBank ?? []), ""],
                                    })
                                  }
                                  className="text-xs text-rose-700 hover:underline"
                                >
                                  + Add word
                                </button>
                              </div>
                              {(q.wordBank ?? []).map((w, wi) => (
                                <div key={wi} className="flex gap-2 items-center">
                                  <input
                                    type="text"
                                    value={w}
                                    onChange={(e) => {
                                      const wb = [...(q.wordBank ?? [])];
                                      wb[wi] = e.target.value;
                                      updateQuestion(sIdx, qIdx, {
                                        wordBank: wb,
                                      });
                                    }}
                                    className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
                                    placeholder="Pool word"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateQuestion(sIdx, qIdx, {
                                        wordBank: (q.wordBank ?? []).filter(
                                          (_, i) => i !== wi,
                                        ),
                                      })
                                    }
                                    className="text-gray-300 hover:text-red-500"
                                  >
                                    <FiTrash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {q.type === ListeningQuestionType.NOTE_COMPLETION && (
                          <div className="space-y-3 rounded-lg border border-pink-100 bg-pink-50/50 px-3 py-3">
                            <p className="text-xs text-gray-600 leading-relaxed">
                              One row per note line. Start a line with{" "}
                              <code className="rounded bg-white px-1">#</code> for
                              a section heading (no blank). Only lines containing{" "}
                              <code className="rounded bg-white px-1">
                                {FLOWCHART_GAP_TOKEN}
                              </code>{" "}
                              get answer boxes (
                              {countListeningNoteGaps(q.options)} gap
                              {countListeningNoteGaps(q.options) !== 1
                                ? "s"
                                : ""}
                              ).
                            </p>
                            {q.options.map((row, ri) => (
                              <div key={ri} className="flex gap-2 items-start">
                                <span className="text-[10px] text-gray-500 w-10 shrink-0 pt-2">
                                  {ri + 1}
                                </span>
                                <textarea
                                  value={row}
                                  onChange={(e) => {
                                    const next = [...q.options];
                                    next[ri] = e.target.value;
                                    updateQuestion(sIdx, qIdx, {
                                      options: next,
                                    });
                                  }}
                                  rows={2}
                                  className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-pink-400 bg-white resize-y min-h-[2.5rem]"
                                  placeholder={`Line ${ri + 1}… # Heading or text with ${FLOWCHART_GAP_TOKEN}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (q.options.length < 2) return;
                                    updateQuestion(sIdx, qIdx, {
                                      options: q.options.filter(
                                        (_, i) => i !== ri,
                                      ),
                                    });
                                  }}
                                  disabled={q.options.length < 2}
                                  className="mt-1 text-gray-300 hover:text-red-500 disabled:opacity-30"
                                  title="Remove line"
                                >
                                  <FiTrash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() =>
                                updateQuestion(sIdx, qIdx, {
                                  options: [
                                    ...q.options,
                                    `Bullet text ${FLOWCHART_GAP_TOKEN}`,
                                  ],
                                })
                              }
                              className="text-xs text-pink-800 hover:text-pink-950 flex items-center gap-1"
                            >
                              <FiPlus className="w-3 h-3" /> Add line
                            </button>
                          </div>
                        )}

                        {q.type ===
                          ListeningQuestionType.MULTIPLE_CHOICE_MULTIPLE && (
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-gray-600">
                              How many to choose
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={multiMcqK(q)}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                updateQuestion(sIdx, qIdx, {
                                  selectCount:
                                    Number.isFinite(v) &&
                                    v >= 1 &&
                                    v <= 10
                                      ? v
                                      : 2,
                                });
                              }}
                              className="w-16 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                            />
                          </div>
                        )}

                        {/* Options (for Multiple Choice & Matching) */}
                        {(q.type === ListeningQuestionType.MULTIPLE_CHOICE ||
                          q.type === ListeningQuestionType.MATCHING ||
                          q.type === ListeningQuestionType.MAP_LABELING ||
                          q.type ===
                            ListeningQuestionType.MULTIPLE_CHOICE_MULTIPLE) && (
                          <div className="space-y-2">
                            <span className="text-xs font-medium text-gray-500">
                              {q.type ===
                              ListeningQuestionType.MULTIPLE_CHOICE_MULTIPLE
                                ? "Options (shown as A, B, C… in the test)"
                                : q.type === ListeningQuestionType.MATCHING &&
                                    isBoxMatchingAdmin(q)
                                  ? "Stems & pool (Reading-style: left = blanks + stems, right = lettered pool)"
                                  : q.type === ListeningQuestionType.MAP_LABELING &&
                                    isMapLabelAdmin(q)
                                  ? "Rows: each location to label (numbered in test)"
                                  : "Options"}
                            </span>
                            {q.type === ListeningQuestionType.MATCHING &&
                            isBoxMatchingAdmin(q) ? (
                              (() => {
                                const stems = matchStemCountAdmin(q);
                                const poolStart = stems;
                                const pool = q.options.slice(poolStart);
                                const poolLetterCount = q.options
                                  .slice(stems)
                                  .filter((o) => o.trim().length > 0).length;
                                const lettersArr = parseMatchingRowLetters(
                                  q.correctAnswer,
                                  stems,
                                );
                                const qk = listeningMatchQKey(sIdx, qIdx);
                                const activeSlot =
                                  listeningMatchActiveSlot[qk] ?? null;
                                return (
                                  <div className="space-y-2">
                                    <p className="text-[11px] text-gray-600 leading-relaxed">
                                      Same workflow as{" "}
                                      <strong>
                                        Reading → Matching Headings
                                      </strong>
                                      : each stem is a row on the{" "}
                                      <strong>left</strong> with a letter slot.
                                      Choose the correct letter with the
                                      dropdown, or{" "}
                                      <strong>
                                        click the stem row
                                      </strong>{" "}
                                      to highlight it and then{" "}
                                      <strong>click A / B / C…</strong> in the
                                      pool on the right. Add rows on the right to
                                      grow the answer pool.
                                    </p>
                                    <div className="grid gap-4 md:grid-cols-2 md:items-start">
                                      <div className="rounded-lg border border-indigo-200 bg-white p-3 space-y-2 shadow-sm">
                                        <div className="text-xs font-semibold text-indigo-900">
                                          Stems (left column in the test)
                                        </div>
                                        {Array.from({ length: stems }, (_, i) => (
                                          <div
                                            key={`lstem-${q.questionId}-${i}`}
                                            className={`flex gap-2 items-start rounded-md p-1 -m-1 transition-colors ${
                                              activeSlot === i
                                                ? "ring-2 ring-indigo-400 ring-offset-1 bg-indigo-50/90"
                                                : "hover:bg-gray-50/80"
                                            }`}
                                          >
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setListeningMatchActiveSlot(
                                                  (prev) => ({
                                                    ...prev,
                                                    [qk]: i,
                                                  }),
                                                )
                                              }
                                              className="mt-2 text-[10px] font-mono font-semibold text-indigo-700 w-7 shrink-0 text-left hover:underline"
                                              title="Select this stem, then click a pool letter"
                                            >
                                              S{i + 1}
                                            </button>
                                            <select
                                              aria-label={`Correct letter for stem ${i + 1}`}
                                              value={lettersArr[i] || ""}
                                              onChange={(e) =>
                                                updateListeningMatchStemLetter(
                                                  sIdx,
                                                  qIdx,
                                                  i,
                                                  e.target.value,
                                                )
                                              }
                                              className="mt-1 w-14 shrink-0 rounded border border-gray-200 bg-white px-1 py-1.5 text-xs font-mono font-bold text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                                            >
                                              <option value="">—</option>
                                              {Array.from(
                                                { length: poolLetterCount },
                                                (_, j) => {
                                                  const L =
                                                    String.fromCharCode(65 + j);
                                                  return (
                                                    <option key={L} value={L}>
                                                      {L}
                                                    </option>
                                                  );
                                                },
                                              )}
                                            </select>
                                            <input
                                              type="text"
                                              value={q.options[i] ?? ""}
                                              onChange={(e) =>
                                                updateOption(
                                                  sIdx,
                                                  qIdx,
                                                  i,
                                                  e.target.value,
                                                )
                                              }
                                              placeholder={`Stem ${i + 1} text`}
                                              className="flex-1 min-w-0 mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                                            />
                                            <button
                                              type="button"
                                              onClick={() =>
                                                removeListeningMatchBoxOption(
                                                  sIdx,
                                                  qIdx,
                                                  i,
                                                )
                                              }
                                              className="mt-1.5 text-gray-300 hover:text-red-500 shrink-0"
                                              title="Remove stem"
                                            >
                                              <FiTrash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                      <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-2 shadow-sm">
                                        <div className="text-xs font-semibold text-amber-900">
                                          Answer pool (letters in test)
                                        </div>
                                        {pool.map((opt, j) => {
                                          const letter = String.fromCharCode(
                                            65 + j,
                                          );
                                          const globalIdx = poolStart + j;
                                          return (
                                            <div
                                              key={`lpool-${q.questionId}-${globalIdx}`}
                                              className="flex gap-2 items-center"
                                            >
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  assignListeningPoolLetterToActiveStem(
                                                    sIdx,
                                                    qIdx,
                                                    letter,
                                                  )
                                                }
                                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-300 bg-white text-xs font-bold font-mono text-amber-900 shadow-sm hover:bg-amber-100 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                                                title={`Assign ${letter} to the selected stem`}
                                              >
                                                {letter}
                                              </button>
                                              <input
                                                type="text"
                                                value={opt}
                                                onChange={(e) =>
                                                  updateOption(
                                                    sIdx,
                                                    qIdx,
                                                    globalIdx,
                                                    e.target.value,
                                                  )
                                                }
                                                placeholder={`Pool ${letter}`}
                                                className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
                                              />
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  removeListeningMatchBoxOption(
                                                    sIdx,
                                                    qIdx,
                                                    globalIdx,
                                                  )
                                                }
                                                className="text-gray-300 hover:text-red-500 shrink-0"
                                                title="Remove pool row"
                                              >
                                                <FiTrash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          );
                                        })}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            addOption(sIdx, qIdx)
                                          }
                                          className="text-xs text-amber-800 hover:text-amber-950 flex items-center gap-1 font-medium"
                                        >
                                          <FiPlus className="w-3 h-3" /> Add pool
                                          row
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()
                            ) : (
                              <>
                                {q.options.map((opt, optIdx) => (
                                  <div
                                    key={optIdx}
                                    className="flex items-center gap-2"
                                  >
                                    <span className="text-[10px] text-gray-500 w-14 shrink-0 pt-1.5 text-right leading-tight">
                                      {q.type ===
                                        ListeningQuestionType.MAP_LABELING &&
                                      isMapLabelAdmin(q) ? (
                                        <>R{optIdx + 1}</>
                                      ) : (
                                        <>{String.fromCharCode(65 + optIdx)}.</>
                                      )}
                                    </span>
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) =>
                                        updateOption(
                                          sIdx,
                                          qIdx,
                                          optIdx,
                                          e.target.value,
                                        )
                                      }
                                      placeholder={`Option ${String.fromCharCode(
                                        65 + optIdx,
                                      )}`}
                                      className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeOption(sIdx, qIdx, optIdx)
                                      }
                                      className="text-gray-300 hover:text-red-500"
                                    >
                                      <FiTrash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => addOption(sIdx, qIdx)}
                                  className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 mt-1"
                                >
                                  <FiPlus className="w-3 h-3" /> Add option
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        {/* Correct answer */}
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Correct Answer{" "}
                            <span className="text-red-500">*</span>
                            {q.type === ListeningQuestionType.TABLE_COMPLETION ||
                            q.type ===
                              ListeningQuestionType.FLOWCHART_COMPLETION ||
                            q.type ===
                              ListeningQuestionType.NOTE_COMPLETION ? (
                              <span className="font-normal text-gray-400">
                                {" "}
                                (one per gap in order, separated by{" "}
                                <code className="text-[10px]">|</code>)
                              </span>
                            ) : q.type ===
                              ListeningQuestionType.MULTIPLE_CHOICE_MULTIPLE ? (
                              <span className="font-normal text-gray-400">
                                {" "}
                                ({multiMcqK(q)} distinct letters, e.g.{" "}
                                <code className="text-[10px]">A, C</code>)
                              </span>
                            ) : q.type === ListeningQuestionType.MATCHING &&
                              isBoxMatchingAdmin(q) ? (
                              <span className="font-normal text-gray-400">
                                {" "}
                                (set beside each stem above, or stem + pool
                                click)
                              </span>
                            ) : q.type === ListeningQuestionType.MAP_LABELING &&
                              isMapLabelAdmin(q) ? (
                              <span className="font-normal text-gray-400">
                                {" "}
                                ({q.options.length} letters, e.g.{" "}
                                <code className="text-[10px]">A | B | C</code>)
                              </span>
                            ) : null}
                          </label>
                          {q.type === ListeningQuestionType.TABLE_COMPLETION ||
                          q.type ===
                            ListeningQuestionType.FLOWCHART_COMPLETION ||
                          q.type ===
                            ListeningQuestionType.NOTE_COMPLETION ? (
                            <textarea
                              value={q.correctAnswer}
                              onChange={(e) =>
                                updateQuestion(sIdx, qIdx, {
                                  correctAnswer: e.target.value,
                                })
                              }
                              rows={3}
                              placeholder={
                                q.type ===
                                ListeningQuestionType.FLOWCHART_COMPLETION
                                  ? "e.g. site | radiation | heat | microbes | results"
                                  : q.type ===
                                      ListeningQuestionType.NOTE_COMPLETION
                                    ? "e.g. round | oak | four | leather | good | 1.2m | lock"
                                    : "e.g. seafood | terrace | Italian | …"
                              }
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white font-mono"
                            />
                          ) : q.type === ListeningQuestionType.MATCHING &&
                            isBoxMatchingAdmin(q) ? (
                            <div className="space-y-1.5">
                              <p className="text-xs text-gray-500">
                                Answer key updates when you change the letter
                                dropdowns or assign from the pool. You can still
                                paste below if you prefer editing raw text.
                              </p>
                              <textarea
                                value={q.correctAnswer}
                                onChange={(e) =>
                                  updateQuestion(sIdx, qIdx, {
                                    correctAnswer: e.target.value,
                                  })
                                }
                                rows={2}
                                placeholder="e.g. A | B | C | D | E | F"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white font-mono"
                              />
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={q.correctAnswer}
                              onChange={(e) =>
                                updateQuestion(sIdx, qIdx, {
                                  correctAnswer: e.target.value,
                                })
                              }
                              placeholder={
                                q.type ===
                                ListeningQuestionType.MULTIPLE_CHOICE
                                  ? "e.g. A or the full option text"
                                  : q.type ===
                                      ListeningQuestionType.MULTIPLE_CHOICE_MULTIPLE
                                    ? "e.g. A, C"
                                    : q.type ===
                                          ListeningQuestionType.MATCHING
                                        ? "Exact option text from the list"
                                        : q.type ===
                                              ListeningQuestionType.MAP_LABELING &&
                                            isMapLabelAdmin(q)
                                          ? "e.g. A | B | C | D | E (one per row)"
                                          : "Expected answer"
                              }
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                            />
                          )}
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => addQuestion(sIdx)}
                      className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors flex items-center justify-center gap-1"
                    >
                      <FiPlus className="w-4 h-4" />
                      Add Question
                    </button>
                  </div>
                </CardBody>
              )}
            </Card>
          ))}
        </div>

        {/* Bottom save */}
        <div className="flex justify-end pb-8">
          <Button type="submit" disabled={saving} className="gap-2 min-w-40">
            {saving ? (
              "Saving…"
            ) : (
              <>
                <FiSave className="w-4 h-4" />
                {isEdit ? "Update Test" : "Create Test"}
              </>
            )}
          </Button>
        </div>
      </form>
    </>
  );
};

export default AdminListeningTestForm;
