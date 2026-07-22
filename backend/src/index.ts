import "reflect-metadata";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";
import logger from "./utils/logger";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";

/* ── Route imports ──────────────────────────────────── */
import authRoutes from "./modules/auth/auth.routes";
import testEngineRoutes from "./modules/test-engine/testEngine.routes";
import reviewRoutes from "./modules/review/review.routes";
import paymentRoutes from "./modules/payment/payment.routes";
import adminRoutes from "./modules/admin/admin.routes";
import supportRoutes from "./modules/support/support.routes";
import courseRoutes from "./modules/course/course.routes";
import bookingRoutes from "./modules/booking/booking.routes";
import path from "path";
import readingRoutes from "./modules/reading/reading.routes";
import enrollmentRoutes from "./modules/enrollment/enrollment.routes";
import writingRoutes from "./modules/writing/writing.routes";
import listeningRoutes from "./modules/listening/listening.routes";
import speakingRoutes from "./modules/speaking/speaking.routes";
import scheduleRoutes from "./modules/schedule/schedule.routes";
import mockExamRoutes from "./modules/mock-exam/mockExam.routes";

const app = express();

/* ── Global middleware ──────────────────────────────── */
app.use(helmet());
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Device-Fingerprint",
      "X-Fingerprint",
    ],
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ── Static uploads ─────────────────────────────────── */
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

/* ── Health check ───────────────────────────────────── */
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/* ── API routes ─────────────────────────────────────── */
app.use("/api/auth", authRoutes);
app.use("/api/tests", testEngineRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reading", readingRoutes);
app.use("/api/enrollment", enrollmentRoutes);
app.use("/api/writing", writingRoutes);
app.use("/api/listening", listeningRoutes);
app.use("/api/speaking", speakingRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/mock-exam", mockExamRoutes);

/* ── Error handling ─────────────────────────────────── */
app.use(notFoundHandler);
app.use(errorHandler);

/* ── Start server ───────────────────────────────────── */
const start = async () => {
  try {
    await connectDatabase();
    logger.info("Database connected");

    app.listen(env.port, "0.0.0.0", () => {
      logger.info(`Server running on port ${env.port} [${env.nodeEnv}]`);
    });
  } catch (error) {
    logger.error("Failed to start server", error);
    process.exit(1);
  }
};

start();

export default app;
