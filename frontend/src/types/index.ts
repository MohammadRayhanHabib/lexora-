/* ── Enums ──────────────────────────────────────────── */
export enum UserRole {
  STUDENT = "student",
  REVIEWER = "reviewer",
  ADMIN = "admin",
  SUPER_ADMIN = "super_admin",
}

export enum UserStatus {
  ACTIVE = "active",
  SUSPENDED = "suspended",
  BANNED = "banned",
}

export enum TestModule {
  LISTENING = "listening",
  READING = "reading",
  WRITING = "writing",
  SPEAKING = "speaking",
}

export enum TestType {
  PRACTICE = "practice",
  MOCK = "mock",
}

export enum AttemptStatus {
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  ABANDONED = "abandoned",
  UNDER_REVIEW = "under_review",
  REVIEWED = "reviewed",
}

export enum ReviewStatus {
  PENDING = "pending",
  ASSIGNED = "assigned",
  IN_REVIEW = "in_review",
  COMPLETED = "completed",
  REJECTED = "rejected",
}

export enum PaymentStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUNDED = "refunded",
}

export enum TicketStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  RESOLVED = "resolved",
  CLOSED = "closed",
}

export enum TicketCategory {
  PAYMENT = "payment",
  TECHNICAL = "technical",
  REVIEW = "review",
  GENERAL = "general",
}

export enum BookingStatus {
  PAID = "paid",
  CONFIRMED = "confirmed",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum SubscriptionPlan {
  FREE = "free",
  BASIC = "basic",
  PREMIUM = "premium",
  ENTERPRISE = "enterprise",
}

/* ── Data interfaces ────────────────────────────────── */
export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  creditBalance: number;
  phone?: string;
  country?: string;
  targetBand?: number;
  examDate?: string;
  website?: string;
  profileImage?: string;
  isEmailVerified?: boolean;
  twoFactorEnabled?: boolean;
  subscription?: ISubscription;
  createdAt: string;
  updatedAt: string;
}

