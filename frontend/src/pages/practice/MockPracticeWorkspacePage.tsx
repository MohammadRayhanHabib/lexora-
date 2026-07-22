import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiSave,
  FiSend,
  FiX,
} from "react-icons/fi";
import { enrollmentApi, EnrollmentType } from "../../api/enrollment";
import {
  createMockPracticeAttempt,
  getMockPracticeAttempt,
  MockPracticeAttempt,
  saveMockPracticeAttempt,
} from "../../components/practice/section-practice/mockPracticeData";
import PracticeExamShell from "../../components/practice/section-practice/PracticeExamShell";
import PracticeModuleWorkspace from "../../components/practice/section-practice/PracticeModuleWorkspace";
import {
  MODULE_DETAILS,
  PRACTICE_MODULES,
  PracticeModule,
  SECTION_PRACTICE_TESTS,
} from "../../components/practice/section-practice/sectionPracticeData";
import { PageLoader } from "../../components/ui/Spinner";

type ConfirmationType = "submit" | "exit" | null;

const MockPracticeWorkspacePage: React.FC = () => {
  const { slug, testId } = useParams<{ slug: string; testId: string }>();
  const navigate = useNavigate();
  const testSet = SECTION_PRACTICE_TESTS.find((test) => test.id === testId);
  const [attempt, setAttempt] = useState<MockPracticeAttempt>(() =>
    testId
      ? getMockPracticeAttempt(testId) ?? createMockPracticeAttempt(testId)
      : createMockPracticeAttempt("unknown"),
  );
  const [accessGranted, setAccessGranted] = useState<boolean | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationType>(null);

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
    if (accessGranted !== true || attempt.finished) return;
    saveMockPracticeAttempt(attempt);
  }, [accessGranted, attempt]);

  useEffect(() => {
    if (
      accessGranted !== true ||
      isPaused ||
      attempt.finished ||
      attempt.remainingSeconds <= 0
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setAttempt((current) => ({
        ...current,
        remainingSeconds: Math.max(0, current.remainingSeconds - 1),
      }));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [accessGranted, attempt.finished, attempt.remainingSeconds, isPaused]);

  if (
    !slug ||
    !testId ||
    !testSet ||
    testSet.locked ||
    slug !== "cam-official-book"
  ) {
    return <Navigate to={`/practice/${slug ?? "cam-official-book"}?tab=mock`} replace />;
  }

  if (accessGranted === null) return <PageLoader />;
  if (!accessGranted) {
    return <Navigate to={`/practice/${slug}?tab=mock`} replace />;
  }

  if (attempt.finished) {
    return <Navigate to={`/practice/${slug}?tab=mock`} replace />;
  }

  const currentModule = attempt.currentModule;
  const moduleIndex = PRACTICE_MODULES.indexOf(currentModule);
  const nextModule = PRACTICE_MODULES[moduleIndex + 1] as
    | PracticeModule
    | undefined;
  const returnPath = `/practice/${slug}?tab=mock`;

  const completeConfirmation = () => {
    if (confirmation === "exit") {
      saveMockPracticeAttempt(attempt);
      toast.success("Mock test progress saved in this browser");
      navigate(returnPath);
      return;
    }

    if (confirmation !== "submit") return;

    const completedModules = Array.from(
      new Set([...attempt.completedModules, currentModule]),
    ) as PracticeModule[];

    if (nextModule) {
      const nextAttempt = saveMockPracticeAttempt({
        ...attempt,
        currentModule: nextModule,
        completedModules,
      });
      setAttempt(nextAttempt);
      setConfirmation(null);
      setIsPaused(false);
      toast.success(
        `${MODULE_DETAILS[currentModule].label} completed. ${MODULE_DETAILS[nextModule].label} is next.`,
      );
      return;
    }

    saveMockPracticeAttempt({
      ...attempt,
      completedModules: [...PRACTICE_MODULES],
      finished: true,
    });
    toast.success("Full Mock Practice completed");
    navigate(returnPath);
  };

  return (
    <>
      <Helmet>
        <title>
          {MODULE_DETAILS[currentModule].label} · {testSet.book} {testSet.title}
          Mock | Lexora
        </title>
      </Helmet>

      <PracticeExamShell
        module={currentModule}
        testTitle={`${testSet.book} ${testSet.title} Mock`}
        fullTest
        remainingSeconds={attempt.remainingSeconds}
        isPaused={isPaused}
        onPauseToggle={() => setIsPaused((paused) => !paused)}
        onSubmit={() => setConfirmation("submit")}
        onSaveAndExit={() => setConfirmation("exit")}
      >
        <PracticeModuleWorkspace
          key={`${testId}-${currentModule}`}
          module={currentModule}
        />
      </PracticeExamShell>

      {confirmation && (
        <MockConfirmationModal
          type={confirmation}
          module={currentModule}
          nextModule={nextModule}
          onCancel={() => setConfirmation(null)}
          onConfirm={completeConfirmation}
        />
      )}
    </>
  );
};

const MockConfirmationModal: React.FC<{
  type: Exclude<ConfirmationType, null>;
  module: PracticeModule;
  nextModule?: PracticeModule;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ type, module, nextModule, onCancel, onConfirm }) => {
  const submitting = type === "submit";

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-gray-950/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mock-confirmation-title"
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
          <h2
            id="mock-confirmation-title"
            className="text-xl font-bold text-gray-900"
          >
            {submitting
              ? `Finish ${MODULE_DETAILS[module].label}?`
              : "Save and leave Mock Practice?"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            {submitting
              ? nextModule
                ? `${MODULE_DETAILS[nextModule].label} opens next. You cannot choose modules individually in Mock Practice.`
                : "This completes the full four-module Mock Practice test."
              : "Your current module, completed modules and remaining mock timer will be kept in this browser."}
          </p>

          <div className="mt-4 flex items-start gap-2 rounded-xl bg-gray-50 px-3 py-3 text-xs text-gray-500">
            {submitting ? (
              <FiCheckCircle className="mt-0.5 shrink-0 text-emerald-600" />
            ) : (
              <FiAlertCircle className="mt-0.5 shrink-0 text-amber-600" />
            )}
            Frontend preview only. Backend attempt submission will be connected
            when its API is available.
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
              ? nextModule
                ? "Finish & continue"
                : "Finish mock test"
              : "Save & exit"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MockPracticeWorkspacePage;
