export const PRACTICE_MODULES = [
  "listening",
  "reading",
  "writing",
  "speaking",
] as const;

export type PracticeModule = (typeof PRACTICE_MODULES)[number];
export type SectionPracticeMode = "practice" | "simulation";
export type PracticeProgressStatus =
  | "not_started"
  | "in_progress"
  | "finished";

export interface SectionPracticeTestSet {
  id: string;
  title: string;
  book: string;
  subtitle: string;
  academicNumber: number;
  testNumber: number;
  locked?: boolean;
  lockedReason?: string;
}

export interface ModuleDetail {
  label: string;
  duration: number;
  detail: string;
}

export interface PracticePartOption {
  id: string;
  label: string;
  detail: string;
  suggestedMinutes: number;
}

export interface PracticeModuleModeConfig {
  parts: PracticePartOption[];
  simulationMinutes: number;
}

export type SectionPracticeProgress = Record<
  string,
  Partial<Record<PracticeModule, PracticeProgressStatus>>
>;

export const MODULE_DETAILS: Record<PracticeModule, ModuleDetail> = {
  listening: {
    label: "Listening",
    duration: 30,
    detail: "40 questions",
  },
  reading: {
    label: "Reading",
    duration: 60,
    detail: "3 passages",
  },
  writing: {
    label: "Writing",
    duration: 60,
    detail: "2 tasks",
  },
  speaking: {
    label: "Speaking",
    duration: 14,
    detail: "3 parts",
  },
};

export const PRACTICE_MODE_CONFIG: Record<
  PracticeModule,
  PracticeModuleModeConfig
> = {
  listening: {
    simulationMinutes: 32,
    parts: [
      { id: "1", label: "Part 1", detail: "10 questions", suggestedMinutes: 8 },
      { id: "2", label: "Part 2", detail: "10 questions", suggestedMinutes: 8 },
      { id: "3", label: "Part 3", detail: "10 questions", suggestedMinutes: 8 },
      { id: "4", label: "Part 4", detail: "10 questions", suggestedMinutes: 8 },
    ],
  },
  reading: {
    simulationMinutes: 60,
    parts: [
      { id: "1", label: "Passage 1", detail: "Questions 1–13", suggestedMinutes: 20 },
      { id: "2", label: "Passage 2", detail: "Questions 14–26", suggestedMinutes: 20 },
      { id: "3", label: "Passage 3", detail: "Questions 27–40", suggestedMinutes: 20 },
    ],
  },
  writing: {
    simulationMinutes: 60,
    parts: [
      { id: "1", label: "Task 1", detail: "At least 150 words", suggestedMinutes: 20 },
      { id: "2", label: "Task 2", detail: "At least 250 words", suggestedMinutes: 40 },
    ],
  },
  speaking: {
    simulationMinutes: 14,
    parts: [
      { id: "1", label: "Part 1", detail: "Introduction and interview", suggestedMinutes: 4 },
      { id: "2", label: "Part 2", detail: "Individual long turn", suggestedMinutes: 4 },
      { id: "3", label: "Part 3", detail: "Two-way discussion", suggestedMinutes: 6 },
    ],
  },
};

export const SECTION_PRACTICE_BOOKS = [20, 19, 18] as const;

export const SECTION_PRACTICE_TESTS: SectionPracticeTestSet[] =
  SECTION_PRACTICE_BOOKS.flatMap((academicNumber) =>
    [1, 2, 3, 4].map((testNumber) => ({
      id: `cam${academicNumber}-test-${testNumber}`,
      title: `Test-${testNumber}`,
      book: `Cambridge ${academicNumber}`,
      subtitle: "Academic",
      academicNumber,
      testNumber,
    })),
  );

export const SECTION_PROGRESS_STORAGE_KEY =
  "lexora:section-practice-progress:v1";
export const SECTION_PROGRESS_EVENT = "lexora:section-practice-progress-change";

export function isPracticeModule(value: string | undefined): value is PracticeModule {
  return PRACTICE_MODULES.includes(value as PracticeModule);
}

export function readSectionProgress(): SectionPracticeProgress {
  if (typeof window === "undefined") return {};

  try {
    const saved = window.localStorage.getItem(SECTION_PROGRESS_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as SectionPracticeProgress) : {};
  } catch {
    return {};
  }
}

export function updateModuleProgress(
  testId: string,
  module: PracticeModule,
  status: PracticeProgressStatus,
): SectionPracticeProgress {
  const progress = readSectionProgress();
  const next: SectionPracticeProgress = {
    ...progress,
    [testId]: {
      ...progress[testId],
      [module]: status,
    },
  };

  try {
    window.localStorage.setItem(
      SECTION_PROGRESS_STORAGE_KEY,
      JSON.stringify(next),
    );
    window.dispatchEvent(new Event(SECTION_PROGRESS_EVENT));
  } catch {
    // The UI still works if storage is unavailable.
  }

  return next;
}

export function getModuleStatus(
  progress: SectionPracticeProgress,
  testId: string,
  module: PracticeModule,
): PracticeProgressStatus {
  return progress[testId]?.[module] ?? "not_started";
}

export function formatMinutes(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
