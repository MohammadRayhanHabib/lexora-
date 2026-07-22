import React, { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import { PageLoader } from "./components/ui/Spinner";
import { UserRole } from "./types";
import { useAppDispatch, useAppSelector } from "./hooks/useAppStore";
import { fetchProfile } from "./store/slices/authSlice";

// Lazy-loaded pages
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage"));

// Practice enrollment system
const PracticePage = lazy(() => import("./pages/practice/PracticePage"));
const IndividualModulePage = lazy(
  () => import("./pages/practice/IndividualModulePage"),
);
const ModulePracticePage = lazy(
  () => import("./pages/practice/ModulePracticePage"),
);
const EnrolledPracticePage = lazy(
  () => import("./pages/practice/EnrolledPracticePage"),
);
const SectionPracticeWorkspacePage = lazy(
  () => import("./pages/practice/SectionPracticeWorkspacePage"),
);
const MockPracticeWorkspacePage = lazy(
  () => import("./pages/practice/MockPracticeWorkspacePage"),
);
const MockTestsPage = lazy(() => import("./pages/tests/MockTestsPage"));
const TestAttemptPage = lazy(() => import("./pages/tests/TestAttemptPage"));
const ResultsPage = lazy(() => import("./pages/tests/ResultsPage"));
const PaymentPage = lazy(() => import("./pages/payment/PaymentPage"));
const CoursesPage = lazy(() => import("./pages/courses/CoursesPage"));
const BookingsPage = lazy(() => import("./pages/bookings/BookingsPage"));
const SchedulePage = lazy(() => import("./pages/schedule/SchedulePage"));
const SupportPage = lazy(() => import("./pages/support/SupportPage"));
const ProfilePage = lazy(() => import("./pages/profile/ProfilePage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const ReviewQueue = lazy(() => import("./pages/admin/ReviewQueue"));
const PaymentLedger = lazy(() => import("./pages/admin/PaymentLedger"));
const BookingManagement = lazy(() => import("./pages/admin/BookingManagement"));
const AdminSupport = lazy(() => import("./pages/admin/AdminSupport"));
const AuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const AdminCourseVideos = lazy(
  () => import("./pages/admin/courses/AdminCourseVideos"),
);

// Reading module – Admin
const AdminReadingTests = lazy(
  () => import("./pages/admin/reading/AdminReadingTests"),
);
const AdminReadingTestForm = lazy(
  () => import("./pages/admin/reading/AdminReadingTestForm"),
);
const AdminReadingQuestions = lazy(
  () => import("./pages/admin/reading/AdminReadingQuestions"),
);
const AdminReadingPreview = lazy(
  () => import("./pages/admin/reading/AdminReadingPreview"),
);
const AdminReadingAttempts = lazy(
  () => import("./pages/admin/reading/AdminReadingAttempts"),
);

// Writing module – Admin
const AdminWritingModules = lazy(
  () => import("./pages/admin/writing/AdminWritingModules"),
);
const AdminWritingModuleForm = lazy(
  () => import("./pages/admin/writing/AdminWritingModuleForm"),
);
const AdminWritingSubmissions = lazy(
  () => import("./pages/admin/writing/AdminWritingSubmissions"),
);
const AdminWritingReview = lazy(
  () => import("./pages/admin/writing/AdminWritingReview"),
);

// Writing module – Student
const WritingModulesListPage = lazy(
  () => import("./pages/tests/WritingModulesListPage"),
);
const WritingExamPage = lazy(() => import("./pages/tests/WritingExamPage"));
const WritingResultPage = lazy(() => import("./pages/tests/WritingResultPage"));

// Reading module – Student
const ReadingTestsListPage = lazy(
  () => import("./pages/tests/ReadingTestsListPage"),
);
const ReadingTestPage = lazy(() => import("./pages/tests/ReadingTestPage"));
const ReadingResultPage = lazy(() => import("./pages/tests/ReadingResultPage"));

// Listening module – Student
const ListeningTestsListPage = lazy(
  () => import("./pages/listening/ListeningTestsListPage"),
);
const ListeningTestPage = lazy(
  () => import("./pages/listening/ListeningTestPage"),
);
const ListeningResultPage = lazy(
  () => import("./pages/listening/ListeningResultPage"),
);

// Speaking module – Student
const SpeakingTestsListPage = lazy(
  () => import("./pages/speaking/SpeakingTestsListPage"),
);
const SpeakingTestPage = lazy(
  () => import("./pages/speaking/SpeakingTestPage"),
);
const SpeakingResultPage = lazy(
  () => import("./pages/speaking/SpeakingResultPage"),
);

// Listening module – Admin
const AdminListeningTests = lazy(
  () => import("./pages/admin/listening/AdminListeningTests"),
);
const AdminListeningTestForm = lazy(
  () => import("./pages/admin/listening/AdminListeningTestForm"),
);
const AdminListeningAttempts = lazy(
  () => import("./pages/admin/listening/AdminListeningAttempts"),
);

// Speaking module – Admin
const AdminSpeakingTests = lazy(
  () => import("./pages/admin/speaking/AdminSpeakingTests"),
);
const AdminSpeakingTestForm = lazy(
  () => import("./pages/admin/speaking/AdminSpeakingTestForm"),
);
const AdminSpeakingSessions = lazy(
  () => import("./pages/admin/speaking/AdminSpeakingSessions"),
);

// Mock Exam – Admin
const AdminMockExams = lazy(
  () => import("./pages/admin/mock-exam/AdminMockExams"),
);
const AdminMockExamForm = lazy(
  () => import("./pages/admin/mock-exam/AdminMockExamForm"),
);
const AdminMockExamAttempts = lazy(
  () => import("./pages/admin/mock-exam/AdminMockExamAttempts"),
);
const AdminMockExamReview = lazy(
  () => import("./pages/admin/mock-exam/AdminMockExamReview"),
);

// Mock Exam – Student
const IELTSExamPage = lazy(() => import("./pages/tests/IELTSExamPage"));
const IELTSExamResultPage = lazy(
  () => import("./pages/tests/IELTSExamResultPage"),
);
const MockExamHistoryPage = lazy(
  () => import("./pages/tests/MockExamHistoryPage"),
);

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);

  // Restore user profile after page refresh (token in localStorage but user not in state)
  useEffect(() => {
    if (isAuthenticated && !user) {
      dispatch(fetchProfile());
    }
  }, [isAuthenticated, user, dispatch]);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes with main layout */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route
            path="/practice/individual"
            element={<IndividualModulePage />}
          />
          <Route
            path="/practice/individual/:module"
            element={<ModulePracticePage />}
          />
          <Route path="/practice/:slug" element={<EnrolledPracticePage />} />
          <Route path="/mock-tests" element={<MockTestsPage />} />
          <Route path="/mock-tests/results" element={<MockExamHistoryPage />} />
          <Route
            path="/test-attempt/:attemptId"
            element={<TestAttemptPage />}
          />
          <Route path="/results/:attemptId" element={<ResultsPage />} />
          <Route path="/payments" element={<PaymentPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/support/:ticketId" element={<SupportPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* Reading tests (student) */}
          <Route path="/reading" element={<ReadingTestsListPage />} />
          <Route
            path="/reading/result/:attemptId"
            element={<ReadingResultPage />}
          />

          {/* Writing module (student) */}
          <Route path="/writing" element={<WritingModulesListPage />} />
          <Route
            path="/writing/result/:sessionId"
            element={<WritingResultPage />}
          />

          {/* Listening module (student) */}
          <Route path="/listening" element={<ListeningTestsListPage />} />
          <Route
            path="/listening/result/:attemptId"
            element={<ListeningResultPage />}
          />

          {/* Speaking module (student) */}
          <Route path="/speaking" element={<SpeakingTestsListPage />} />
          <Route
            path="/speaking/result/:sessionId"
            element={<SpeakingResultPage />}
          />
        </Route>

        {/* Admin routes */}
        <Route
          element={
            <ProtectedRoute roles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/reviews" element={<ReviewQueue />} />
          <Route path="/admin/payments" element={<PaymentLedger />} />
          <Route path="/admin/bookings" element={<BookingManagement />} />
          <Route path="/admin/support" element={<AdminSupport />} />
          <Route path="/admin/audit" element={<AuditLogs />} />
          <Route path="/admin/courses" element={<AdminCourseVideos />} />

          {/* Reading module – Admin */}
          <Route path="/admin/reading" element={<AdminReadingTests />} />
          <Route path="/admin/reading/new" element={<AdminReadingTestForm />} />
          <Route
            path="/admin/reading/:id/edit"
            element={<AdminReadingTestForm />}
          />
          <Route
            path="/admin/reading/:testId/questions"
            element={<AdminReadingQuestions />}
          />
          <Route
            path="/admin/reading/:testId/preview"
            element={<AdminReadingPreview />}
          />
          <Route
            path="/admin/reading/:testId/attempts"
            element={<AdminReadingAttempts />}
          />

          {/* Writing module – Admin */}
          <Route path="/admin/writing" element={<AdminWritingModules />} />
          <Route
            path="/admin/writing/new"
            element={<AdminWritingModuleForm />}
          />
          <Route
            path="/admin/writing/:id/edit"
            element={<AdminWritingModuleForm />}
          />
          <Route
            path="/admin/writing/:moduleId/submissions"
            element={<AdminWritingSubmissions />}
          />
          <Route
            path="/admin/writing/review/:sessionId"
            element={<AdminWritingReview />}
          />

          {/* Listening module – Admin */}
          <Route path="/admin/listening" element={<AdminListeningTests />} />
          <Route
            path="/admin/listening/new"
            element={<AdminListeningTestForm />}
          />
          <Route
            path="/admin/listening/:id/edit"
            element={<AdminListeningTestForm />}
          />
          <Route
            path="/admin/listening/:id/attempts"
            element={<AdminListeningAttempts />}
          />

          {/* Speaking module – Admin */}
          <Route path="/admin/speaking" element={<AdminSpeakingTests />} />
          <Route
            path="/admin/speaking/new"
            element={<AdminSpeakingTestForm />}
          />
          <Route
            path="/admin/speaking/:id/edit"
            element={<AdminSpeakingTestForm />}
          />
          <Route
            path="/admin/speaking/sessions"
            element={<AdminSpeakingSessions />}
          />

          {/* Mock Exam – Admin */}
          <Route path="/admin/mock-exam" element={<AdminMockExams />} />
          <Route path="/admin/mock-exam/new" element={<AdminMockExamForm />} />
          <Route
            path="/admin/mock-exam/:id/edit"
            element={<AdminMockExamForm />}
          />
          <Route
            path="/admin/mock-exam/:id/attempts"
            element={<AdminMockExamAttempts />}
          />
          <Route
            path="/admin/mock-exam/review/:attemptId"
            element={<AdminMockExamReview />}
          />
        </Route>

        {/* Section practice preview full-screen (outside MainLayout) */}
        <Route
          path="/practice/:slug/section/:testId/:module"
          element={
            <ProtectedRoute>
              <SectionPracticeWorkspacePage />
            </ProtectedRoute>
          }
        />

        {/* Full Mock Practice preview (outside MainLayout) */}
        <Route
          path="/practice/:slug/mock/:testId"
          element={
            <ProtectedRoute>
              <MockPracticeWorkspacePage />
            </ProtectedRoute>
          }
        />

        {/* Writing exam full-screen (outside MainLayout) */}
        <Route
          path="/writing/session/:sessionId"
          element={
            <ProtectedRoute>
              <WritingExamPage />
            </ProtectedRoute>
          }
        />

        {/* Reading test full-screen (outside MainLayout) */}
        <Route
          path="/reading/test/:testId"
          element={
            <ProtectedRoute>
              <ReadingTestPage />
            </ProtectedRoute>
          }
        />

        {/* Listening test full-screen (outside MainLayout) */}
        <Route
          path="/listening/test/:testId"
          element={
            <ProtectedRoute>
              <ListeningTestPage />
            </ProtectedRoute>
          }
        />

        {/* Speaking test full-screen (outside MainLayout) */}
        <Route
          path="/speaking/test/:testId"
          element={
            <ProtectedRoute>
              <SpeakingTestPage />
            </ProtectedRoute>
          }
        />

        {/* IELTS Mock Exam full-screen (outside MainLayout) */}
        <Route
          path="/exam/:examId"
          element={
            <ProtectedRoute>
              <IELTSExamPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exam/result/:attemptId"
          element={
            <ProtectedRoute>
              <IELTSExamResultPage />
            </ProtectedRoute>
          }
        />

        {/* Redirects and fallback */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

export default App;
