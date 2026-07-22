import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import {
  enrollmentApi,
  EnrollmentType,
  EnrolledModule,
  IEnrollment,
  MODULE_META,
} from "../../api/enrollment";
import { PageLoader } from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import {
  FiHeadphones,
  FiBookOpen,
  FiEdit3,
  FiMic,
  FiCheckCircle,
  FiArrowRight,
  FiLogIn,
  FiChevronLeft,
} from "react-icons/fi";

const MODULE_ICONS: Record<EnrolledModule, React.ReactNode> = {
  [EnrolledModule.READING]: <FiBookOpen className="h-7 w-7" />,
  [EnrolledModule.LISTENING]: <FiHeadphones className="h-7 w-7" />,
  [EnrolledModule.WRITING]: <FiEdit3 className="h-7 w-7" />,
  [EnrolledModule.SPEAKING]: <FiMic className="h-7 w-7" />,
};

const MODULE_DESCRIPTIONS: Record<EnrolledModule, string> = {
  [EnrolledModule.READING]:
    "Passage-based exercises covering all IELTS reading question types.",
  [EnrolledModule.LISTENING]:
    "Audio-based practice across four sections with varied accents.",
  [EnrolledModule.WRITING]:
    "Task 1 (graph/chart) and Task 2 (essay) writing practice with model answers.",
  [EnrolledModule.SPEAKING]:
    "Part 1–3 speaking practice with cue cards and follow-up questions.",
};

const MODULE_ORDER: EnrolledModule[] = [
  EnrolledModule.READING,
  EnrolledModule.LISTENING,
  EnrolledModule.WRITING,
  EnrolledModule.SPEAKING,
];

/** Same pattern as reading: enrolled module practice opens the module’s main app route. */
const MODULE_PRACTICE_HOME: Partial<Record<EnrolledModule, string>> = {
  [EnrolledModule.READING]: "/reading",
  [EnrolledModule.LISTENING]: "/listening",
  [EnrolledModule.WRITING]: "/writing",
};

const MODULE_GRADIENTS: Record<EnrolledModule, string> = {
  [EnrolledModule.READING]: "from-blue-600 to-blue-800",
  [EnrolledModule.LISTENING]: "from-purple-600 to-purple-800",
  [EnrolledModule.WRITING]: "from-emerald-600 to-emerald-800",
  [EnrolledModule.SPEAKING]: "from-amber-500 to-amber-700",
};

const IndividualModulePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<IEnrollment[]>([]);
  const [enrolling, setEnrolling] = useState<EnrolledModule | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await enrollmentApi.getMyEnrollments();
        // Filter to only individual_module enrollments
        setEnrollments(
          data.filter((e) => e.type === EnrollmentType.INDIVIDUAL_MODULE),
        );
      } catch {
        toast.error("Failed to load enrollments");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const isModuleEnrolled = (mod: EnrolledModule) =>
    enrollments.some((e) => e.module === mod && e.isActive);

  const handleEnroll = async (mod: EnrolledModule) => {
    setEnrolling(mod);
    try {
      const enrollment = await enrollmentApi.enroll(
        EnrollmentType.INDIVIDUAL_MODULE,
        mod,
      );
      setEnrollments((prev) => [...prev, enrollment]);
      toast.success(`Enrolled in ${MODULE_META[mod].label} module!`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Enrollment failed");
    } finally {
      setEnrolling(null);
    }
  };

  const handleContinue = (mod: EnrolledModule) => {
    const home = MODULE_PRACTICE_HOME[mod];
    if (home) navigate(home);
    else navigate(`/practice/individual/${mod}`);
  };

  if (loading) return <PageLoader />;

  return (
    <>
      <Helmet>
        <title>Individual Module – Practice | Lexora</title>
      </Helmet>

      <div className="space-y-8">
        {/* Back + header */}
        <div>
          <button
            onClick={() => navigate("/practice")}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3 transition-colors"
          >
            <FiChevronLeft className="h-4 w-4" />
            Back to Practice
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Individual Module
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Enroll in one or more IELTS modules to practise them independently.
          </p>
        </div>

        {/* Module cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {MODULE_ORDER.map((mod) => {
            const meta = MODULE_META[mod];
            const enrolled = isModuleEnrolled(mod);
            const busy = enrolling === mod;

            return (
              <div
                key={mod}
                className="rounded-2xl overflow-hidden shadow-md flex flex-col"
              >
                {/* Gradient header */}
                <div
                  className={`bg-gradient-to-br ${MODULE_GRADIENTS[mod]} p-5 text-white`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="p-2 bg-white/20 rounded-lg">
                      {MODULE_ICONS[mod]}
                    </span>
                    {enrolled && (
                      <span className="flex items-center gap-1 text-xs bg-white/20 rounded-full px-2 py-0.5">
                        <FiCheckCircle className="h-3 w-3" />
                        Enrolled
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold">{meta.label}</h2>
                </div>

                {/* Body */}
                <div className="bg-white p-4 flex flex-col flex-1 gap-4">
                  <p className="text-sm text-gray-500 flex-1">
                    {MODULE_DESCRIPTIONS[mod]}
                  </p>

                  {enrolled ? (
                    <Button
                      size="sm"
                      className="w-full flex items-center justify-center gap-2"
                      onClick={() => handleContinue(mod)}
                    >
                      Start Practice
                      <FiArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2"
                      loading={busy}
                      onClick={() => handleEnroll(mod)}
                    >
                      {!busy && <FiLogIn className="h-4 w-4" />}
                      ENROLL NOW
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default IndividualModulePage;
