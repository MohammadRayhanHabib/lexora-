import React, { useState } from "react";
import {
  FiCheckCircle,
  FiPause,
  FiPlay,
  FiSave,
  FiWifi,
  FiX,
} from "react-icons/fi";
import {
  formatMinutes,
  MODULE_DETAILS,
  PRACTICE_MODULES,
  PracticeModule,
} from "./sectionPracticeData";

interface PracticeExamShellProps {
  module: PracticeModule;
  testTitle: string;
  fullTest: boolean;
  remainingSeconds: number;
  isPaused: boolean;
  onPauseToggle: () => void;
  onSubmit: () => void;
  onSaveAndExit: () => void;
  children: React.ReactNode;
}

type PracticeFontSize = "small" | "default" | "large";

const PRACTICE_FONT_SIZE_KEY = "lexora:practice-font-size:v1";
const PRACTICE_FONT_SIZE_OPTIONS: Array<{
  value: PracticeFontSize;
  label: string;
  title: string;
}> = [
  { value: "small", label: "A−", title: "Smaller question text" },
  { value: "default", label: "A", title: "Default question text" },
  { value: "large", label: "A+", title: "Larger question text" },
];

const readPracticeFontSize = (): PracticeFontSize => {
  if (typeof window === "undefined") return "default";
  try {
    const saved = window.localStorage.getItem(PRACTICE_FONT_SIZE_KEY);
    return saved === "small" || saved === "large" ? saved : "default";
  } catch {
    return "default";
  }
};

const ACTION_BUTTON_FONT: React.CSSProperties = {
  fontFamily:
    'ui-rounded, "Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
};

const CreamActionSurface: React.FC<{ wide?: boolean }> = ({ wide = false }) => (
  <span
    aria-hidden="true"
    className={`pointer-events-none absolute inset-y-px right-px rounded-full bg-[linear-gradient(180deg,#f7ddd3_0%,#fbe8dc_38%,#fff5df_72%,#fffde7_100%)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.58)] ${
      wide ? "left-[10%]" : "left-[13%]"
    }`}
  />
);

const SubmitActionSurface: React.FC = () => (
  <span
    aria-hidden="true"
    className="pointer-events-none absolute inset-y-px left-[13%] right-px rounded-full bg-[linear-gradient(180deg,#e0a7a7_0%,#d95a5e_24%,#bd0008_52%,#c30b10_66%,#e1a198_100%)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)]"
  />
);

const LexoraExamLogo: React.FC = () => (
  <div
    className="flex items-center gap-1.5 text-[#e1192d]"
    role="img"
    aria-label="Lexora Academy"
  >
    <svg
      aria-hidden="true"
      viewBox="0 0 30 30"
      className="h-7 w-7 shrink-0"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 6.5h8.5v12H7.2A3.2 3.2 0 0 1 4 15.3V6.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 9.5h8.3A3.2 3.2 0 0 1 24 12.7v10.8h-8.3a3.2 3.2 0 0 1-3.2-3.2V9.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 22.5h5M7.5 25.5h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
    <span className="leading-none">
      <span className="block text-[10px] font-black tracking-[-0.02em]">
        LEXORA
      </span>
      <span className="mt-0.5 block text-[7px] font-extrabold tracking-[0.04em]">
        ACADEMY
      </span>
    </span>
  </div>
);