export interface ISubscription {
  _id: string;
  userId: string;
  plan: SubscriptionPlan;
  practiceTestsAllowed: number;
  practiceTestsUsed: number;
  mockTestsAllowed: number;
  mockTestsUsed: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface ITest {
  _id: string;
  title: string;
  description: string;
  difficulty: string;
  duration: number;
  isActive: boolean;
  createdAt: string;
}

export interface IPracticeTest extends ITest {
  module: TestModule;
  content: any;
}

export interface IMockTest extends ITest {
  listening: any;
  reading: any;
  writing: any;
  speaking: any;
}

export interface IAttempt {
  _id: string;
  userId: string;
  testId: string;
  testType: TestType;
  module?: TestModule;
  status: AttemptStatus;
  answers: any;
  autoScores?: { listening?: number; reading?: number };
  manualScores?: { writing?: number; speaking?: number };
  overallBand?: number;
  completionPercentage: number;
  timeTaken: number;
  startedAt: string;
  completedAt?: string;
}

export interface IReviewRequest {
  _id: string;
  attemptId: string;
  studentId: string;
  reviewerId?: string;
  module: TestModule;
  status: ReviewStatus;
  creditsDeducted: number;
  createdAt: string;
}

export interface IReviewFeedback {
  _id: string;
  reviewRequestId: string;
  attemptId: string;
  reviewerId: string;
  module: TestModule;
  bandScore: number;
  feedback: string;
  criteriaScores: Record<string, number>;
  createdAt: string;
}

export interface IPayment {
  _id: string;
  userId: string;
  transactionId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  packageType: string;
  packageId: string;
  createdAt: string;
}

export interface ICreditLedger {
  _id: string;
  userId: string;
  action: string;
  amount: number;
  balanceAfter: number;
  referenceId?: string;
  description: string;
  createdAt: string;
}

export interface ISupportTicket {
  _id: string;
  userId: string;
  subject: string;
  category: string;
  status: TicketStatus;
  messages: Array<{
    senderId: string;
    senderRole: UserRole;
    message: string;
    timestamp: string;
  }>;
  createdAt: string;
}

export interface ICourseVideo {
  _id: string;
  title: string;
  description: string;
  category?: string;
  module?: TestModule;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  price: number;
  isFree: boolean;
  bundleId?: string;
  sortOrder: number;
  outline: string[];
  attachments: string[];
  isActive: boolean;
  createdAt: string;
}

export interface ICourseNote {
  _id: string;
  videoId: string;
  userId: string;
  content: string;
  videoTimestamp?: number;
  createdAt: string;
  updatedAt: string;
}

export interface IBooking {
  _id: string;
  userId: string;
  preferredDate: string;
  preferredTimeSlot: string;
  confirmedDate?: string;
  confirmedTimeSlot?: string;
  status: BookingStatus;
  notes?: string;
  createdAt: string;
}

/* ── API response shapes ────────────────────────────── */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

/* ── Auth ────────────────────────────────────────────── */
export interface LoginPayload {
  email: string;
  password: string;
  fingerprint: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  country?: string;
  targetBand?: number;
  examDate?: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
  fingerprint: string;
}

/* ── Listening Module ────────────────────────────────── */
export enum ListeningQuestionType {
  MULTIPLE_CHOICE = "multiple_choice",
  MULTIPLE_CHOICE_MULTIPLE = "multiple_choice_multiple",
  FILL_IN_BLANK = "fill_in_blank",
  MATCHING = "matching",
  FORM_COMPLETION = "form_completion",
  MAP_LABELING = "map_labeling",
  TABLE_COMPLETION = "table_completion",
  /** Flow chart steps with [[GAP]]; word bank for drag/drop pool */
  FLOWCHART_COMPLETION = "flowchart_completion",
  /** Note lines: `# ` headings; only `[[GAP]]` creates blanks (no implicit line box) */
  NOTE_COMPLETION = "note_completion",
}

export interface IListeningQuestion {
  id: string;
  type: ListeningQuestionType;
  questionText: string;
  options?: string[];
  /** FLOWCHART_COMPLETION: words shown in the answer pool (distractors ok) */
  wordBank?: string[];
  answer: string | string[];
  /** For MULTIPLE_CHOICE_MULTIPLE: number of selections (default 2) */
  selectCount?: number;
  /** For MATCHING (box style): stems = first N options; rest = pool */
  matchStemCount?: number;
  /** MAP_LABELING: map image URL (with options = row labels → grid UI) */
  mapImageUrl?: string;
  /** MAP_LABELING: number of lettered points (default 8 → A–H) */
  mapChoiceCount?: number;
  points?: number;
}

export interface IListeningSection {
  partNumber: number;
  title: string;
  description?: string;
  questions: IListeningQuestion[];
}

export interface IListeningTest {
  _id: string;
  title: string;
  description?: string;
  audioUrl: string;
  duration: number;
  allowReplay: boolean;
  sections: IListeningSection[];
  answerKey?: Record<string, string>;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface IListeningAttempt {
  _id: string;
  userId: string;
  testId: string;
  mode: "practice" | "exam";
  status: "in_progress" | "submitted" | "abandoned";
  answers?: Record<string, string>;
  score?: number;
  totalQuestions?: number;
  percentage?: number;
  expiresAt?: number;
  createdAt: string;
  updatedAt: string;
}

/* ── Speaking Module ────────────────────────────────── */
export interface ISpeakingTest {
  _id: string;
  title: string;
  description?: string;
  part1Questions: string[];
  cueCardTopic: string;
  cueCardInstructions?: string;
  prepTime: number;
  speakingTime: number;
  part3Questions: string[];
  totalDuration: number;
  perQuestionRecording: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ISpeakingRecording {
  part: 1 | 2 | 3;
  questionIndex?: number;
  questionText?: string;
  audioUrl: string;
  durationSeconds?: number;
  uploadedAt: string;
}

export interface ISpeakingSession {
  _id: string;
  userId: string;
  testId: string;
  mode: "practice" | "exam";
  status: "active" | "submitted" | "abandoned";
  recordings?: ISpeakingRecording[];
  score?: number;
  partScores?: { part1?: number; part2?: number; part3?: number };
  feedback?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  submittedAt?: string;
  expiresAt?: number;
  createdAt: string;
  updatedAt: string;
}
