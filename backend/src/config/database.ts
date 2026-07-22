import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "./env";

// Import all entities
import { User } from "../entities/User";
import { Subscription } from "../entities/Subscription";
import { Payment } from "../entities/Payment";
import { CreditLedger } from "../entities/CreditLedger";
import { MockTest } from "../entities/MockTest";
import { PracticeTest } from "../entities/PracticeTest";
import { Attempt } from "../entities/Attempt";
import { ReviewRequest } from "../entities/ReviewRequest";
import { ReviewFeedback } from "../entities/ReviewFeedback";
import { SupportTicket } from "../entities/SupportTicket";
import { CourseVideo } from "../entities/CourseVideo";
import { OneOnOneBooking } from "../entities/OneOnOneBooking";
import { AuditLog } from "../entities/AuditLog";
import { ReadingTest } from "../entities/ReadingTest";
import { ReadingQuestion } from "../entities/ReadingQuestion";
import { ReadingAttempt } from "../entities/ReadingAttempt";
import { Enrollment } from "../entities/Enrollment";
import { WritingModule } from "../entities/WritingModule";
import { WritingSession } from "../entities/WritingSession";
import { ListeningTest } from "../entities/ListeningTest";
import { ListeningAttempt } from "../entities/ListeningAttempt";
import { SpeakingTest } from "../entities/SpeakingTest";
import { SpeakingSession } from "../entities/SpeakingSession";
import { ScheduleItem } from "../entities/ScheduleItem";
import { CourseNote } from "../entities/CourseNote";
import { MockExam } from "../entities/MockExam";
import { MockExamAttempt } from "../entities/MockExamAttempt";

export const AppDataSource = new DataSource({
  type: "mongodb",
  url: env.mongodbUrl,
  synchronize: true, // Auto-manages indexes; conflicting legacy indexes were dropped
  logging: env.nodeEnv === "development",
  entities: [
    User,
    Subscription,
    Payment,
    CreditLedger,
    MockTest,
    PracticeTest,
    Attempt,
    ReviewRequest,
    ReviewFeedback,
    SupportTicket,
    CourseVideo,
    OneOnOneBooking,
    AuditLog,
    ReadingTest,
    ReadingQuestion,
    ReadingAttempt,
    Enrollment,
    WritingModule,
    WritingSession,
    ListeningTest,
    ListeningAttempt,
    SpeakingTest,
    SpeakingSession,
    ScheduleItem,
    CourseNote,
    MockExam,
    MockExamAttempt,
  ],
});

export const connectDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log("✅ MongoDB connected via TypeORM");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
};