const PracticeExamShell: React.FC<PracticeExamShellProps> = ({
  module,
  testTitle,
  fullTest,
  remainingSeconds,
  isPaused,
  onPauseToggle,
  onSubmit,
  onSaveAndExit,
  children,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [fontSize, setFontSize] = useState<PracticeFontSize>(
    readPracticeFontSize,
  );
  const moduleIndex = PRACTICE_MODULES.indexOf(module);
  const [displayMinutes, displaySeconds] =
    formatMinutes(remainingSeconds).split(":");

  const updateFontSize = (nextFontSize: PracticeFontSize) => {
    setFontSize(nextFontSize);
    try {
      window.localStorage.setItem(PRACTICE_FONT_SIZE_KEY, nextFontSize);
    } catch {
      // Font resizing still works for the current page when storage is blocked.
    }
  };

  return (
    <div className="flex min-h-screen min-h-[100dvh] w-full flex-col bg-[#efeaea] text-gray-900">
      <header className="sticky top-0 z-40 shrink-0 border-b border-[#ef9ca2] bg-gradient-to-r from-[#ffe9e9] via-[#ffdfe1] to-[#ffd3d6] shadow-sm">
        <div className="grid min-h-[68px] w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 py-2 sm:px-7">
          <div className="justify-self-start">
            <LexoraExamLogo />
            <span className="sr-only">
              {testTitle}, {MODULE_DETAILS[module].label}
            </span>
          </div>

          <div
            className="flex h-12 min-w-[132px] items-center justify-center gap-3 justify-self-center rounded-full border border-white/60 bg-gradient-to-b from-[#19191e] via-[#0a0a0d] to-[#020204] px-5 font-sans text-[23px] font-normal tracking-[0.08em] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_2px_3px_rgba(87,25,25,0.16)] sm:min-w-[144px] sm:px-6 sm:text-[25px]"
            role="timer"
            aria-label={`${displayMinutes} minutes and ${displaySeconds} seconds remaining`}
          >
            <span>{displayMinutes}</span>
            <span
              className="flex flex-col gap-2"
              aria-hidden="true"
            >
              <span className="h-1.5 w-2.5 rounded-full bg-white" />
              <span className="h-1.5 w-2.5 rounded-full bg-white" />
            </span>
            <span>{displaySeconds}</span>
          </div>

          <div className="flex min-w-0 items-center gap-1.5 justify-self-end sm:gap-3">
            <button
              type="button"
              onClick={onPauseToggle}
              aria-label={isPaused ? "Resume practice" : "Pause practice"}
              className="relative isolate inline-flex h-11 min-w-11 items-center justify-center overflow-hidden rounded-full border border-transparent bg-[linear-gradient(135deg,rgba(241,193,172,0.62)_0%,rgba(246,210,189,0.62)_55%,rgba(237,178,154,0.62)_100%)] px-3 text-xs font-black tracking-[-0.025em] text-black shadow-[0_7px_16px_rgba(188,92,62,0.18)] transition hover:-translate-y-px hover:brightness-105 active:translate-y-0 sm:min-w-[96px] sm:px-5 sm:text-[17px] lg:min-w-[102px]"
              style={ACTION_BUTTON_FONT}
            >
              <CreamActionSurface />
              {isPaused ? (
                <FiPlay className="relative z-10 sm:hidden" />
              ) : (
                <FiPause className="relative z-10 sm:hidden" />
              )}
              <span className="relative z-10 hidden sm:inline">
                {isPaused ? "Resume" : "Pause"}
              </span>
            </button>
            <button
              type="button"
              onClick={onSubmit}
              aria-label={`Submit ${MODULE_DETAILS[module].label} practice`}
              className="relative isolate inline-flex h-11 min-w-11 items-center justify-center overflow-hidden rounded-full border border-transparent bg-[#ae080d]/70 px-3 text-xs font-black tracking-[-0.025em] text-white shadow-[8px_7px_15px_rgba(164,48,43,0.22)] transition hover:-translate-y-px hover:brightness-110 active:translate-y-0 sm:min-w-[100px] sm:px-5 sm:text-[17px] lg:min-w-[108px]"
              style={ACTION_BUTTON_FONT}
            >
              <SubmitActionSurface />
              <span className="relative z-10 hidden sm:inline">Submit</span>
              <span className="relative z-10 sm:hidden" aria-hidden="true">
                S
              </span>
            </button>
            <button
              type="button"
              onClick={onSaveAndExit}
              className="relative isolate hidden h-11 min-w-[128px] items-center justify-center overflow-hidden rounded-full border border-transparent bg-[linear-gradient(135deg,rgba(241,193,172,0.62)_0%,rgba(246,210,189,0.62)_55%,rgba(237,178,154,0.62)_100%)] px-6 text-[17px] font-black tracking-[-0.025em] text-black shadow-[0_7px_16px_rgba(188,92,62,0.18)] transition hover:-translate-y-px hover:brightness-105 active:translate-y-0 md:inline-flex lg:min-w-[140px]"
              style={ACTION_BUTTON_FONT}
            >
              <CreamActionSurface wide />
              <span className="relative z-10">Save &amp; Exit</span>
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-11 w-10 shrink-0 items-center justify-center text-black transition hover:opacity-65 sm:w-12"
              aria-label="Open practice menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? (
                <FiX className="h-8 w-8" />
              ) : (
                <span className="flex w-8 flex-col gap-[6px]" aria-hidden="true">
                  <span className="h-[3px] w-full bg-current" />
                  <span className="h-[3px] w-full bg-current" />
                  <span className="h-[3px] w-full bg-current" />
                </span>
              )}
            </button>
          </div>
        </div>

        {fullTest && (
          <div className="border-t border-primary-200/60 bg-white/75 px-3 py-2 backdrop-blur sm:px-5">
            <div className="flex w-full items-center gap-2 overflow-x-auto">
              {PRACTICE_MODULES.map((item, index) => {
                const active = item === module;
                const complete = index < moduleIndex;
                return (
                  <React.Fragment key={item}>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${
                        active
                          ? "bg-primary-700 text-white"
                          : complete
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {complete ? <FiCheckCircle /> : <span>{index + 1}</span>}
                      {MODULE_DETAILS[item].label}
                    </span>
                    {index < PRACTICE_MODULES.length - 1 && (
                      <span className="h-px w-5 shrink-0 bg-gray-200" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {menuOpen && (
          <div className="absolute right-3 top-[64px] z-50 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-xl sm:right-7">
            <p className="text-sm font-bold text-gray-900">Practice menu</p>
            <p className="mt-1 text-[11px] font-semibold text-gray-600">
              {testTitle} · {MODULE_DETAILS[module].label}
            </p>
            <p className="mt-0.5 text-[10px] text-gray-400">
              {fullTest ? "Full test sequence" : "Individual section practice"}
            </p>
            <div className="mt-3 space-y-2 text-xs text-gray-500">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-gray-700">
                    Question text size
                  </p>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                    Display
                  </span>
                </div>
                <div
                  className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-white p-1 shadow-sm"
                  role="group"
                  aria-label="Question text size"
                >
                  {PRACTICE_FONT_SIZE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateFontSize(option.value)}
                      aria-pressed={fontSize === option.value}
                      title={option.title}
                      className={`flex h-9 items-center justify-center rounded-md font-bold transition ${
                        fontSize === option.value
                          ? "bg-primary-700 text-white shadow-sm"
                          : "text-gray-600 hover:bg-primary-50 hover:text-primary-700"
                      } ${
                        option.value === "small"
                          ? "text-xs"
                          : option.value === "large"
                            ? "text-base"
                            : "text-sm"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
                <FiCheckCircle /> Demo progress status saved locally
              </p>
              <p className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                <FiWifi /> Frontend preview mode
              </p>
              <button
                type="button"
                onClick={onSaveAndExit}
                className="flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 md:hidden"
              >
                <FiSave /> Save &amp; Exit
              </button>
            </div>
          </div>
        )}
      </header>

      <main
        className="flex min-h-0 w-full min-w-0 flex-1 flex-col p-3 sm:p-5"
        data-practice-font-size={fontSize}
      >
        {children}
      </main>

      {isPaused && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/85 p-4 text-center backdrop-blur-sm">
          <div className="max-w-sm rounded-2xl border border-white/10 bg-gray-900 p-8 text-white shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
              <FiPause className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-2xl font-bold">Practice paused</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              Your timer and current answers are safe. Resume when you are ready.
            </p>
            <button
              type="button"
              onClick={onPauseToggle}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-gray-900 hover:bg-gray-100"
            >
              <FiPlay /> Resume practice
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticeExamShell;
