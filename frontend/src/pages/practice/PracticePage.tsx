import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import {
  enrollmentApi,
  EnrollmentType,
  IEnrollment,
  ENROLLMENT_META,
} from "../../api/enrollment";
import { PageLoader } from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import {
  FiBook,
  FiStar,
  FiClock,
  FiLayers,
  FiCheckCircle,
  FiArrowRight,
  FiLogIn,
} from "react-icons/fi";

const TYPE_ICONS: Record<EnrollmentType, React.ReactNode> = {
  [EnrollmentType.CAM_OFFICIAL_BOOK]: <FiBook className="h-7 w-7" />,
  [EnrollmentType.POPULAR_TESTS]: <FiStar className="h-7 w-7" />,
  [EnrollmentType.RECENT_TESTS]: <FiClock className="h-7 w-7" />,
  [EnrollmentType.INDIVIDUAL_MODULE]: <FiLayers className="h-7 w-7" />,
};

const TYPE_ROUTE: Record<EnrollmentType, string> = {
  [EnrollmentType.CAM_OFFICIAL_BOOK]: "/practice/cam-official-book",
  [EnrollmentType.POPULAR_TESTS]: "/practice/popular-tests",
  [EnrollmentType.RECENT_TESTS]: "/practice/recent-tests",
  [EnrollmentType.INDIVIDUAL_MODULE]: "/practice/individual",
};

const ENROLLMENT_ORDER: EnrollmentType[] = [
  EnrollmentType.CAM_OFFICIAL_BOOK,
  EnrollmentType.POPULAR_TESTS,
  EnrollmentType.RECENT_TESTS,
  EnrollmentType.INDIVIDUAL_MODULE,
];

const PracticePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<IEnrollment[]>([]);
  const [enrolling, setEnrolling] = useState<EnrollmentType | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await enrollmentApi.getMyEnrollments();
        setEnrollments(data);
      } catch {
        toast.error("Failed to load enrollments");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const isEnrolled = (type: EnrollmentType) =>
    enrollments.some((e) => e.type === type && e.isActive);

  const handleEnroll = async (type: EnrollmentType) => {
    // INDIVIDUAL_MODULE requires a module selection — navigate to that page
    if (type === EnrollmentType.INDIVIDUAL_MODULE) {
      navigate(TYPE_ROUTE[EnrollmentType.INDIVIDUAL_MODULE]);
      return;
    }
    setEnrolling(type);
    try {
      const enrollment = await enrollmentApi.enroll(type);
      setEnrollments((prev) => [...prev, enrollment]);
      toast.success(`Enrolled in ${ENROLLMENT_META[type].label}!`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Enrollment failed");
    } finally {
      setEnrolling(null);
    }
  };

  const handleContinue = (type: EnrollmentType) => {
    navigate(TYPE_ROUTE[type]);
  };

  if (loading) return <PageLoader />;

  return (
    <>
      <Helmet>
        <title>Practice – Lexora</title>
      </Helmet>

      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Practice Section</h1>
          <p className="mt-1 text-sm text-gray-500">
            Enroll in a practice category to access tests and improve your IELTS
            score.
          </p>
        </div>

        {/* Enrollment cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ENROLLMENT_ORDER.map((type) => {
            const meta = ENROLLMENT_META[type];
            const enrolled = isEnrolled(type);
            const busy = enrolling === type;

            return (
              <div
                key={type}
                className="relative rounded-2xl overflow-hidden shadow-md flex flex-col"
              >
                {/* Gradient header */}
                <div
                  className={`bg-gradient-to-br ${meta.color} p-5 text-white`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="p-2 bg-white/20 rounded-lg">
                      {TYPE_ICONS[type]}
                    </span>
                    {enrolled && (
                      <span className="flex items-center gap-1 text-xs bg-white/20 rounded-full px-2 py-0.5">
                        <FiCheckCircle className="h-3 w-3" />
                        Enrolled
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold leading-tight">
                    {meta.label}
                  </h2>
                </div>

                {/* Body */}
                <div className="bg-white p-4 flex flex-col flex-1 gap-4">
                  <p className="text-sm text-gray-500 flex-1">
                    {meta.description}
                  </p>

                  {enrolled ? (
                    <Button
                      size="sm"
                      className="w-full flex items-center justify-center gap-2"
                      onClick={() => handleContinue(type)}
                    >
                      Continue
                      <FiArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2"
                      loading={busy}
                      onClick={() => handleEnroll(type)}
                    >
                      {!busy && <FiLogIn className="h-4 w-4" />}
                      {type === EnrollmentType.INDIVIDUAL_MODULE
                        ? "CHOOSE MODULE"
                        : "ENROLL NOW"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Enrolled summary */}
        {enrollments.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Your Active Enrollments
            </h3>
            <div className="flex flex-wrap gap-2">
              {enrollments
                .filter((e) => e.isActive)
                .map((e) => (
                  <span
                    key={e._id}
                    className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1 text-xs font-medium text-gray-700"
                  >
                    <FiCheckCircle className="h-3 w-3 text-green-500" />
                    {ENROLLMENT_META[e.type].label}
                    {e.module && ` – ${e.module}`}
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default PracticePage;
