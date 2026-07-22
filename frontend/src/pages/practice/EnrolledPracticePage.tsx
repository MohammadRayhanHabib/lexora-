import React, { useEffect, useState } from "react";
import {
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../hooks/useAppStore";
import {
  fetchPracticeTests,
  startPracticeTest,
  setCurrentTest,
} from "../../store/slices/testSlice";
import {
  enrollmentApi,
  EnrollmentType,
  IEnrollment,
  ENROLLMENT_META,
} from "../../api/enrollment";
import Card, { CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { PageLoader } from "../../components/ui/Spinner";
import MockPracticeBoard from "../../components/practice/section-practice/MockPracticeBoard";
import SectionPracticeBoard from "../../components/practice/section-practice/SectionPracticeBoard";
import type { MainLayoutOutletContext } from "../../components/layout/MainLayout";
import { TestModule } from "../../types";
import {
  FiHeadphones,
  FiBookOpen,
  FiEdit3,
  FiMic,
  FiClock,
  FiChevronLeft,
  FiPlay,
  FiLock,
  FiFilter,
  FiZap,
  FiList,
} from "react-icons/fi";

/* ── Slug → EnrollmentType mapping ─────────────────────────────────────── */
const SLUG_TO_TYPE: Record<string, EnrollmentType> = {
  "cam-official-book": EnrollmentType.CAM_OFFICIAL_BOOK,
  "popular-tests": EnrollmentType.POPULAR_TESTS,
  "recent-tests": EnrollmentType.RECENT_TESTS,
};

const MODULE_ICONS: Record<string, React.ReactNode> = {
  listening: <FiHeadphones className="h-5 w-5" />,
  reading: <FiBookOpen className="h-5 w-5" />,
  writing: <FiEdit3 className="h-5 w-5" />,
  speaking: <FiMic className="h-5 w-5" />,
};

type PracticeTab = "section" | "mock";

const EnrolledPracticePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { practiceTests, loading } = useAppSelector((s) => s.tests);
  const { practiceExamVariant } =
    useOutletContext<MainLayoutOutletContext>();

  const [tab, setTab] = useState<PracticeTab>(() =>
    searchParams.get("tab") === "mock" ? "mock" : "section",
  );
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [accessGranted, setAccessGranted] = useState<boolean | null>(null);
  const [enrollment, setEnrollment] = useState<IEnrollment | null>(null);

  const enrollmentType = slug ? SLUG_TO_TYPE[slug] : undefined;
  const catalogVariantLabel =
    practiceExamVariant.label === "UKVI"
      ? `${practiceExamVariant.label} ${practiceExamVariant.sub}`
      : practiceExamVariant.sub;

  const selectTab = (nextTab: PracticeTab) => {
    setTab(nextTab);
    if (nextTab === "mock") setModuleFilter("all");

    const nextSearchParams = new URLSearchParams(searchParams);
    if (nextTab === "mock") {
      nextSearchParams.set("tab", "mock");
    } else {
      nextSearchParams.delete("tab");
    }
    setSearchParams(nextSearchParams, { replace: true });
  };

  // Validate slug
  useEffect(() => {
    if (!enrollmentType) {
      navigate("/practice", { replace: true });
      return;
    }
    (async () => {
      try {
        const enrollments = await enrollmentApi.getMyEnrollments();
        const found = enrollments.find(
          (e) => e.type === enrollmentType && e.isActive,
        );
        setAccessGranted(!!found);
        if (found) setEnrollment(found);
        // Fetch all practice tests
        if (found) dispatch(fetchPracticeTests());
      } catch {
        toast.error("Failed to verify enrollment");
        setAccessGranted(false);
      }
    })();
  }, [enrollmentType, dispatch, navigate]);

  const handleStart = async (testId: string, mod: string) => {
    const result = await dispatch(startPracticeTest({ testId, module: mod }));
    if (startPracticeTest.fulfilled.match(result)) {
      navigate(`/test-attempt/${result.payload._id}?type=practice`);
    } else {
      toast.error((result.payload as string) || "Failed to start test");
    }
  };

  if (accessGranted === null || (loading && practiceTests.length === 0))
    return <PageLoader />;

  const meta = enrollmentType ? ENROLLMENT_META[enrollmentType] : null;

  // Not enrolled
  if (!accessGranted) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="p-4 bg-gray-100 rounded-full">
          <FiLock className="h-10 w-10 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Access Restricted</h2>
        <p className="text-gray-500 max-w-sm">
          You are not enrolled in <strong>{meta?.label ?? slug}</strong>. Please
          enroll first.
        </p>
        <Button onClick={() => navigate("/practice")}>Back to Practice</Button>
      </div>
    );
  }

  // Filter tests: section = easy/medium, mock = hard
  const byDifficulty =
    tab === "section"
      ? practiceTests.filter((t) => t.difficulty !== "hard")
      : practiceTests.filter((t) => t.difficulty === "hard");

  const displayTests =
    moduleFilter === "all"
      ? byDifficulty
      : byDifficulty.filter((t) => t.module === moduleFilter);

  const expiryLabel = enrollment?.expiresAt
    ? `Expires ${new Date(enrollment.expiresAt).toLocaleDateString()}`
    : "No expiry";

  return (
    <>
      <Helmet>
        <title>{meta?.label ?? slug} – Practice | Lexora</title>
      </Helmet>

      <div className="space-y-6">
        {/* Back + header */}
        <div>
          <button
            onClick={() => navigate("/practice")}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3 transition-colors"
          >
            <FiChevronLeft className="h-4 w-4" />
            Back to Practice
          </button>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {meta?.label}
              </h1>
              <p className="mt-1 text-sm text-gray-500">{meta?.description}</p>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1">
              {expiryLabel}
            </span>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => selectTab("section")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              tab === "section"
                ? "bg-primary-600 text-white border-primary-600"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <FiList className="h-4 w-4" />
            Section Practice
          </button>
          <button
            onClick={() => selectTab("mock")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              tab === "mock"
                ? "bg-primary-600 text-white border-primary-600"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <FiZap className="h-4 w-4" />
            Mock Practice
          </button>
        </div>

        {/* Individual module filtering belongs only to Section Practice. */}
        {tab === "section" && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <FiFilter className="text-gray-400 shrink-0" />
            {["all", ...Object.values(TestModule)].map((mod) => (
              <button
                key={mod}
                onClick={() => setModuleFilter(mod)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  moduleFilter === mod
                    ? "bg-primary-600 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {mod === "all"
                  ? "All Modules"
                  : mod.charAt(0).toUpperCase() + mod.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Section practice uses a focused frontend-only test-set catalog. */}
        {tab === "section" && slug === "cam-official-book" ? (
          <SectionPracticeBoard
            slug={slug ?? "cam-official-book"}
            moduleFilter={moduleFilter}
            variantLabel={catalogVariantLabel}
          />
        ) : tab === "mock" && slug === "cam-official-book" ? (
          <MockPracticeBoard
            slug={slug ?? "cam-official-book"}
            variantLabel={catalogVariantLabel}
          />
        ) : displayTests.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg font-medium mb-1">No tests found</p>
            <p className="text-sm">
              Try switching tabs or selecting a different module.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayTests.map((test) => (
              <Card key={test._id} hover>
                <CardBody className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
                        {MODULE_ICONS[test.module] ?? (
                          <FiBookOpen className="h-5 w-5" />
                        )}
                      </div>
                      <Badge variant="info">{test.module}</Badge>
                    </div>
                    <Badge
                      variant={
                        test.difficulty === "hard"
                          ? "danger"
                          : test.difficulty === "medium"
                            ? "warning"
                            : "success"
                      }
                    >
                      {test.difficulty}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {test.title}
                    </h3>
                    {test.description && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                        {test.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <FiClock className="h-3.5 w-3.5" />
                      {test.duration} min
                    </span>
                  </div>

                  <Button
                    size="sm"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => {
                      dispatch(setCurrentTest(test));
                      handleStart(test._id, test.module);
                    }}
                  >
                    <FiPlay className="h-3.5 w-3.5" />
                    Start
                  </Button>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default EnrolledPracticePage;
