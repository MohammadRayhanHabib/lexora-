import {
  MODULE_DETAILS,
  PRACTICE_MODULES,
  PracticeModule,
} from "./sectionPracticeData";

export type MockPracticeStatus = "not_started" | "in_progress" | "finished";

export interface MockPracticeAttempt {
  testId: string;
  currentModule: PracticeModule;
  completedModules: PracticeModule[];
  remainingSeconds: number;
  finished: boolean;
  updatedAt: string;
}

export type MockPracticeProgress = Record<string, MockPracticeAttempt>;

export const MOCK_PRACTICE_STORAGE_KEY = "lexora:mock-practice-progress:v1";
export const MOCK_PRACTICE_EVENT = "lexora:mock-practice-progress-change";
export const MOCK_PRACTICE_TOTAL_SECONDS = PRACTICE_MODULES.reduce(
  (total, module) => total + MODULE_DETAILS[module].duration * 60,
  0,
);

export function readMockPracticeProgress(): MockPracticeProgress {
  if (typeof window === "undefined") return {};

  try {
    const saved = window.localStorage.getItem(MOCK_PRACTICE_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as MockPracticeProgress) : {};
  } catch {
    return {};
  }
}

export function createMockPracticeAttempt(testId: string): MockPracticeAttempt {
  return {
    testId,
    currentModule: PRACTICE_MODULES[0],
    completedModules: [],
    remainingSeconds: MOCK_PRACTICE_TOTAL_SECONDS,
    finished: false,
    updatedAt: new Date().toISOString(),
  };
}

export function getMockPracticeAttempt(
  testId: string,
): MockPracticeAttempt | undefined {
  return readMockPracticeProgress()[testId];
}

export function saveMockPracticeAttempt(
  attempt: MockPracticeAttempt,
): MockPracticeAttempt {
  const progress = readMockPracticeProgress();
  const nextAttempt = {
    ...attempt,
    updatedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(
      MOCK_PRACTICE_STORAGE_KEY,
      JSON.stringify({ ...progress, [attempt.testId]: nextAttempt }),
    );
    window.dispatchEvent(new Event(MOCK_PRACTICE_EVENT));
  } catch {
    // The preview remains usable when browser storage is unavailable.
  }

  return nextAttempt;
}

export function startOrResumeMockPractice(testId: string): MockPracticeAttempt {
  const existing = getMockPracticeAttempt(testId);
  if (existing && !existing.finished) return existing;
  return saveMockPracticeAttempt(createMockPracticeAttempt(testId));
}

export function getMockPracticeStatus(
  attempt: MockPracticeAttempt | undefined,
): MockPracticeStatus {
  if (!attempt) return "not_started";
  return attempt.finished ? "finished" : "in_progress";
}
