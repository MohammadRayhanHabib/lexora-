import React, { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  Mic,
  MicOff,
  Clock,
  Send,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  MessageSquare,
} from "lucide-react";
import { getSpeakingTest } from "../../api/speaking";
import {
  startSpeakingSession,
  getSpeakingTimer,
  setPartTimer as setPartTimerApi,
  uploadSpeakingAudio,
  submitSpeakingSession,
} from "../../api/speaking";
import {
  ISpeakingTest,
  ISpeakingSession,
  ISpeakingRecording,
} from "../../types";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { useCountdown } from "../../hooks/useCountdown";
import toast from "react-hot-toast";

type SpeakingPart = 1 | 2 | 3;
type Part2Step = "prep" | "speaking";

const SpeakingTestPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = (searchParams.get("mode") ?? "practice") as "practice" | "exam";

  const [test, setTest] = useState<ISpeakingTest | null>(null);
  const [_session, setSession] = useState<ISpeakingSession | null>(null);
  const [currentPart, setCurrentPart] = useState<SpeakingPart>(1);
  const [part2Step, setPart2Step] = useState<Part2Step>("prep");
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [recordings, setRecordings] = useState<ISpeakingRecording[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [micPermission, setMicPermission] = useState<
    "unknown" | "granted" | "denied"
  >("unknown");

  const recorder = useAudioRecorder();

  const globalTimer = useCountdown({ warningThreshold: 120 });
  const partTimer = useCountdown({
    onExpire: () => handlePartTimerExpire(),
  });
  const prepTimer = useCountdown({
    onExpire: () => {
      if (part2Step === "prep") {
        toast("Preparation time over! Start speaking now.", { icon: "🎙️" });
        handleStartPart2Speaking();
      }
    },
  });

  // ── Load test & start session ─────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const testRes = await getSpeakingTest(id);
        const t: ISpeakingTest = testRes.data.data;
        setTest(t);

        const { data } = await startSpeakingSession(id, mode);
        const { session: sess } = data.data;
        setSession(sess);
        if (sess.recordings) setRecordings(sess.recordings);

        // Sync global timer
        const timerRes = await getSpeakingTimer(id);
        if (timerRes.data.data) {
          globalTimer.startFromExpiry(timerRes.data.data.expiresAt);
        }

        // Check mic permission
        navigator.permissions
          ?.query({ name: "microphone" as PermissionName })
          .then((result) => {
            setMicPermission(
              result.state === "granted"
                ? "granted"
                : result.state === "denied"
                  ? "denied"
                  : "unknown",
            );
          })
          .catch(() => {});
      } catch (err: any) {
        toast.error(err.response?.data?.message ?? "Failed to load test");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, mode]);

  // ── Part timer expire ──────────────────────────────────────────────────────
  const handlePartTimerExpire = useCallback(() => {
    if (currentPart === 1) {
      goToPart2();
    } else if (currentPart === 3) {
      handleSubmit();
    }
  }, [currentPart]);

  // ── Part 1: Start recording a question ─────────────────────────────────────
  const startPart1Recording = async () => {
    if (recorder.isRecording) {
      await stopAndUpload(1, currentQIndex);
    } else {
      await recorder.startRecording();
    }
  };

  const stopAndUpload = async (part: SpeakingPart, questionIndex?: number) => {
    recorder.stopRecording();
    // Small delay to allow ondataavailable to fire
    await new Promise((r) => setTimeout(r, 300));
    if (recorder.audioBlob) {
      await doUpload(
        recorder.audioBlob,
        part,
        questionIndex,
        recorder.duration,
      );
    }
    recorder.reset();
  };

  const doUpload = async (
    blob: Blob,
    part: SpeakingPart,
    questionIndex?: number,
    durationSeconds?: number,
  ) => {
    if (!test) return;
    setUploading(true);
    const formData = new FormData();
    const ext = blob.type.includes("webm") ? "webm" : "wav";
    formData.append("audio", blob, `recording_${Date.now()}.${ext}`);
    formData.append("testId", test._id);
    formData.append("part", String(part));
    if (questionIndex !== undefined)
      formData.append("questionIndex", String(questionIndex));
    if (durationSeconds !== undefined)
      formData.append("durationSeconds", String(durationSeconds));

    try {
      const { data } = await uploadSpeakingAudio(formData, (p) =>
        setUploadProgress(p),
      );
      const { audioUrl } = data.data;
      const rec: ISpeakingRecording = {
        part,
        questionIndex,
        audioUrl,
        durationSeconds,
        uploadedAt: new Date().toISOString(),
      };
      setRecordings((prev) => [...prev, rec]);
      toast.success("Recording saved", { duration: 1500 });
    } catch {
      toast.error("Failed to upload recording");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // ── Part 2 flow ───────────────────────────────────────────────────────────
  const startPart2Prep = async () => {
    if (!test) return;
    setPart2Step("prep");
    // Set part timer for prep
    try {
      const { data } = await setPartTimerApi(test._id, 2, test.prepTime);
      prepTimer.startFromExpiry(data.data.expiresAt);
    } catch {
      prepTimer.startFromDuration(test.prepTime);
    }
  };

  const handleStartPart2Speaking = async () => {
    if (!test) return;
    setPart2Step("speaking");
    prepTimer.stop();
    await recorder.startRecording();
    try {
      const { data } = await setPartTimerApi(test._id, 2, test.speakingTime);
      partTimer.startFromExpiry(data.data.expiresAt);
    } catch {
      partTimer.startFromDuration(test.speakingTime);
    }
  };

  const finishPart2Speaking = async () => {
    partTimer.stop();
    if (recorder.isRecording) {
      await stopAndUpload(2, 0);
    }
    goToPart3();
  };

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goToPart2 = async () => {
    if (recorder.isRecording) {
      await stopAndUpload(1, currentQIndex);
    }
    setCurrentPart(2);
    setCurrentQIndex(0);
    await startPart2Prep();
  };

  const goToPart3 = async () => {
    setCurrentPart(3);
    setCurrentQIndex(0);
  };

  const nextQuestion = async () => {
    if (!test) return;
    if (recorder.isRecording) {
      await stopAndUpload(currentPart, currentQIndex);
    }
    const questions =
      currentPart === 1 ? test.part1Questions : test.part3Questions;
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex((i) => i + 1);
    } else if (currentPart === 1) {
      await goToPart2();
    } else {
      await handleSubmit();
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!test || submitting) return;
    if (recorder.isRecording) {
      await stopAndUpload(currentPart, currentQIndex);
      await new Promise((r) => setTimeout(r, 500));
    }
    setSubmitting(true);
    globalTimer.stop();
    partTimer.stop();
    try {
      const { data } = await submitSpeakingSession(test._id);
      toast.success("Session submitted!");
      navigate(`/speaking/result/${data.data._id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!test) return null;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mic className="w-5 h-5 text-purple-600" />
            <div>
              <p className="font-semibold text-gray-900 text-sm">
                {test.title}
              </p>
              <p className="text-xs text-gray-400 capitalize">{mode} Mode</p>
            </div>
          </div>

          {/* Global Timer */}
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-sm ${
              globalTimer.warning
                ? "bg-red-50 text-red-600"
                : "bg-purple-50 text-purple-700"
            }`}
          >
            <Clock className="w-4 h-4" />
            {globalTimer.formattedTime}
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg px-4 py-1.5 disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
            {submitting ? "Submitting…" : "Submit All"}
          </button>
        </div>
      </nav>

      {/* ── Part progress bar ──────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex gap-3">
          {[1, 2, 3].map((p) => (
            <div
              key={p}
              className={`flex-1 py-2 rounded-lg text-center text-xs font-semibold transition-colors ${
                currentPart === p
                  ? "bg-purple-600 text-white"
                  : currentPart > p
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {currentPart > p ? "✓ " : ""}
              Part {p}
              {p === 1 && " — Interview"}
              {p === 2 && " — Cue Card"}
              {p === 3 && " — Discussion"}
            </div>
          ))}
        </div>
      </div>

      {/* ── Mic permission warning ─────────────────────────────────────────── */}
      {micPermission === "denied" && (
        <div className="max-w-5xl mx-auto px-4 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            Microphone access is blocked. Please allow microphone in browser
            settings to record.
          </div>
        </div>
      )}

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {/* ── PART 1 ──────────────────────────────────────────────────────── */}
        {currentPart === 1 && (
          <Part1Interface
            questions={test.part1Questions}
            currentIndex={currentQIndex}
            recorder={recorder}
            recordings={recordings}
            uploading={uploading}
            uploadProgress={uploadProgress}
            mode={mode}
            onRecord={startPart1Recording}
            onNext={nextQuestion}
          />
        )}

        {/* ── PART 2 ──────────────────────────────────────────────────────── */}
        {currentPart === 2 && (
          <Part2Interface
            test={test}
            step={part2Step}
            prepTimer={prepTimer}
            partTimer={partTimer}
            recorder={recorder}
            recordings={recordings}
            uploading={uploading}
            uploadProgress={uploadProgress}
            mode={mode}
            onStartSpeaking={handleStartPart2Speaking}
            onFinish={finishPart2Speaking}
          />
        )}

        {/* ── PART 3 ──────────────────────────────────────────────────────── */}
        {currentPart === 3 && (
          <Part3Interface
            questions={test.part3Questions}
            currentIndex={currentQIndex}
            recorder={recorder}
            recordings={recordings}
            uploading={uploading}
            uploadProgress={uploadProgress}
            mode={mode}
            onRecord={() =>
              recorder.isRecording
                ? stopAndUpload(3, currentQIndex)
                : recorder.startRecording()
            }
            onNext={nextQuestion}
            isLast={currentQIndex === test.part3Questions.length - 1}
          />
        )}
      </div>
    </div>
  );
};

// ── Part 1 Component ──────────────────────────────────────────────────────────

interface Part1Props {
  questions: string[];
  currentIndex: number;
  recorder: ReturnType<typeof useAudioRecorder>;
  recordings: ISpeakingRecording[];
  uploading: boolean;
  uploadProgress: number;
  mode: string;
  onRecord: () => void;
  onNext: () => void;
}

const Part1Interface: React.FC<Part1Props> = ({
  questions,
  currentIndex,
  recorder,
  recordings,
  uploading,
  uploadProgress,
  onRecord,
  onNext,
}) => {
  const q = questions[currentIndex];
  const hasRecording = recordings.some(
    (r) => r.part === 1 && r.questionIndex === currentIndex,
  );

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-purple-600" />
          <h2 className="font-semibold text-gray-800">Part 1 — Interview</h2>
          <span className="ml-auto text-sm text-gray-400">
            {currentIndex + 1} / {questions.length}
          </span>
        </div>

        <div className="bg-purple-50 rounded-xl p-5 mb-6">
          <p className="text-gray-800 font-medium text-lg leading-relaxed">
            "{q}"
          </p>
        </div>

        {/* Recording indicator */}
        {recorder.isRecording && (
          <div className="flex items-center gap-2 mb-4 text-red-500">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium">
              Recording… {recorder.formattedDuration}
            </span>
          </div>
        )}

        {uploading && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Uploading…</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {hasRecording && !recorder.isRecording && (
          <div className="flex items-center gap-2 text-green-600 text-sm mb-4">
            <CheckCircle2 className="w-4 h-4" />
            Recording saved
          </div>
        )}

        {recorder.error && (
          <div className="text-red-500 text-sm mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {recorder.error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onRecord}
            disabled={uploading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 ${
              recorder.isRecording
                ? "bg-red-100 hover:bg-red-200 text-red-700"
                : "bg-purple-100 hover:bg-purple-200 text-purple-700"
            }`}
          >
            {recorder.isRecording ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
            {recorder.isRecording ? "Stop & Save" : "Start Recording"}
          </button>

          <button
            onClick={onNext}
            disabled={recorder.isRecording || uploading}
            className="ml-auto flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
          >
            {currentIndex === questions.length - 1
              ? "Go to Part 2"
              : "Next Question"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Question list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase mb-3">
          All Questions
        </p>
        <div className="space-y-1">
          {questions.map((q, i) => (
            <div
              key={i}
              className={`text-sm px-3 py-2 rounded-lg flex items-center gap-2 ${
                i === currentIndex
                  ? "bg-purple-50 text-purple-700 font-medium"
                  : "text-gray-500"
              }`}
            >
              {recordings.some((r) => r.part === 1 && r.questionIndex === i) ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-gray-300 shrink-0" />
              )}
              {q}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Part 2 Component ──────────────────────────────────────────────────────────

interface Part2Props {
  test: ISpeakingTest;
  step: Part2Step;
  prepTimer: ReturnType<typeof useCountdown>;
  partTimer: ReturnType<typeof useCountdown>;
  recorder: ReturnType<typeof useAudioRecorder>;
  recordings: ISpeakingRecording[];
  uploading: boolean;
  uploadProgress: number;
  mode: string;
  onStartSpeaking: () => void;
  onFinish: () => void;
}

const Part2Interface: React.FC<Part2Props> = ({
  test,
  step,
  prepTimer,
  partTimer,
  recorder,
  recordings,
  uploading,
  uploadProgress,
  mode,
  onStartSpeaking,
  onFinish,
}) => {
  const hasPart2Recording = recordings.some((r) => r.part === 2);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-purple-600" />
        <h2 className="font-semibold text-gray-800">Part 2 — Cue Card</h2>
        <span
          className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold ${
            step === "prep"
              ? "bg-yellow-50 text-yellow-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          {step === "prep" ? "Preparation Time" : "Speaking Time"}
        </span>
      </div>

      {/* Cue card */}
      <div className="border-2 border-dashed border-purple-200 rounded-2xl p-6 bg-purple-50">
        <p className="font-bold text-gray-800 text-lg mb-3">
          {test.cueCardTopic}
        </p>
        {test.cueCardInstructions && (
          <p className="text-gray-600 text-sm whitespace-pre-line">
            {test.cueCardInstructions}
          </p>
        )}
      </div>

      {/* Prep phase */}
      {step === "prep" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-yellow-50 rounded-xl px-4 py-3">
            <Clock className="w-5 h-5 text-yellow-600" />
            <span className="text-yellow-700 font-medium">
              Preparation time:{" "}
              <span className="font-bold font-mono">
                {prepTimer.formattedTime}
              </span>
            </span>
          </div>
          {mode === "practice" && (
            <textarea
              placeholder="(Practice mode) Jot down notes here…"
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          )}
          <button
            onClick={onStartSpeaking}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 rounded-xl text-sm flex items-center justify-center gap-2"
          >
            <Mic className="w-4 h-4" />
            I'm Ready — Start Speaking
          </button>
        </div>
      )}

      {/* Speaking phase */}
      {step === "speaking" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-red-50 rounded-xl px-4 py-3">
            <Clock className="w-5 h-5 text-red-500" />
            <span className="text-red-600 font-medium">
              Speaking time:{" "}
              <span className="font-bold font-mono">
                {partTimer.formattedTime}
              </span>
            </span>
          </div>

          {recorder.isRecording && (
            <div className="flex items-center gap-2 text-red-500">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium">
                Recording… {recorder.formattedDuration}
              </span>
            </div>
          )}

          {uploading && (
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Uploading…</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {hasPart2Recording && !recorder.isRecording && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Recording saved
            </div>
          )}

          <button
            onClick={onFinish}
            disabled={uploading}
            className="w-full bg-gray-800 hover:bg-gray-900 text-white font-medium py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
            Finish & Go to Part 3
          </button>
        </div>
      )}
    </div>
  );
};

// ── Part 3 Component ──────────────────────────────────────────────────────────

interface Part3Props {
  questions: string[];
  currentIndex: number;
  recorder: ReturnType<typeof useAudioRecorder>;
  recordings: ISpeakingRecording[];
  uploading: boolean;
  uploadProgress: number;
  mode: string;
  onRecord: () => void;
  onNext: () => void;
  isLast: boolean;
}

const Part3Interface: React.FC<Part3Props> = ({
  questions,
  currentIndex,
  recorder,
  recordings,
  uploading,
  uploadProgress,
  onRecord,
  onNext,
  isLast,
}) => {
  const q = questions[currentIndex];
  const hasRecording = recordings.some(
    (r) => r.part === 3 && r.questionIndex === currentIndex,
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="w-5 h-5 text-purple-600" />
        <h2 className="font-semibold text-gray-800">Part 3 — Discussion</h2>
        <span className="ml-auto text-sm text-gray-400">
          {currentIndex + 1} / {questions.length}
        </span>
      </div>

      <div className="bg-gray-50 rounded-xl p-5">
        <p className="text-gray-800 font-medium text-lg leading-relaxed">
          "{q}"
        </p>
      </div>

      {recorder.isRecording && (
        <div className="flex items-center gap-2 text-red-500">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-medium">
            Recording… {recorder.formattedDuration}
          </span>
        </div>
      )}

      {uploading && (
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Uploading…</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {hasRecording && !recorder.isRecording && (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          Recording saved
        </div>
      )}

      {recorder.error && (
        <p className="text-red-500 text-sm">{recorder.error}</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onRecord}
          disabled={uploading}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 ${
            recorder.isRecording
              ? "bg-red-100 hover:bg-red-200 text-red-700"
              : "bg-purple-100 hover:bg-purple-200 text-purple-700"
          }`}
        >
          {recorder.isRecording ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
          {recorder.isRecording ? "Stop & Save" : "Start Recording"}
        </button>

        <button
          onClick={onNext}
          disabled={recorder.isRecording || uploading}
          className="ml-auto flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm disabled:opacity-50"
        >
          {isLast ? "Finish & Submit" : "Next Question"}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SpeakingTestPage;
