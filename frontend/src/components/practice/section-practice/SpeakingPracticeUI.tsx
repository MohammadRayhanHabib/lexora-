import React, { useEffect, useState } from "react";
import {
  FiCheck,
  FiMic,
  FiRefreshCw,
  FiSquare,
  FiUser,
  FiVolume2,
} from "react-icons/fi";
import { formatMinutes } from "./sectionPracticeData";

type RecorderState = "ready" | "recording" | "stopped";

const SPEAKING_PARTS = [
  {
    title: "Part 1: Self introduction",
    duration: "3 mins (including preparation)",
    topic: "Transport",
    question: "How far is it from your home to your work or school?",
  },
  {
    title: "Part 2: Individual long turn",
    duration: "4 mins (including preparation)",
    topic: "A memorable journey",
    question: "Describe a journey that you remember well and explain why it was memorable.",
  },
  {
    title: "Part 3: Two-way discussion",
    duration: "5 mins",
    topic: "Travel and society",
    question: "How might the way people travel change in the future?",
  },
] as const;

const WAVEFORM = [12, 22, 16, 30, 19, 35, 25, 42, 18, 31, 15, 28, 37, 20, 32, 14, 26, 18, 34, 23, 16, 29, 19, 12];

const SpeakingPracticeUI: React.FC = () => {
  const [partIndex, setPartIndex] = useState(0);
  const [recorderState, setRecorderState] = useState<RecorderState>("ready");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const part = SPEAKING_PARTS[partIndex];

  useEffect(() => {
    if (recorderState !== "recording") return;
    const timer = window.setInterval(
      () => setRecordingSeconds((seconds) => seconds + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [recorderState]);

  const toggleRecording = () => {
    if (recorderState === "recording") {
      setRecorderState("stopped");
    } else {
      setRecorderState("recording");
      if (recorderState === "ready") setRecordingSeconds(0);
    }
  };

  const nextPart = () => {
    setPartIndex((current) => Math.min(current + 1, SPEAKING_PARTS.length - 1));
    setRecorderState("ready");
    setRecordingSeconds(0);
  };

  return (
    <section className="space-y-3" aria-label="Speaking practice workspace">
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">{part.title}</p>
            <p className="mt-0.5 text-[11px] text-gray-500">Duration: {part.duration}</p>
          </div>
          <div className="flex min-w-0 items-center gap-3 md:w-80">
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white"
              aria-label="Play examiner prompt"
            >
              <FiVolume2 />
            </button>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-primary-500 to-primary-700" />
            </div>
            <span className="text-[10px] font-semibold text-gray-400">
              Prompt
            </span>
          </div>
        </div>
      </div>

      <div className="relative min-h-[calc(100vh-190px)] overflow-hidden rounded-2xl border border-gray-300 bg-gradient-to-br from-slate-700 via-slate-600 to-primary-900 shadow-lg">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute left-[8%] top-0 h-full w-px bg-white" />
          <div className="absolute right-[12%] top-0 h-full w-px bg-white" />
          <div className="absolute left-0 top-[30%] h-px w-full bg-white" />
        </div>

        <div className="relative flex min-h-[calc(100vh-190px)] flex-col items-center justify-end px-4 pb-5 pt-8 sm:px-8">
          <div className="absolute left-1/2 top-[10%] flex -translate-x-1/2 flex-col items-center">
            <div className="flex h-36 w-36 items-center justify-center rounded-full border-4 border-white/60 bg-gradient-to-br from-amber-100 to-amber-300 shadow-2xl sm:h-48 sm:w-48">
              <FiUser className="h-20 w-20 text-slate-700 sm:h-28 sm:w-28" />
            </div>
            <div className="mt-3 rounded-full bg-white/90 px-4 py-1.5 text-xs font-semibold text-gray-700 shadow-sm">
              IELTS examiner
            </div>
          </div>

          <div className="z-10 w-full max-w-4xl rounded-2xl border border-white/30 bg-white/80 p-4 shadow-xl backdrop-blur-md sm:p-5">
            <div className="exam-readable grid gap-2 text-sm sm:grid-cols-[90px_1fr]">
              <span className="font-bold text-gray-600">Topic</span>
              <span className="font-semibold text-gray-900">{part.topic}</span>
              <span className="font-bold text-gray-600">Question</span>
              <span className="font-semibold text-gray-900">{part.question}</span>
            </div>
          </div>

          <div className="z-10 mt-3 w-full max-w-4xl rounded-2xl border border-white/25 bg-gray-950/45 p-4 text-white shadow-xl backdrop-blur-md">
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <span className="w-20 shrink-0 font-mono text-lg font-semibold">
                {formatMinutes(recordingSeconds)}
              </span>

              <div className="flex h-12 flex-1 items-center justify-center gap-1 overflow-hidden rounded-full bg-white px-4">
                {WAVEFORM.map((height, index) => (
                  <span
                    key={index}
                    className={`w-0.5 rounded-full ${
                      recorderState === "recording"
                        ? "animate-pulse bg-primary-500"
                        : "bg-gray-300"
                    }`}
                    style={{ height: `${height}px` }}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={toggleRecording}
                className={`inline-flex min-h-11 min-w-28 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold shadow-lg ${
                  recorderState === "recording"
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-white text-primary-700 hover:bg-primary-50"
                }`}
              >
                {recorderState === "recording" ? <FiSquare /> : <FiMic />}
                {recorderState === "recording"
                  ? "Stop"
                  : recorderState === "stopped"
                    ? "Record again"
                    : "Record"}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setRecorderState("ready");
                  setRecordingSeconds(0);
                }}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/90 px-4 text-xs font-semibold text-gray-800 hover:bg-white"
              >
                <FiRefreshCw /> Repeat prompt
              </button>
              <p className="text-[10px] text-white/70">
                UI simulation only · no microphone audio is uploaded
              </p>
              <button
                type="button"
                disabled={partIndex === SPEAKING_PARTS.length - 1}
                onClick={nextPart}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary-500 px-4 text-xs font-bold text-white hover:bg-primary-600 disabled:opacity-50"
              >
                {recorderState === "stopped" && <FiCheck />}
                Next part
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
        {SPEAKING_PARTS.map((item, index) => (
          <button
            key={item.title}
            type="button"
            onClick={() => {
              setPartIndex(index);
              setRecorderState("ready");
              setRecordingSeconds(0);
            }}
            className={`rounded-full px-4 py-2 text-xs font-semibold ${
              partIndex === index
                ? "bg-primary-700 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            Part {index + 1}
          </button>
        ))}
      </div>
    </section>
  );
};

export default SpeakingPracticeUI;
