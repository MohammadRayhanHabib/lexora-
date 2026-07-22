import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiCheckCircle,
  FiClock,
  FiLayers,
  FiLock,
  FiPlayCircle,
} from "react-icons/fi";
import FullPracticeTestModal, {
  FullPracticeTestAction,
} from "./FullPracticeTestModal";
import {
  getMockPracticeStatus,
  MOCK_PRACTICE_EVENT,
  MockPracticeAttempt,
  MockPracticeProgress,
  MockPracticeStatus,
  readMockPracticeProgress,
  startOrResumeMockPractice,
} from "./mockPracticeData";
import {
  MODULE_DETAILS,
  PRACTICE_MODULES,
  SECTION_PRACTICE_BOOKS,
  SECTION_PRACTICE_TESTS,
  SectionPracticeTestSet,
} from "./sectionPracticeData";

interface MockPracticeBoardProps {
  slug: string;
  variantLabel: string;
}

const STATUS_META: Record<
  MockPracticeStatus,
  {
    label: string;
    action: FullPracticeTestAction;
    icon: React.ReactNode;
  }
> = {
  not_started: {
    label: "Not started",
    action: "Start",
    icon: <FiPlayCircle className="h-3.5 w-3.5" />,
  },
  in_progress: {
    label: "In progress",
    action: "Continue",
    icon: <FiClock className="h-3.5 w-3.5" />,
  },
  finished: {
    label: "Finished",
    action: "Retake",
    icon: <FiCheckCircle className="h-3.5 w-3.5" />,
  },
};

