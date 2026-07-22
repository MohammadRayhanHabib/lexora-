import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  BarChart2,
  Headphones,
  ArrowLeft,
  Trophy,
} from "lucide-react";
import { getListeningAttemptDetail } from "../../api/listening";
import { getListeningTest } from "../../api/listening";
import {
  IListeningAttempt,
  IListeningTest,
  IListeningQuestion,
  ListeningQuestionType,
} from "../../types";
import { countTableGapTokens, countFlowchartGapTokens, countListeningNoteGaps } from "../../api/reading";
import toast from "react-hot-toast";

function formatKeyAnswer(ans: string | string[] | undefined): string {
  if (ans == null) return "";
  if (Array.isArray(ans)) return ans.join(" · ");
  return String(ans);
}

function tableCorrectCells(q: IListeningQuestion): string[] {
  if (Array.isArray(q.answer)) return q.answer.map(String);
  if (typeof q.answer === "string") {
    const s = q.answer.trim();
    if (s.startsWith("[")) {
      try {
        const p = JSON.parse(s);
        if (Array.isArray(p)) return p.map((x) => String(x ?? ""));
      } catch {
        /* ignore */
      }
    }
    return s.split("|").map((x) => x.trim());
  }
  return [];
}

function countListeningGapsCorrect(
  studentJson: string,
  expected: string[],
): number {
  let student: string[];
  try {
    const p = JSON.parse(studentJson || "[]");
    student = Array.isArray(p) ? p.map((x) => String(x ?? "")) : [];
  } catch {
    student = [];
  }
  let m = 0;
  for (let i = 0; i < expected.length; i++) {
    const a = (student[i] ?? "").trim().toLowerCase();
    const b = String(expected[i] ?? "").trim().toLowerCase();
    if (a === b) m++;
  }
  return m;
}

function multiMcqSlotCount(q: IListeningQuestion): number {
  if (q.type !== ListeningQuestionType.MULTIPLE_CHOICE_MULTIPLE) return 1;
  const n = q.selectCount;
  if (typeof n === "number" && n >= 1 && n <= 20) return Math.floor(n);
  return 2;
}

function parseJsonStringArrayListening(raw: string): string[] {
  try {
    const p = JSON.parse(raw || "[]");
    return Array.isArray(p) ? p.map((x) => String(x ?? "").trim()) : [];
  } catch {
    return [];
  }
}

/** Mirrors backend `countMultiMcqPartialScore` for result breakdown. */
function countMultiMcqPartialScoreListening(
  studentRaw: string,
  correctJson: string,
): number {
  const student = parseJsonStringArrayListening(studentRaw)
    .map((s) => s.toUpperCase().charAt(0))
    .filter((c) => /^[A-Z]$/.test(c));
  const correct = parseJsonStringArrayListening(correctJson)
    .map((s) => s.toUpperCase().charAt(0))
    .filter((c) => /^[A-Z]$/.test(c));
  if (!correct.length) return 0;
  const ss = new Set(student);
  let m = 0;
  for (const c of new Set(correct)) {
    if (ss.has(c)) m++;
  }
  return m;
}

