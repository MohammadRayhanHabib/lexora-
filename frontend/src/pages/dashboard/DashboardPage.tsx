import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAppSelector, useAppDispatch } from "../../hooks/useAppStore";
import { fetchMyAttempts } from "../../store/slices/testSlice";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
} from "recharts";
import {
  FiAward,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiClipboard,
  FiTarget,
} from "react-icons/fi";
import {
  ENROLLMENT_META,
  MODULE_META,
  enrollmentApi,
  type IEnrollment,
} from "../../api/enrollment";
import { scheduleApi, type IScheduleItem } from "../../api/schedule";
import { testApi } from "../../api/tests";
import { getActiveListeningTests } from "../../api/listening";
import type { IPracticeTest, IMockTest, IListeningTest } from "../../types";

/* ── Mini calendar helpers ───────────────────────────── */
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function safeDateFromSchedule(date: string, time?: string) {
  return new Date(`${date}T${time || "23:59:59"}`);
}

function getEnrollmentLabel(enrollment: IEnrollment) {
  const typeLabel = ENROLLMENT_META[enrollment.type]?.label ?? enrollment.type;
  if (enrollment.type === "individual_module" && enrollment.module) {
    const moduleLabel =
      MODULE_META[enrollment.module]?.label ?? enrollment.module;
    return `${typeLabel} - ${moduleLabel}`;
  }
  return typeLabel;
}

function getEnrollmentDescription(enrollment: IEnrollment) {
  if (enrollment.type === "individual_module" && enrollment.module) {
    return `Access for ${MODULE_META[enrollment.module]?.label ?? enrollment.module}`;
  }
  return ENROLLMENT_META[enrollment.type]?.description ?? "Active enrollment";
}

function getAttemptScore(attempt: {
  overallBand?: number;
  completionPercentage: number;
}) {
  if (typeof attempt.overallBand === "number") {
    return Math.min(100, Math.round(attempt.overallBand * 10));
  }
  return Math.max(
    0,
    Math.min(100, Math.round(attempt.completionPercentage || 0)),
  );
}

