import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import {
  FiCheckCircle,
  FiClock,
  FiPlayCircle,
  FiAlertTriangle,
  FiShield,
} from "react-icons/fi";
import { mockExamApi, IMockExam, IMockExamAttempt } from "../../api/mockExam";
import { isMobileDevice, detectIncognito } from "../../utils/security";
import { PageLoader } from "../../components/ui/Spinner";

export default function MockTestsPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<IMockExam[]>([]);
  const [attempts, setAttempts] = useState<IMockExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([mockExamApi.listExams(), mockExamApi.myAttempts()])
      .then(([rExams, rAttempts]) => {
        setExams(rExams.data.data ?? []);
        setAttempts(rAttempts.data.data ?? []);
      })
      .catch(() => toast.error("Failed to load mock exams"))
      .finally(() => setLoading(false));
  }, []);

  const handleStart = async (examId: string) => {
    if (isMobileDevice()) {
      toast.error("IELTS mock exams must be taken on a desktop or laptop.");
      return;
    }
    const isIncognito = await detectIncognito();
    if (isIncognito) {
      toast.error("Mock exams cannot be taken in incognito/private mode.");
      return;
    }

    setStarting(examId);
    try {
      navigate(`/exam/${examId}`);
    } finally {
      setStarting(null);
    }
  };

  if (loading) return <PageLoader />;

  // ── GROUPING LOGIC ───────────────────────────────────────────────
  const grouped = exams.reduce((acc, exam) => {
    const acNum = exam.academicNumber ?? 999;
    if (!acc[acNum]) acc[acNum] = [];
    acc[acNum].push(exam);
    return acc;
  }, {} as Record<number, IMockExam[]>);

  // Sort descending by academic number (20, 19, 18, 17...)
  const academicNumbers = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a);

  // ── HELPER: GET SECTION STATE ────────────────────────────────────
  const getAttempt = (examId: string) =>
    attempts.find((a) => a.examId === examId);

  return (
    <>
      <Helmet>
        <title>IELTS Mock Tests – Lexora</title>
      </Helmet>

      <div className="bg-[#f0f2f5] min-h-screen py-8 -mt-6 mx-[-24px] px-8 space-y-6">
        {/* Security notice overhead */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl max-w-6xl mx-auto">
          <FiAlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-1">Exam Environment Requirements</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-amber-700">
              <p className="flex items-center gap-1.5"><FiShield className="h-3.5 w-3.5" /> Desktop/Laptop browser only</p>
              <p className="flex items-center gap-1.5"><FiShield className="h-3.5 w-3.5" /> No incognito mode</p>
            </div>
          </div>
        </div>

        {/* Rows */}
        <div className="max-w-6xl mx-auto space-y-6">
          {academicNumbers.map((acNum) => {
            const rowExams = grouped[acNum].sort(
              (a, b) => (a.testNumber ?? 0) - (b.testNumber ?? 0),
            );

            return (
              <div key={acNum} className="flex gap-4 items-stretch">
                {/* Left Banner */}
                <div className="bg-[#37353f] text-white w-64 rounded-2xl flex flex-col justify-center px-6 shrink-0 relative overflow-hidden h-[340px]">
                  <h2 className="text-4xl font-serif font-black tracking-wide mb-1 text-white opacity-95">IELTS</h2>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[#817bb1] text-xs font-bold tracking-[0.2em] font-sans">
                      ACADEMIC
                    </span>
                    <span className="text-7xl font-serif font-black text-gray-500/80 -mt-2">
                      {acNum !== 999 ? acNum : ""}
                    </span>
                  </div>
                </div>

                {/* Right Tests Grid */}
                <div className="flex-1 grid grid-cols-4 gap-4">
                  {rowExams.map((exam) => {
                    const attempt = getAttempt(exam._id);
                    return (
                      <TestCard
                        key={exam._id}
                        exam={exam}
                        attempt={attempt}
                        onClick={() => handleStart(exam._id)}
                        disabled={starting === exam._id}
                      />
                    );
                  })}
                  {/* Fill empty spots if less than 4 tests */}
                  {Array.from({ length: Math.max(0, 4 - rowExams.length) }).map((_, i) => (
                    <div key={`empty-${i}`} className="bg-transparent border-2 border-dashed border-gray-300 rounded-xl h-[340px]" />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ── Test Card Component ────────────────────────────────────────────── */

const TestCard: React.FC<{
  exam: IMockExam;
  attempt?: IMockExamAttempt;
  onClick: () => void;
  disabled: boolean;
}> = ({ exam, attempt, onClick, disabled }) => {
  // A helper safely returning status booleans
  const st = attempt?.status ?? "none";
  let curSec = "listening";
  if (st === "listening_done") curSec = "reading";
  if (st === "reading_done") curSec = "writing";
  if (st === "writing_done") curSec = "speaking";
  if (st === "completed") curSec = "done";

  // Derive listening state
  let lisState: "done" | "prog" | "not" = "not";
  let lisText = "Not Started";
  if (attempt?.listeningBand != null) {
    lisState = "done";
    lisText = `score: ${attempt.listeningBand.toFixed(1)}`;
  } else if (st === "in_progress") {
    lisState = "prog";
    lisText = "Progress";
  }

  // Derive reading state
  let readState: "done" | "prog" | "not" = "not";
  let readText = "Not Started";
  if (attempt?.readingBand != null) {
    readState = "done";
    readText = `score: ${attempt.readingBand.toFixed(1)}`;
  } else if (curSec === "reading") {
    readState = "prog";
    readText = "Progress";
  }

  // Derive writing state
  let writState: "done" | "prog" | "not" = "not";
  let writText = "Not Started";
  if (st === "writing_done" || st === "completed") {
    writState = "done";
    writText = "Finish";
    if (attempt?.writingBand != null) writText = `score: ${attempt.writingBand.toFixed(1)}`;
  } else if (curSec === "writing") {
    writState = "prog";
    writText = "Progress";
  }

  // Derive speaking state
  let speakState: "done" | "prog" | "not" = "not";
  let speakText = "Not Started";
  if (st === "completed") {
    speakState = "done";
    speakText = "Finish";
    if (attempt?.speakingBand != null) speakText = `score: ${attempt.speakingBand.toFixed(1)}`;
  } else if (curSec === "speaking") {
    speakState = "prog";
    speakText = "Progress";
  }

  const title = `Test${exam.testNumber ?? 1}`;

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`bg-white rounded-xl overflow-hidden flex flex-col border border-gray-200 shadow-sm transition-transform cursor-pointer h-[340px] hover:-translate-y-1 hover:shadow-md ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      <div className="bg-[#817bb1] text-white px-4 py-3 font-bold text-sm tracking-wide">
        {title}
      </div>
      <div className="flex flex-col p-2 divide-y divide-gray-100 flex-1">
        <SectionRow label="LISTENING" state={lisState} subtext={lisText} />
        <SectionRow label="READING" state={readState} subtext={readText} />
        <SectionRow label="WRITING" state={writState} subtext={writText} />
        <SectionRow label="SPEAKING" state={speakState} subtext={speakText} borderNone />
      </div>
    </div>
  );
};

const SectionRow: React.FC<{
  label: string;
  state: "done" | "prog" | "not";
  subtext: string;
  borderNone?: boolean;
}> = ({ label, state, subtext, borderNone }) => {
  let Icon = FiPlayCircle;
  let iconColor = "text-blue-400";
  let labelColor = "text-gray-800";
  let subColor = "text-gray-400";

  if (state === "done") {
    Icon = FiCheckCircle;
    iconColor = "text-green-500";
  } else if (state === "prog") {
    Icon = FiClock;
    iconColor = "text-red-500";
    labelColor = "text-red-500";
    subColor = "text-red-500";
  }

  return (
    <div className={`flex items-center gap-3 px-3 py-4 flex-1 ${borderNone ? "" : ""}`}>
      <Icon className={`w-[22px] h-[22px] ${iconColor}`} strokeWidth={2.5} />
      <div className="flex flex-col justify-center">
        <p className={`text-[13px] font-bold tracking-tight uppercase leading-none mb-1 ${labelColor}`}>
          {label}
        </p>
        <p className={`text-[11px] leading-none ${subColor}`}>
          {subtext}
        </p>
      </div>
    </div>
  );
};
