import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import {
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { FiAlertCircle, FiCheckCircle, FiSave, FiSend, FiX } from "react-icons/fi";
import { enrollmentApi, EnrollmentType } from "../../api/enrollment";
import PracticeExamShell from "../../components/practice/section-practice/PracticeExamShell";
import PracticeModuleWorkspace from "../../components/practice/section-practice/PracticeModuleWorkspace";
import { PageLoader } from "../../components/ui/Spinner";
import {
  getModuleStatus,
  isPracticeModule,
  MODULE_DETAILS,
  PRACTICE_MODE_CONFIG,
  PRACTICE_MODULES,
  PracticeModule,
  readSectionProgress,
  SECTION_PRACTICE_TESTS,
  updateModuleProgress,
} from "../../components/practice/section-practice/sectionPracticeData";

type ConfirmationType = "submit" | "exit" | null;

const SectionPracticeWorkspacePage: React.FC = () => {
  const { slug, testId, module: moduleParam } = useParams<{
    slug: string;
    testId: string;
    module: string;
  }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fullTest = searchParams.get("mode") === "full";
  const testSet = SECTION_PRACTICE_TESTS.find((test) => test.id === testId);
  const module = isPracticeModule(moduleParam) ? moduleParam : null;
  const moduleModeConfig = module ? PRACTICE_MODE_CONFIG[module] : null;
  const individualMode =
    searchParams.get("mode") === "simulation" ? "simulation" : "practice";
  const allPartIds = moduleModeConfig?.parts.map((part) => part.id) ?? [];
  const requestedPartIds = (searchParams.get("parts") ?? "")
    .split(",")
    .filter((id) => allPartIds.includes(id));
  const selectedPartIds =
    individualMode === "simulation" || requestedPartIds.length === 0
      ? allPartIds
      : allPartIds.filter((id) => requestedPartIds.includes(id));
  const requestedMinutes = Number(searchParams.get("minutes"));
  const suggestedPracticeMinutes =
    moduleModeConfig?.parts
      .filter((part) => selectedPartIds.includes(part.id))
      .reduce((total, part) => total + part.suggestedMinutes, 0) ?? 0;
  const individualMinutes = moduleModeConfig
    ? individualMode === "simulation"
      ? moduleModeConfig.simulationMinutes
      : Number.isFinite(requestedMinutes) && requestedMinutes > 0
        ? Math.min(180, Math.round(requestedMinutes))
        : suggestedPracticeMinutes
    : 0;
  const partialPractice =
    !fullTest &&
    individualMode === "practice" &&
    selectedPartIds.length < allPartIds.length;

  const initialSeconds = useMemo(() => {
    if (fullTest) {
      return PRACTICE_MODULES.reduce(
        (total, item) => total + MODULE_DETAILS[item].duration * 60,
        0,
      );
    }
    return individualMinutes * 60;
  }, [fullTest, individualMinutes]);

  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationType>(null);
  const [accessGranted, setAccessGranted] = useState<boolean | null>(null);

  useEffect(() => {
    setRemainingSeconds(initialSeconds);
    setIsPaused(false);
  }, [initialSeconds]);

  useEffect(() => {
    if (slug !== "cam-official-book") {
      setAccessGranted(false);
      return;
    }

    enrollmentApi
      .getMyEnrollments()
      .then((enrollments) => {
        setAccessGranted(
          enrollments.some(
            (enrollment) =>
              enrollment.type === EnrollmentType.CAM_OFFICIAL_BOOK &&
              enrollment.isActive,
          ),
        );
      })
      .catch(() => setAccessGranted(false));
  }, [slug]);

  useEffect(() => {
    if (!module || !testId || accessGranted !== true) return;
    const currentStatus = getModuleStatus(
      readSectionProgress(),
      testId,
      module,
    );
    if (currentStatus !== "finished") {
      updateModuleProgress(testId, module, "in_progress");
    }
  }, [accessGranted, module, testId]);

  useEffect(() => {
    if (isPaused || accessGranted !== true) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [accessGranted, isPaused]);

  if (
    !slug ||
    !testId ||
    !testSet ||
    !module ||
    testSet.locked ||
    slug !== "cam-official-book"
  ) {
    return <Navigate to={`/practice/${slug ?? "cam-official-book"}`} replace />;
  }

  if (accessGranted === null) return <PageLoader />;
  if (!accessGranted) return <Navigate to={`/practice/${slug}`} replace />;

  const moduleIndex = PRACTICE_MODULES.indexOf(module);
  const nextModule = PRACTICE_MODULES[moduleIndex + 1] as
    | PracticeModule
    | undefined;
  const returnPath = `/practice/${slug}`;

  const completeConfirmation = () => {
    if (confirmation === "exit") {
      updateModuleProgress(testId, module, "in_progress");
      toast.success("Practice progress saved in this browser");
      navigate(returnPath);
      return;
    }

    if (confirmation === "submit") {
      const currentStatus = getModuleStatus(
        readSectionProgress(),
        testId,
        module,
      );
      updateModuleProgress(
        testId,
        module,
        partialPractice && currentStatus !== "finished"
          ? "in_progress"
          : "finished",
      );

      if (fullTest && nextModule) {
        updateModuleProgress(testId, nextModule, "in_progress");
        setConfirmation(null);
        toast.success(`${MODULE_DETAILS[module].label} completed`);
        navigate(
          `/practice/${slug}/section/${testId}/${nextModule}?mode=full`,
        );
        return;
      }

      toast.success(
        fullTest
          ? "Full test preview completed"
          : partialPractice
            ? "Selected practice parts completed"
            : individualMode === "simulation"
              ? "Simulation test completed"
              : "Section practice completed",
      );
      navigate(returnPath);
    }
  };

  return (
    <>
      <Helmet>
        <title>
          {MODULE_DETAILS[module].label} · {testSet.title} | Lexora
        </title>
      </Helmet>

      <PracticeExamShell
        module={module}
        testTitle={`${testSet.book} ${testSet.title}`}
        fullTest={fullTest}
        remainingSeconds={remainingSeconds}
        isPaused={isPaused}
        onPauseToggle={() => setIsPaused((paused) => !paused)}
        onSubmit={() => setConfirmation("submit")}
        onSaveAndExit={() => setConfirmation("exit")}
      >
        <PracticeModuleWorkspace
          module={module}
          session={
            fullTest
              ? undefined
              : {
                  mode: individualMode,
                  partLabels: PRACTICE_MODE_CONFIG[module].parts
                    .filter((part) => selectedPartIds.includes(part.id))
                    .map((part) => part.label),
                  timeLimitMinutes: individualMinutes,
                }
          }
        />
      </PracticeExamShell>

      {confirmation && (
        <ConfirmationModal
          type={confirmation}
          module={module}
          nextModule={fullTest ? nextModule : undefined}
          partialPractice={partialPractice}
          onCancel={() => setConfirmation(null)}
          onConfirm={completeConfirmation}
        />
      )}
    </>
  );
};

const ConfirmationModal: React.FC<{
  type: Exclude<ConfirmationType, null>;
  module: PracticeModule;
  nextModule?: PracticeModule;
  partialPractice?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ type, module, nextModule, partialPractice, onCancel, onConfirm }) => {
  const submitting = type === "submit";

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-gray-950/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="practice-confirmation-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between px-5 pt-5">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-full ${
              submitting
                ? "bg-primary-100 text-primary-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {submitting ? <FiSend /> : <FiSave />}
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close confirmation"
          >
            <FiX />
          </button>
        </div>

        <div className="px-5 pb-5 pt-4">
          <h2 id="practice-confirmation-title" className="text-xl font-bold text-gray-900">
            {submitting
              ? partialPractice
                ? "Finish selected practice?"
                : `Finish ${MODULE_DETAILS[module].label}?`
              : "Save and leave practice?"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            {submitting
              ? partialPractice
                ? "This completes only the selected parts. The module stays In progress so you can practise the remaining parts later."
                : nextModule
                ? `This marks the section complete and opens ${MODULE_DETAILS[nextModule].label}, the next module in your full test.`
                : "This marks the current section complete and returns you to the practice library."
              : "Your demo status will be kept as In progress, so you can continue from the test card later."}
          </p>

          <div className="mt-4 flex items-start gap-2 rounded-xl bg-gray-50 px-3 py-3 text-xs text-gray-500">
            {submitting ? (
              <FiCheckCircle className="mt-0.5 shrink-0 text-emerald-600" />
            ) : (
              <FiAlertCircle className="mt-0.5 shrink-0 text-amber-600" />
            )}
            This is a frontend preview. No answer or score is submitted to the
            backend.
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100"
          >
            Keep practicing
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-800"
          >
            {submitting ? <FiSend /> : <FiSave />}
            {submitting
              ? partialPractice
                ? "Finish practice"
                : nextModule
                  ? "Finish & continue"
                  : "Finish section"
              : "Save & exit"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SectionPracticeWorkspacePage;