function normalizeLetterChoiceListLocal(
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

function multiMcqCorrectJson(
  test: IListeningTest,
  q: IListeningQuestion,
): string {
  const fromKey = test.answerKey?.[q.id];
  if (fromKey != null && fromKey !== "") return fromKey;
  const k = multiMcqSlotCount(q);
  return JSON.stringify(normalizeLetterChoiceListLocal(q.answer, k));
}

function formatMultiMcqDisplay(jsonOrRaw: string): string {
  const s = jsonOrRaw.trim();
  if (s.startsWith("[")) {
    const arr = parseJsonStringArrayListening(s);
    const letters = arr
      .map((x) => x.toUpperCase().charAt(0))
      .filter((c) => /^[A-Z]$/.test(c));
    if (letters.length) return letters.join(", ");
  }
  return s || "(none)";
}

function listeningMatchStemCountResult(q: IListeningQuestion): number {
  if (q.type !== ListeningQuestionType.MATCHING) return 0;
  const n = q.matchStemCount;
  if (typeof n === "number" && n >= 1 && n <= 30) return Math.floor(n);
  return 0;
}

function isListeningBoxMatchingResult(q: IListeningQuestion): boolean {
  const s = listeningMatchStemCountResult(q);
  return s > 0 && (q.options?.length ?? 0) > s;
}

function mapLabelChoiceCountResult(q: IListeningQuestion): number {
  if (q.type !== ListeningQuestionType.MAP_LABELING) return 8;
  const n = q.mapChoiceCount;
  if (typeof n === "number" && n >= 2 && n <= 20) return Math.floor(n);
  return 8;
}

function isListeningMapLabelingResult(q: IListeningQuestion): boolean {
  if (q.type !== ListeningQuestionType.MAP_LABELING) return false;
  const img = (q.mapImageUrl ?? "").trim();
  const n = q.options?.length ?? 0;
  return img.length > 0 && n >= 1;
}

function normalizeMapLabelLettersResult(
  raw: unknown,
  rowCount: number,
  choices: number,
): string[] {
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
  while (parts.length < rowCount) parts.push("");
  return parts.slice(0, rowCount).map((cell) => {
    const c = cell.trim().toUpperCase().charAt(0);
    if (!/^[A-Z]$/.test(c)) return "";
    if (c.charCodeAt(0) > 64 + choices) return "";
    return c;
  });
}

function mapLabelCorrectJson(
  test: IListeningTest,
  q: IListeningQuestion,
): string {
  const fromKey = test.answerKey?.[q.id];
  if (fromKey != null && fromKey !== "") return fromKey;
  const rows = q.options?.length ?? 0;
  const ch = mapLabelChoiceCountResult(q);
  return JSON.stringify(
    normalizeMapLabelLettersResult(q.answer, rows, ch),
  );
}

function matchingCellToLetterLocal(cell: string, pool: string[]): string {
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

function normalizeMatchingAnswerLettersResult(
  raw: unknown,
  stemCount: number,
  pool: string[],
): string[] {
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
  while (parts.length < stemCount) parts.push("");
  return parts
    .slice(0, stemCount)
    .map((cell) => matchingCellToLetterLocal(cell, pool));
}

function matchingBoxCorrectJson(
  test: IListeningTest,
  q: IListeningQuestion,
): string {
  const fromKey = test.answerKey?.[q.id];
  if (fromKey != null && fromKey !== "") return fromKey;
  const stems = listeningMatchStemCountResult(q);
  const pool = (q.options ?? []).slice(stems);
  return JSON.stringify(normalizeMatchingAnswerLettersResult(q.answer, stems, pool));
}

function formatMatchingBoxDisplay(jsonOrRaw: string): string {
  const s = jsonOrRaw.trim();
  if (!s.startsWith("[")) return s || "(none)";
  const arr = parseJsonStringArrayListening(s);
  return arr.filter(Boolean).join(" · ") || "(none)";
}

function listeningQuestionSlots(q: IListeningQuestion): number {
  if (q.type === ListeningQuestionType.FLOWCHART_COMPLETION) {
    const g = countFlowchartGapTokens(q.options);
    return g > 0 ? g : 0;
  }
  if (q.type === ListeningQuestionType.NOTE_COMPLETION) {
    const g = countListeningNoteGaps(q.options);
    return g > 0 ? g : 0;
  }
  if (q.type === ListeningQuestionType.TABLE_COMPLETION) {
    const g = countTableGapTokens(q.options);
    return g > 0 ? g : 0;
  }
  if (q.type === ListeningQuestionType.MULTIPLE_CHOICE_MULTIPLE) {
    return multiMcqSlotCount(q);
  }
  if (q.type === ListeningQuestionType.MATCHING && isListeningBoxMatchingResult(q)) {
    return listeningMatchStemCountResult(q);
  }
  if (q.type === ListeningQuestionType.MAP_LABELING && isListeningMapLabelingResult(q)) {
    return q.options?.length ?? 0;
  }
  return 1;
}

function questionAttemptCorrectSlots(
  q: IListeningQuestion,
  studentRaw: string,
  test: IListeningTest,
): number {
  if (q.type === ListeningQuestionType.FLOWCHART_COMPLETION) {
    const exp = tableCorrectCells(q);
    const slots =
      exp.length > 0
        ? exp.length
        : countFlowchartGapTokens(q.options ?? []);
    if (slots === 0) return 0;
    return countListeningGapsCorrect(studentRaw, exp.slice(0, slots));
  }
  if (q.type === ListeningQuestionType.NOTE_COMPLETION) {
    const exp = tableCorrectCells(q);
    const slots =
      exp.length > 0
        ? exp.length
        : countListeningNoteGaps(q.options ?? []);
    if (slots === 0) return 0;
    return countListeningGapsCorrect(studentRaw, exp.slice(0, slots));
  }
  if (q.type === ListeningQuestionType.TABLE_COMPLETION) {
    const exp = tableCorrectCells(q);
    const slots = exp.length > 0 ? exp.length : countTableGapTokens(q.options);
    if (slots === 0) return 0;
    return countListeningGapsCorrect(studentRaw, exp.slice(0, slots));
  }
  if (q.type === ListeningQuestionType.MULTIPLE_CHOICE_MULTIPLE) {
    const correctJson = multiMcqCorrectJson(test, q);
    return countMultiMcqPartialScoreListening(studentRaw, correctJson);
  }
  if (q.type === ListeningQuestionType.MATCHING && isListeningBoxMatchingResult(q)) {
    const correctJson = matchingBoxCorrectJson(test, q);
    const exp = parseJsonStringArrayListening(correctJson);
    if (exp.length === 0) return 0;
    return countListeningGapsCorrect(studentRaw, exp);
  }
  if (q.type === ListeningQuestionType.MAP_LABELING && isListeningMapLabelingResult(q)) {
    const correctJson = mapLabelCorrectJson(test, q);
    const exp = parseJsonStringArrayListening(correctJson);
    if (exp.length === 0) return 0;
    return countListeningGapsCorrect(studentRaw, exp);
  }
  const s = studentRaw.trim().toLowerCase();
  const key = formatKeyAnswer(q.answer).trim().toLowerCase();
  return s === key ? 1 : 0;
}

function questionAttemptFullyCorrect(
  q: IListeningQuestion,
  studentRaw: string,
  test: IListeningTest,
): boolean {
  if (q.type === ListeningQuestionType.FLOWCHART_COMPLETION) {
    const exp = tableCorrectCells(q);
    const slots =
      exp.length > 0
        ? exp.length
        : countFlowchartGapTokens(q.options ?? []);
    if (slots === 0) return false;
    return countListeningGapsCorrect(studentRaw, exp) === slots;
  }
  if (q.type === ListeningQuestionType.NOTE_COMPLETION) {
    const exp = tableCorrectCells(q);
    const slots =
      exp.length > 0
        ? exp.length
        : countListeningNoteGaps(q.options ?? []);
    if (slots === 0) return false;
    return countListeningGapsCorrect(studentRaw, exp) === slots;
  }
  if (q.type === ListeningQuestionType.TABLE_COMPLETION) {
    const exp = tableCorrectCells(q);
    const slots = exp.length > 0 ? exp.length : countTableGapTokens(q.options);
    if (slots === 0) return false;
    return countListeningGapsCorrect(studentRaw, exp) === slots;
  }
  if (q.type === ListeningQuestionType.MULTIPLE_CHOICE_MULTIPLE) {
    const slots = multiMcqSlotCount(q);
    if (slots === 0) return false;
    return (
      questionAttemptCorrectSlots(q, studentRaw, test) === slots
    );
  }
  if (q.type === ListeningQuestionType.MATCHING && isListeningBoxMatchingResult(q)) {
    const slots = listeningMatchStemCountResult(q);
    if (slots === 0) return false;
    const correctJson = matchingBoxCorrectJson(test, q);
    const exp = parseJsonStringArrayListening(correctJson);
    if (exp.length === 0) return false;
    return countListeningGapsCorrect(studentRaw, exp) === slots;
  }
  if (q.type === ListeningQuestionType.MAP_LABELING && isListeningMapLabelingResult(q)) {
    const slots = q.options?.length ?? 0;
    if (slots === 0) return false;
    const correctJson = mapLabelCorrectJson(test, q);
    const exp = parseJsonStringArrayListening(correctJson);
    if (exp.length === 0) return false;
    return countListeningGapsCorrect(studentRaw, exp) === slots;
  }
  return (
    studentRaw.trim().toLowerCase() ===
    formatKeyAnswer(q.answer).trim().toLowerCase()
  );
}

const ListeningResultPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<IListeningAttempt | null>(null);
  const [test, setTest] = useState<IListeningTest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!attemptId?.trim()) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data } = await getListeningAttemptDetail(attemptId.trim());
        const att: IListeningAttempt = data.data;
        setAttempt(att);
        const testRes = await getListeningTest(att.testId);
        setTest(testRes.data.data);
      } catch {
        toast.error("Failed to load result");
      } finally {
        setLoading(false);
      }
    })();
  }, [attemptId]);

  const getBandScore = (percentage: number) => {
    if (percentage >= 90) return { band: 9.0, label: "Expert" };
    if (percentage >= 80) return { band: 8.0, label: "Very Good" };
    if (percentage >= 70) return { band: 7.0, label: "Good" };
    if (percentage >= 60) return { band: 6.0, label: "Competent" };
    if (percentage >= 50) return { band: 5.0, label: "Modest" };
    if (percentage >= 40) return { band: 4.0, label: "Limited" };
    return { band: 3.0, label: "Extremely Limited" };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!attempt || !test) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 gap-4">
        <p className="text-gray-600 text-center text-sm">
          {!attemptId?.trim()
            ? "Missing attempt id in the URL."
            : "This result could not be loaded."}
        </p>
        <button
          type="button"
          onClick={() => navigate("/listening")}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          Back to listening tests
        </button>
      </div>
    );
  }

  const pct = attempt.percentage ?? 0;
  const band = getBandScore(pct);
  const correct = attempt.score ?? 0;
  const total = attempt.totalQuestions ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <button
          onClick={() => navigate("/listening")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tests
        </button>

        {/* Score Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-sm font-semibold px-3 py-1 rounded-full mb-6">
            <Headphones className="w-4 h-4" />
            Listening Result
          </div>

          <div className="relative inline-flex items-center justify-center w-36 h-36 mb-6">
            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 52}`}
                strokeDashoffset={`${2 * Math.PI * 52 * (1 - pct / 100)}`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute text-center">
              <div className="text-3xl font-bold text-gray-900">{pct}%</div>
              <div className="text-xs text-gray-400 font-medium">Score</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <span className="text-4xl font-bold text-gray-900">
              Band {band.band.toFixed(1)}
            </span>
          </div>
          <p className="text-gray-500 text-sm mb-6">{band.label}</p>

          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{correct}</div>
              <div className="text-xs text-gray-400">Correct</div>
            </div>
            <div className="w-px h-10 bg-gray-100" />
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">
                {total - correct}
              </div>
              <div className="text-xs text-gray-400">Wrong</div>
            </div>
            <div className="w-px h-10 bg-gray-100" />
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-700">{total}</div>
              <div className="text-xs text-gray-400">Total</div>
            </div>
          </div>
        </div>

        {/* Per-section breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-gray-600" />
              <h3 className="font-semibold text-gray-800">Section Breakdown</h3>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {test.sections.map((section) => {
              let sectionCorrect = 0;
              let sectionTotal = 0;
              for (const q of section.questions) {
                const slots = listeningQuestionSlots(q);
                if (slots === 0) continue;
                sectionTotal += slots;
                sectionCorrect += questionAttemptCorrectSlots(
                  q,
                  attempt.answers?.[q.id] ?? "",
                  test,
                );
              }
              const sectionPct =
                sectionTotal > 0
                  ? Math.round((sectionCorrect / sectionTotal) * 100)
                  : 0;

              return (
                <div key={section.partNumber} className="px-6 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-700 text-sm">
                      Part {section.partNumber}: {section.title}
                    </p>
                    <span className="text-sm font-semibold text-gray-500">
                      {sectionCorrect}/{sectionTotal}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-700 ${
                        sectionPct >= 70
                          ? "bg-green-500"
                          : sectionPct >= 50
                            ? "bg-yellow-500"
                            : "bg-red-400"
                      }`}
                      style={{ width: `${sectionPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Answer review */}
        {attempt.mode === "practice" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Answer Review</h3>
            </div>
            <div className="p-6 space-y-4">
              {test.sections.map((section) =>
                section.questions.map((q) => {
                  const studentAns = attempt.answers?.[q.id] ?? "";
                  const isCorrect = questionAttemptFullyCorrect(
                    q,
                    studentAns,
                    test,
                  );
                  const displayStudent =
                    q.type === ListeningQuestionType.TABLE_COMPLETION ||
                    q.type === ListeningQuestionType.FLOWCHART_COMPLETION ||
                    q.type === ListeningQuestionType.NOTE_COMPLETION
                      ? (() => {
                          try {
                            const p = JSON.parse(studentAns || "[]");
                            return Array.isArray(p)
                              ? p.join(" · ")
                              : studentAns || "(no answer)";
                          } catch {
                            return studentAns || "(no answer)";
                          }
                        })()
                      : q.type ===
                          ListeningQuestionType.MULTIPLE_CHOICE_MULTIPLE
                        ? formatMultiMcqDisplay(studentAns) || "(no answer)"
                        : q.type === ListeningQuestionType.MATCHING &&
                            isListeningBoxMatchingResult(q)
                          ? formatMatchingBoxDisplay(studentAns)
                          : q.type === ListeningQuestionType.MAP_LABELING &&
                              isListeningMapLabelingResult(q)
                            ? formatMatchingBoxDisplay(studentAns)
                            : studentAns || "(no answer)";
                  const displayCorrect =
                    q.type === ListeningQuestionType.MULTIPLE_CHOICE_MULTIPLE
                      ? formatMultiMcqDisplay(multiMcqCorrectJson(test, q))
                      : q.type === ListeningQuestionType.MATCHING &&
                          isListeningBoxMatchingResult(q)
                        ? formatMatchingBoxDisplay(matchingBoxCorrectJson(test, q))
                        : q.type === ListeningQuestionType.MAP_LABELING &&
                            isListeningMapLabelingResult(q)
                          ? formatMatchingBoxDisplay(mapLabelCorrectJson(test, q))
                          : formatKeyAnswer(q.answer);
                  return (
                    <div key={q.id} className="flex items-start gap-3">
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-gray-700 font-medium">
                          {q.questionText}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Your answer:{" "}
                          <span
                            className={
                              isCorrect
                                ? "text-green-600 font-semibold"
                                : "text-red-500 font-semibold"
                            }
                          >
                            {displayStudent}
                          </span>
                        </p>
                        {!isCorrect && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Correct:{" "}
                            <span className="text-green-600 font-semibold">
                              {displayCorrect}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }),
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => navigate("/listening")}
            className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-3 rounded-xl text-sm transition-colors"
          >
            Back to Tests
          </button>
          <button
            onClick={() =>
              navigate(`/listening/test/${attempt.testId}?mode=practice`)
            }
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl text-sm transition-colors"
          >
            Retry Practice
          </button>
        </div>
      </div>
    </div>
  );
};

export default ListeningResultPage;
