import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import toast from "react-hot-toast";
import { FiBookOpen, FiPlay, FiChevronLeft, FiLock } from "react-icons/fi";
import {
  readingApi,
  IReadingAcademicGroup,
  IReadingTest,
  IReadingTestGroup,
} from "../../api/reading";
import {
  enrollmentApi,
  EnrollmentType,
  EnrolledModule,
} from "../../api/enrollment";
import Button from "../../components/ui/Button";
import { PageLoader } from "../../components/ui/Spinner";

// All possible part type labels for the filter bar
const ALL_FILTER = "All";

const ReadingTestsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState<boolean | null>(null);

  const [academicGroups, setAcademicGroups] = useState<IReadingAcademicGroup[]>(
    [],
  );
  const [ungrouped, setUngrouped] = useState<IReadingTest[]>([]);
  const [filterLabels, setFilterLabels] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>(ALL_FILTER);

  useEffect(() => {
    (async () => {
      try {
        const enrollments = await enrollmentApi.getMyEnrollments();
        const hasAccess = enrollments.some(
          (e) =>
            e.type === EnrollmentType.INDIVIDUAL_MODULE &&
            e.module === EnrolledModule.READING &&
            e.isActive,
        );
        setEnrolled(hasAccess);

        if (hasAccess) {
          const r = await readingApi.listGroupedTests();
          const { academicGroups: ag, ungrouped: ug } = r.data.data ?? {
            academicGroups: [],
            ungrouped: [],
          };
          setAcademicGroups(ag);
          setUngrouped(ug);

          // Collect unique part type labels for the filter bar
          const labels = new Set<string>();
          for (const g of ag) {
            for (const tg of g.tests) {
              for (const p of tg.parts) {
                if (p.partTypeLabel) labels.add(p.partTypeLabel);
              }
            }
          }
          for (const t of ug) {
            if (t.partTypeLabel) labels.add(t.partTypeLabel);
          }
          setFilterLabels(Array.from(labels));
        }
      } catch {
        toast.error("Failed to load reading tests");
        setEnrolled(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <PageLoader />;

  // Not enrolled — gate
  if (!enrolled) {
    return (
      <>
        <Helmet>
          <title>Reading Practice – Lexora</title>
        </Helmet>
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="p-4 bg-gray-100 rounded-full">
            <FiLock className="h-10 w-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Access Restricted</h2>
          <p className="text-gray-500 max-w-sm">
            You need to enroll in the <strong>Reading</strong> module under
            Individual Module Practice to access these tests.
          </p>
          <Button onClick={() => navigate("/practice/individual")}>
            Go to Individual Module
          </Button>
        </div>
      </>
    );
  }

  // Filter helper
  const partVisible = (p: IReadingTest) =>
    activeFilter === ALL_FILTER || p.partTypeLabel === activeFilter;

  // Check if a test group has any visible parts
  const testGroupVisible = (tg: IReadingTestGroup) =>
    tg.parts.some(partVisible);

  // Check if an academic group has any visible tests
  const academicVisible = (g: IReadingAcademicGroup) =>
    g.tests.some(testGroupVisible);

  const hasAny =
    academicGroups.some(academicVisible) || ungrouped.some(partVisible);

  return (
    <>
      <Helmet>
        <title>Reading Practice – Lexora</title>
      </Helmet>

      <div className="space-y-5">
        {/* Back + header */}
        <div>
          <button
            onClick={() => navigate("/practice/individual")}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3 transition-colors"
          >
            <FiChevronLeft className="h-4 w-4" />
            Back to Individual Module
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50">
              <FiBookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Reading Modules
              </h1>
              <p className="text-gray-500 mt-0.5 text-sm">
                IELTS Academic reading passages with all question types.
              </p>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        {filterLabels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {[ALL_FILTER, ...filterLabels].map((label) => (
              <button
                key={label}
                onClick={() => setActiveFilter(label)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeFilter === label
                    ? "bg-[#2d2042] text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {!hasAny ? (
          <div className="text-center py-16">
            <FiBookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">
              No reading tests available yet
            </p>
            <p className="text-gray-400 mt-1">Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Academic groups */}
            {academicGroups.filter(academicVisible).map((g) => (
              <div
                key={g.academicNumber}
                className="rounded-2xl overflow-hidden border border-gray-200 bg-[#1f1635]"
              >
                {/* Academic header */}
                <div className="px-6 py-4 flex items-baseline gap-2">
                  <span className="text-white text-sm font-semibold opacity-70">
                    Reading Academic
                  </span>
                  <span className="text-white text-4xl font-black">
                    {g.academicNumber}
                  </span>
                </div>

                {/* Tests grid */}
                <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {g.tests.filter(testGroupVisible).map((tg) => (
                    <div
                      key={tg.testNumber}
                      className={`rounded-xl p-4 space-y-2 ${
                        tg.testNumber === 1
                          ? "bg-[#7a1c2e] text-white"
                          : "bg-[#2d2255] text-white"
                      }`}
                    >
                      <h3 className="font-bold text-base">
                        Test-{tg.testNumber}
                      </h3>
                      <div className="space-y-1.5">
                        {tg.parts.filter(partVisible).map((p) => (
                          <button
                            key={p._id}
                            onClick={() => navigate(`/reading/test/${p._id}`)}
                            className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium"
                          >
                            <FiPlay className="w-3.5 h-3.5 shrink-0 opacity-70" />
                            <span>
                              Part-{p.partNumber}
                              {p.partTypeLabel ? `· ${p.partTypeLabel}` : ""}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Ungrouped / legacy */}
            {ungrouped.filter(partVisible).length > 0 && (
              <div className="rounded-2xl overflow-hidden border border-gray-200 bg-[#1f1635]">
                <div className="px-6 py-4">
                  <span className="text-white text-base font-semibold opacity-70">
                    Other Reading Tests
                  </span>
                </div>
                <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ungrouped.filter(partVisible).map((t, i) => (
                    <div
                      key={t._id}
                      className="rounded-xl p-4 bg-[#2d2255] text-white space-y-2"
                    >
                      <h3 className="font-bold text-base">Test {i + 1}</h3>
                      <p className="text-xs opacity-70 truncate">
                        {t.passageTitle}
                      </p>
                      <Button
                        size="sm"
                        className="w-full gap-1.5 bg-white/10 hover:bg-white/20 !text-white border-0"
                        onClick={() => navigate(`/reading/test/${t._id}`)}
                      >
                        <FiPlay className="w-3.5 h-3.5" />
                        Start
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default ReadingTestsListPage;