const MiniCalendar: React.FC = () => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysCount = new Date(year, month + 1, 0).getDate();
  // shift so week starts on Monday
  const startOffset = (firstDay + 6) % 7;
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysCount }, (_, i) => i + 1),
  ];

  const isToday = (d: number) =>
    d === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-sm"
          onClick={() => {
            if (month === 0) {
              setMonth(11);
              setYear((y) => y - 1);
            } else setMonth((m) => m - 1);
          }}
        >
          ‹
        </button>
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
          {MONTHS[month]} {year}
        </span>
        <button
          className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-sm"
          onClick={() => {
            if (month === 11) {
              setMonth(0);
              setYear((y) => y + 1);
            } else setMonth((m) => m + 1);
          }}
        >
          ›
        </button>
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d, i) => (
          <div
            key={i}
            className="text-center text-[10px] font-semibold text-gray-400 py-0.5"
          >
            {d}
          </div>
        ))}
      </div>
      {/* Date cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((d, i) => (
          <div key={i} className="flex justify-center">
            {d ? (
              <span
                className={`h-6 w-6 flex items-center justify-center rounded-full text-[11px] font-medium cursor-default
                ${isToday(d) ? "bg-primary-600 text-white font-bold" : "text-gray-600 hover:bg-gray-100"}`}
              >
                {d}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════ */
const DashboardPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { myAttempts } = useAppSelector((s) => s.tests);
  const [enrollments, setEnrollments] = useState<IEnrollment[]>([]);
  const [scheduleItems, setScheduleItems] = useState<IScheduleItem[]>([]);
  const [mockTests, setMockTests] = useState<IMockTest[]>([]);
  const [practiceTests, setPracticeTests] = useState<IPracticeTest[]>([]);
  const [listeningTests, setListeningTests] = useState<IListeningTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      if (active) {
        setLoading(true);
      }

      try {
        await Promise.allSettled([
          dispatch(fetchMyAttempts({ page: 1, limit: 50 })),
          enrollmentApi
            .getMyEnrollments()
            .then((res) => {
              if (active) {
                setEnrollments(res ?? []);
              }
            })
            .catch(() => undefined),
          scheduleApi
            .getAll()
            .then((data) => {
              if (active) {
                setScheduleItems(data ?? []);
              }
            })
            .catch(() => undefined),
          testApi
            .listMockTests()
            .then((res) => {
              if (active) {
                setMockTests(res.data.data ?? []);
              }
            })
            .catch(() => undefined),
          testApi
            .listPracticeTests()
            .then((res) => {
              if (active) {
                setPracticeTests(res.data.data ?? []);
              }
            })
            .catch(() => undefined),
          getActiveListeningTests()
            .then((res) => {
              if (active) {
                setListeningTests(res.data.data ?? []);
              }
            })
            .catch(() => undefined),
        ]);

        if (active) {
          setLastUpdated(
            new Date().toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            }),
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    refresh();
    const intervalId = window.setInterval(refresh, 30000);
    const onFocus = () => {
      refresh();
    };

    window.addEventListener("focus", onFocus);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [dispatch]);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const todayIso = today.toISOString().slice(0, 10);

  const upcomingSchedule = useMemo(() => {
    return [...scheduleItems]
      .filter((item) => !item.completed && item.date >= todayIso)
      .sort((a, b) => {
        const aTime = safeDateFromSchedule(a.date, a.time).getTime();
        const bTime = safeDateFromSchedule(b.date, b.time).getTime();
        return aTime - bTime;
      });
  }, [scheduleItems, todayIso]);

  const assignments = useMemo(
    () => upcomingSchedule.filter((item) => item.type === "task").slice(0, 5),
    [upcomingSchedule],
  );

  const upcomingExams = useMemo(() => {
    const scheduleExamItems = upcomingSchedule
      .filter((item) => item.type === "event")
      .filter((item) => /exam|test/i.test(item.title))
      .map((item) => ({
        key: `schedule-${item._id}`,
        title: item.title,
        subtitle: item.time
          ? `${formatDateLabel(item.date)} • ${item.time}`
          : formatDateLabel(item.date),
        href: "/schedule",
      }));

    const testItems = [
      ...mockTests.slice(0, 3).map((test) => ({
        key: `mock-${test._id}`,
        title: test.title,
        subtitle: `Mock test • ${test.duration} min`,
        href: "/mock-tests",
      })),
      ...practiceTests.slice(0, 3).map((test) => ({
        key: `practice-${test._id}`,
        title: test.title,
        subtitle: `Practice test • ${test.duration} min`,
        href: "/practice",
      })),
      ...listeningTests.slice(0, 3).map((test) => ({
        key: `listening-${test._id}`,
        title: test.title,
        subtitle: `Listening test • ${test.duration} min`,
        href: "/listening",
      })),
    ];

    const seen = new Set<string>();
    return [...scheduleExamItems, ...testItems].filter((item) => {
      const key = item.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [listeningTests, mockTests, practiceTests, upcomingSchedule]);

  const enrolledCourseCards = useMemo(() => {
    const seen = new Set<string>();
    return enrollments
      .filter((enrollment) => enrollment.isActive)
      .map((enrollment) => {
        const label = getEnrollmentLabel(enrollment);
        const key = `${enrollment.type}:${enrollment.module ?? "all"}`;
        return {
          key,
          label,
          description: getEnrollmentDescription(enrollment),
          expiresAt: enrollment.expiresAt,
        };
      })
      .filter((item) => {
        if (seen.has(item.key)) return false;
        seen.add(item.key);
        return true;
      });
  }, [enrollments]);

  const activityChartData = useMemo(() => {
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    const buckets = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + index);
      return {
        key: day.toISOString().slice(0, 10),
        day: day
          .toLocaleDateString("en-US", { weekday: "short" })
          .toUpperCase(),
        total: 0,
        count: 0,
      };
    });

    myAttempts.forEach((attempt) => {
      const source = attempt.completedAt || attempt.startedAt;
      const attemptDate = new Date(source);
      if (Number.isNaN(attemptDate.getTime())) {
        return;
      }

      if (attemptDate < startDate || attemptDate > today) {
        return;
      }

      const key = attemptDate.toISOString().slice(0, 10);
      const bucket = buckets.find((item) => item.key === key);
      if (!bucket) {
        return;
      }

      bucket.total += getAttemptScore(attempt);
      bucket.count += 1;
    });

    return buckets.map((bucket) => ({
      day: bucket.day,
      score: bucket.count ? Math.round(bucket.total / bucket.count) : 0,
    }));
  }, [myAttempts, today]);

  const enrolledCount = enrolledCourseCards.length;
  const upcomingScheduleCount = upcomingSchedule.length;
  const assignmentsCount = assignments.length;
  const upcomingExamCount = upcomingExams.length;

  return (
    <>
      <Helmet>
        <title>Dashboard – Lexora</title>
      </Helmet>

      <div className="flex flex-col xl:flex-row gap-5 min-h-0">
        {/* ── LEFT / MAIN COLUMN ── */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Welcome banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-500 to-primary-700 p-6 text-white min-h-[140px]">
            {/* Background pattern circles */}
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
            <div className="absolute right-16 -bottom-10 h-32 w-32 rounded-full bg-white/10" />
            {/* Content */}
            <p className="text-xs font-medium text-primary-200 mb-1">
              {dateStr}
            </p>
            <h1 className="text-2xl font-bold text-white mb-1">
              Welcome back, {user?.name?.split(" ")[0] ?? "Student"}!
            </h1>
            <p className="text-sm text-primary-200">
              Always stay updated in your student portal
            </p>
            <p className="mt-3 text-xs text-primary-100">
              Live data refreshed {lastUpdated || "just now"}
            </p>
            {/* Decorative figure */}
            <div className="absolute right-6 bottom-0 text-6xl select-none pointer-events-none leading-none">
              🎓
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              icon={<FiCheckCircle className="h-6 w-6" />}
              value={String(enrolledCount).padStart(2, "0")}
              label="Enrolled Courses"
              variant="primary"
            />
            <StatCard
              icon={<FiCalendar className="h-6 w-6" />}
              value={String(upcomingScheduleCount).padStart(2, "0")}
              label="Upcoming Schedule"
              variant="light"
            />
            <StatCard
              icon={<FiClipboard className="h-6 w-6" />}
              value={String(assignmentsCount).padStart(2, "0")}
              label="Assignments Due"
              variant="light"
            />
            <StatCard
              icon={<FiTarget className="h-6 w-6" />}
              value={String(upcomingExamCount).padStart(2, "0")}
              label="Upcoming Exams"
              variant="primary"
            />
          </div>

          {/* Learning Activity chart */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">
                Learning Activity
              </h2>
              <div className="text-xs font-semibold text-gray-500">
                Recent attempts
              </div>
            </div>
            {activityChartData.some((item) => item.score > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart
                  data={activityChartData}
                  margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="scoreGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#E25858"
                        stopOpacity={0.18}
                      />
                      <stop
                        offset="95%"
                        stopColor="#E25858"
                        stopOpacity={0.01}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f0f0f0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      fontSize: "12px",
                    }}
                    itemStyle={{ color: "#E25858" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#E25858"
                    strokeWidth={2.5}
                    fill="url(#scoreGradient)"
                    dot={false}
                    activeDot={{ r: 5, fill: "#E25858" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 text-center text-sm text-gray-500">
                Your recent attempts will appear here once you start using the
                tests.
              </div>
            )}
          </div>

          {/* Enrolled courses */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">
                Enrolled Courses
              </h2>
              <Link
                to="/practice"
                className="text-xs font-semibold text-primary-600 hover:text-primary-700"
              >
                View practice area
              </Link>
            </div>
            {loading && enrolledCourseCards.length === 0 ? (
              <div className="text-sm text-gray-500">
                Loading enrollments...
              </div>
            ) : enrolledCourseCards.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {enrolledCourseCards.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900">
                          {item.label}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {item.description}
                        </p>
                      </div>
                      <span className="rounded-full bg-primary-100 px-2.5 py-1 text-[10px] font-bold text-primary-700">
                        Active
                      </span>
                    </div>
                    {item.expiresAt ? (
                      <p className="mt-3 text-[11px] text-gray-400">
                        Expires {formatDateLabel(item.expiresAt)}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                No active enrollments found yet.
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex w-full flex-col gap-4 xl:w-[320px] shrink-0">
          {/* Mini calendar */}
          <MiniCalendar />

          {/* Assignments */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3">
              Assignments
            </h3>
            <div className="space-y-2.5">
              {assignments.length > 0 ? (
                assignments.map((item) => (
                  <div key={item._id} className="flex items-start gap-2.5">
                    <div
                      className={`mt-0.5 h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${item.completed ? "bg-green-500" : "bg-primary-500"}`}
                    >
                      <FiCheck className="h-2.5 w-2.5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {formatDateLabel(item.date)}
                        {item.time ? ` • ${item.time}` : ""}
                      </p>
                    </div>
                    <span className="ml-auto shrink-0 rounded text-[9px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5">
                      Due
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">No pending assignments.</p>
              )}
            </div>
          </div>

          {/* Upcoming Schedule */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3">
              Upcoming Schedule
            </h3>
            <div className="space-y-2">
              {upcomingSchedule.length > 0 ? (
                upcomingSchedule.slice(0, 6).map((item) => (
                  <div key={item._id} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {formatDateLabel(item.date)}
                        {item.time ? ` • ${item.time}` : ""}
                      </p>
                    </div>
                    <Link
                      to="/schedule"
                      className="shrink-0 rounded-lg text-[9px] font-bold bg-primary-600 text-white px-2 py-1 hover:bg-primary-700 transition-colors"
                    >
                      Open
                    </Link>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">
                  No upcoming schedule items.
                </p>
              )}
            </div>
            <Link
              to="/schedule"
              className="mt-3 block w-full rounded-xl bg-primary-800 text-white text-xs font-semibold text-center py-2 hover:bg-primary-900 transition-colors"
            >
              See More
            </Link>
          </div>

          {/* Upcoming Exams */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3">
              Upcoming Exams
            </h3>
            <div className="space-y-2.5">
              {upcomingExams.length > 0 ? (
                upcomingExams.slice(0, 6).map((exam) => (
                  <div key={exam.key} className="flex items-center gap-2">
                    <div className="h-7 w-7 shrink-0 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center">
                      <FiAward className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {exam.title}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {exam.subtitle}
                      </p>
                    </div>
                    <Link
                      to={exam.href}
                      className="shrink-0 rounded-lg text-[9px] font-bold bg-green-600 text-white px-2 py-1 hover:bg-green-700 transition-colors"
                    >
                      View
                    </Link>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">No upcoming exams yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

/* ── Stat card ──────────────────────────────────────── */
const StatCard: React.FC<{
  icon: React.ReactNode;
  value: string;
  label: string;
  variant: "primary" | "light";
}> = ({ icon, value, label, variant }) => (
  <div
    className={`relative overflow-hidden rounded-2xl p-4 ${
      variant === "primary"
        ? "bg-gradient-to-br from-primary-500 to-primary-700 text-white"
        : "bg-white border border-gray-100 text-gray-900"
    }`}
  >
    {/* Watermark circle */}
    <div
      className={`absolute -right-4 -bottom-4 h-20 w-20 rounded-full ${
        variant === "primary" ? "bg-white/10" : "bg-gray-50"
      }`}
    />
    <div
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full mb-3 ${
        variant === "primary" ? "bg-white/20" : "bg-primary-50"
      }`}
    >
      <span
        className={variant === "primary" ? "text-white" : "text-primary-600"}
      >
        {icon}
      </span>
    </div>
    <p
      className={`text-2xl font-black mb-0.5 ${variant === "primary" ? "text-white" : "text-gray-900"}`}
    >
      {value}
    </p>
    <p
      className={`text-xs font-medium ${variant === "primary" ? "text-primary-100" : "text-gray-500"}`}
    >
      {label}
    </p>
  </div>
);

export default DashboardPage;