const MockPracticeBoard: React.FC<MockPracticeBoardProps> = ({
  slug,
  variantLabel,
}) => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<MockPracticeProgress>(() =>
    readMockPracticeProgress(),
  );
  const [fullMockTarget, setFullMockTarget] =
    useState<SectionPracticeTestSet | null>(null);

  useEffect(() => {
    const syncProgress = () => setProgress(readMockPracticeProgress());
    window.addEventListener("storage", syncProgress);
    window.addEventListener(MOCK_PRACTICE_EVENT, syncProgress);
    return () => {
      window.removeEventListener("storage", syncProgress);
      window.removeEventListener(MOCK_PRACTICE_EVENT, syncProgress);
    };
  }, []);

  const beginFullMock = () => {
    if (!fullMockTarget) return;
    startOrResumeMockPractice(fullMockTarget.id);
    navigate(`/practice/${slug}/mock/${fullMockTarget.id}`);
  };

  return (
    <section className="space-y-3" aria-label="Cambridge full mock tests">
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 px-1 text-[10px] font-medium text-gray-500 sm:text-xs">
        <LegendItem
          icon={<FiPlayCircle />}
          label="Not started"
          iconClassName="text-blue-500"
        />
        <LegendItem
          icon={<FiClock />}
          label="In progress"
          iconClassName="text-orange-500"
        />
        <LegendItem
          icon={<FiCheckCircle />}
          label="Finished"
          iconClassName="text-emerald-600"
        />
        <LegendItem
          icon={<FiLock />}
          label="Locked"
          iconClassName="text-amber-500"
        />
      </div>

      <div className="space-y-9">
        {SECTION_PRACTICE_BOOKS.map((academicNumber) => {
          const testSets = SECTION_PRACTICE_TESTS.filter(
            (testSet) => testSet.academicNumber === academicNumber,
          );

          return (
            <section
              key={academicNumber}
              aria-labelledby={`mock-academic-${academicNumber}-title`}
              className="rounded-2xl bg-[#40385f] px-5 pb-6 pt-5 shadow-sm"
            >
              <div className="grid gap-5 lg:grid-cols-[136px_minmax(0,1fr)] lg:items-start">
                <div className="flex items-center justify-between gap-4 text-white lg:block lg:px-1 lg:pt-3">
                  <div>
                    <h2
                      id={`mock-academic-${academicNumber}-title`}
                      className="text-base font-bold"
                    >
                      All Modules
                    </h2>
                    <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <p className="text-sm text-white/85">{variantLabel}</p>
                      <span className="font-serif text-4xl font-bold leading-none text-white">
                        {academicNumber}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-white/60 lg:mt-5 lg:max-w-[120px]">
                    Full test only · modules cannot be opened individually
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:-mb-3 xl:translate-y-3 xl:grid-cols-4">
                  {testSets.map((testSet) => (
                    <MockCompactCard
                      key={testSet.id}
                      testSet={testSet}
                      attempt={progress[testSet.id]}
                      onOpen={() => setFullMockTarget(testSet)}
                    />
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {fullMockTarget && (
        <FullPracticeTestModal
          testSet={fullMockTarget}
          action={
            STATUS_META[
              getMockPracticeStatus(progress[fullMockTarget.id])
            ].action
          }
          onClose={() => setFullMockTarget(null)}
          onConfirm={beginFullMock}
        />
      )}
    </section>
  );
};

const MockCompactCard: React.FC<{
  testSet: SectionPracticeTestSet;
  attempt?: MockPracticeAttempt;
  onOpen: () => void;
}> = ({ testSet, attempt, onOpen }) => {
  const status = getMockPracticeStatus(attempt);
  const meta = STATUS_META[status];
  const primaryTone = testSet.testNumber % 2 === 1;

  return (
    <button
      type="button"
      disabled={testSet.locked}
      onClick={onOpen}
      title={`${meta.action} ${testSet.book} ${testSet.title} as one full Mock Practice test`}
      aria-label={`${meta.action} ${testSet.book} ${testSet.title} full Mock Practice test. Individual modules cannot be opened.`}
      className={`group block w-full overflow-hidden rounded-xl text-left shadow-[0_8px_14px_rgba(29,26,52,0.22)] transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:cursor-not-allowed disabled:opacity-70 ${
        status === "in_progress"
          ? "ring-2 ring-orange-300"
          : status === "finished"
            ? "ring-2 ring-emerald-300"
            : ""
      }`}
    >
      <span
        className={`flex h-14 w-full items-center justify-between px-4 ${
          primaryTone
            ? "bg-[#9d3434] text-white group-hover:bg-[#8c2e2e]"
            : "bg-[#edf1fa] text-gray-900 group-hover:bg-white"
        }`}
      >
        <span className="inline-flex rounded-full bg-black/30 px-3 py-1 font-serif text-xl font-semibold leading-none text-white shadow-sm">
          {testSet.title}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] font-semibold ${
            primaryTone
              ? "bg-white/12 text-white/90"
              : "bg-white/80 text-gray-500"
          }`}
        >
          {testSet.locked ? <FiLock /> : <FiLayers />}
          Full
        </span>
      </span>

      <span
        className={`block space-y-2 p-3 ${
          primaryTone ? "bg-[#efb1b3]" : "bg-[#e8ecf4]"
        }`}
      >
        {PRACTICE_MODULES.map((module) => {
          const completed = attempt?.completedModules.includes(module);
          const active =
            status === "in_progress" && attempt?.currentModule === module;

          const statusSurface = completed
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : active
              ? "border-orange-200 bg-orange-50 text-orange-900"
              : primaryTone
                ? "border-white bg-[#fff8ef] text-gray-900"
                : "border-[#d0d4dd] bg-[#d0d4dd] text-gray-900";

          return (
            <span
              key={module}
              className={`flex h-10 w-full items-center gap-2.5 rounded-lg border px-3 text-sm font-semibold shadow-sm ${statusSurface}`}
            >
              <span
                className={`shrink-0 ${
                  completed
                    ? "text-emerald-600"
                    : active
                      ? "text-orange-500"
                      : "text-gray-950"
                }`}
              >
                {completed ? (
                  <FiCheckCircle className="h-4 w-4" />
                ) : active ? (
                  <FiClock className="h-4 w-4" />
                ) : (
                  <FiPlayCircle className="h-4 w-4" />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate font-serif">
                {MODULE_DETAILS[module].label}
              </span>
              {active && (
                <span className="text-[10px] font-sans font-medium text-orange-600">
                  Current
                </span>
              )}
            </span>
          );
        })}
      </span>
    </button>
  );
};

const LegendItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  iconClassName: string;
}> = ({ icon, label, iconClassName }) => (
  <span className="inline-flex items-center gap-1 whitespace-nowrap">
    <span className={iconClassName}>{icon}</span>
    {label}
  </span>
);

export default MockPracticeBoard;
