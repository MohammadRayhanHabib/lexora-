import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiCheckCircle,
  FiClock,
  FiLock,
  FiPlayCircle,
} from "react-icons/fi";
import PracticeModeChooserModal, {
  PracticeModeSelection,
} from "./PracticeModeChooserModal";
import {
  getModuleStatus,
  isPracticeModule,
  MODULE_DETAILS,
  PRACTICE_MODULES,
  PracticeModule,
  PracticeProgressStatus,
  readSectionProgress,
  SECTION_PRACTICE_BOOKS,
  SECTION_PRACTICE_TESTS,
  SECTION_PROGRESS_EVENT,
  SectionPracticeProgress,
  SectionPracticeTestSet,
  updateModuleProgress,
} from "./sectionPracticeData";

interface SectionPracticeBoardProps {
  slug: string;
  moduleFilter: string;
  variantLabel: string;
}

const STATUS_META: Record<
  PracticeProgressStatus,
  { label: string; action: string; icon: React.ReactNode }
> = {
  not_started: {
    label: "Not started",
    action: "Start",
    icon: <FiPlayCircle className="h-4 w-4" />,
  },
  in_progress: {
    label: "In progress",
    action: "Continue",
    icon: <FiClock className="h-4 w-4" />,
  },
  finished: {
    label: "Finished",
    action: "Review",
    icon: <FiCheckCircle className="h-4 w-4" />,
  },
};

const SectionPracticeBoard: React.FC<SectionPracticeBoardProps> = ({
  slug,
  moduleFilter,
  variantLabel,
}) => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<SectionPracticeProgress>(() =>
    readSectionProgress(),
  );
  const [modeTarget, setModeTarget] = useState<{
    testSet: SectionPracticeTestSet;
    module: PracticeModule;
  } | null>(null);

  useEffect(() => {
    const syncProgress = () => setProgress(readSectionProgress());
    window.addEventListener("storage", syncProgress);
    window.addEventListener(SECTION_PROGRESS_EVENT, syncProgress);
    return () => {
      window.removeEventListener("storage", syncProgress);
      window.removeEventListener(SECTION_PROGRESS_EVENT, syncProgress);
    };
  }, []);

  const selectedModule = useMemo(
    () => (isPracticeModule(moduleFilter) ? moduleFilter : null),
    [moduleFilter],
  );

  const beginModule = (selection: PracticeModeSelection) => {
    if (!modeTarget) return;
    const { testSet, module } = modeTarget;
    if (getModuleStatus(progress, testSet.id, module) !== "finished") {
      updateModuleProgress(testSet.id, module, "in_progress");
    }

    const params = new URLSearchParams({
      mode: selection.mode,
      parts: selection.partIds.join(","),
      minutes: String(selection.timeLimitMinutes),
    });
    setModeTarget(null);
    navigate(
      `/practice/${slug}/section/${testSet.id}/${module}?${params.toString()}`,
    );
  };

  return (
    <section className="space-y-3" aria-label="Cambridge section practice tests">
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
              aria-labelledby={`academic-${academicNumber}-title`}
              className="rounded-2xl bg-[#40385f] px-5 pb-6 pt-5 shadow-sm"
            >
              <div className="grid gap-5 lg:grid-cols-[136px_minmax(0,1fr)] lg:items-start">
                <div className="flex items-center justify-between gap-4 text-white lg:block lg:px-1 lg:pt-3">
                  <div>
                    <h2
                      id={`academic-${academicNumber}-title`}
                      className="text-base font-bold"
                    >
                      {selectedModule
                        ? MODULE_DETAILS[selectedModule].label
                        : "All Modules"}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <p className="text-sm text-white/85">{variantLabel}</p>
                      <span className="font-serif text-4xl font-bold leading-none text-white">
                        {academicNumber}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:-mb-3 xl:translate-y-3 xl:grid-cols-4">
                  {testSets.map((testSet) => (
                    <CompactPracticeCard
                      key={testSet.id}
                      testSet={testSet}
                      progress={progress}
                      selectedModule={selectedModule}
                      onModuleClick={(module) =>
                        setModeTarget({ testSet, module })
                      }
                    />
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {modeTarget && (
        <PracticeModeChooserModal
          testSet={modeTarget.testSet}
          module={modeTarget.module}
          onClose={() => setModeTarget(null)}
          onStart={beginModule}
        />
      )}
    </section>
  );
};

const CompactPracticeCard: React.FC<{
  testSet: SectionPracticeTestSet;
  progress: SectionPracticeProgress;
  selectedModule: PracticeModule | null;
  onModuleClick: (module: PracticeModule) => void;
}> = ({
  testSet,
  progress,
  selectedModule,
  onModuleClick,
}) => {
  const primaryTone = testSet.testNumber % 2 === 1;
  const visibleModules = selectedModule
    ? [selectedModule]
    : PRACTICE_MODULES;
  const statuses = PRACTICE_MODULES.map((module) =>
    getModuleStatus(progress, testSet.id, module),
  );
  const hasProgress = statuses.some((status) => status === "in_progress");

  return (
    <article
      className={`overflow-hidden rounded-xl shadow-[0_8px_14px_rgba(29,26,52,0.22)] transition-transform hover:-translate-y-0.5 ${
        hasProgress ? "ring-2 ring-orange-300" : ""
      } ${testSet.locked ? "opacity-70" : ""}`}
    >
      <div
        className={`flex h-14 w-full items-center px-4 text-left ${
          primaryTone
            ? "bg-[#9d3434] text-white"
            : "bg-[#edf1fa] text-gray-900"
        }`}
      >
        <span className="font-serif text-xl font-semibold">{testSet.title}</span>
      </div>

      <div
        className={`space-y-2 p-3 ${
          primaryTone ? "bg-[#efb1b3]" : "bg-[#e8ecf4]"
        }`}
      >
        {visibleModules.map((module) => {
          const moduleStatus = getModuleStatus(progress, testSet.id, module);
          const meta = STATUS_META[moduleStatus];
          const disabled = Boolean(testSet.locked);

          const statusSurface =
            moduleStatus === "finished"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : moduleStatus === "in_progress"
                ? "border-orange-200 bg-orange-50 text-orange-900"
                : primaryTone
                  ? "border-white bg-white text-gray-900"
                  : "border-[#d0d4dd] bg-[#d0d4dd] text-gray-900";

          return (
            <button
              key={module}
              type="button"
              disabled={disabled}
              onClick={() => onModuleClick(module)}
              title={`${meta.action} ${MODULE_DETAILS[module].label}`}
              aria-label={`${meta.action} ${MODULE_DETAILS[module].label} in ${testSet.book} ${testSet.title}`}
              className={`group flex h-10 w-full items-center gap-2.5 rounded-lg border px-3 text-left text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:cursor-not-allowed ${statusSurface}`}
            >
              <span
                className={`shrink-0 ${
                  moduleStatus === "finished"
                    ? "text-emerald-600"
                    : moduleStatus === "in_progress"
                      ? "text-orange-500"
                      : "text-gray-950"
                }`}
              >
                {testSet.locked ? <FiLock className="h-4 w-4" /> : meta.icon}
              </span>
              <span className="min-w-0 flex-1 truncate font-serif">
                {MODULE_DETAILS[module].label}
              </span>
              <span className="text-[10px] font-sans font-medium opacity-0 transition-opacity group-hover:opacity-70 group-focus:opacity-70">
                {testSet.locked ? "Locked" : meta.action}
              </span>
            </button>
          );
        })}
      </div>
    </article>
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

export default SectionPracticeBoard;
