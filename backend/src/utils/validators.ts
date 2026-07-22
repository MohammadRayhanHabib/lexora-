import Joi from "joi";

// ─── Auth Validators ───────────────────────────────────────
export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  phone: Joi.string().optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  fingerprint: Joi.string().required(),
});

export const verifyOTPSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required(),
  fingerprint: Joi.string().required(),
});

// ─── Test Validators ───────────────────────────────────────
export const startPracticeSchema = Joi.object({
  testId: Joi.string().required(),
  module: Joi.string()
    .valid("listening", "reading", "writing", "speaking")
    .required(),
});

export const startMockSchema = Joi.object({
  testId: Joi.string().required(),
});

export const submitAnswersSchema = Joi.object({
  attemptId: Joi.string().required(),
  answers: Joi.object().required(),
  timeTaken: Joi.number().integer().min(0).required(),
});

// ─── Review Validators ────────────────────────────────────
export const requestReviewSchema = Joi.object({
  attemptId: Joi.string().required(),
  module: Joi.string().valid("writing", "speaking").required(),
});

export const submitFeedbackSchema = Joi.object({
  reviewRequestId: Joi.string().required(),
  bandScore: Joi.number().min(0).max(9).required(),
  feedback: Joi.string().min(10).required(),
  criteriaScores: Joi.object({
    taskAchievement: Joi.number().min(0).max(9).optional(),
    coherenceCohesion: Joi.number().min(0).max(9).optional(),
    lexicalResource: Joi.number().min(0).max(9).optional(),
    grammaticalRange: Joi.number().min(0).max(9).optional(),
    fluencyCoherence: Joi.number().min(0).max(9).optional(),
    pronunciation: Joi.number().min(0).max(9).optional(),
  }).optional(),
});

// ─── Payment Validators ───────────────────────────────────
export const createPaymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  currency: Joi.string().default("BDT"),
  paymentMethod: Joi.string()
    .valid("bkash", "nagad", "card", "bank")
    .required(),
  transactionId: Joi.string().required(),
  packageType: Joi.string()
    .valid("credits", "subscription", "video", "bundle", "booking")
    .required(),
  packageId: Joi.string().optional(),
  quantity: Joi.number().integer().positive().default(1),
});

// ─── Support Validators ───────────────────────────────────
export const createTicketSchema = Joi.object({
  subject: Joi.string().min(5).max(200).required(),
  message: Joi.string().min(10).required(),
  category: Joi.string()
    .valid("payment", "technical", "review", "general")
    .required(),
});

export const replyTicketSchema = Joi.object({
  ticketId: Joi.string().required(),
  message: Joi.string().min(1).required(),
});

// ─── Booking Validators ───────────────────────────────────
export const createBookingSchema = Joi.object({
  preferredDate: Joi.date().iso().required(),
  preferredTimeSlot: Joi.string().required(),
  notes: Joi.string().max(1000).optional(),
  transactionId: Joi.string().required(),
});

// ─── Admin Validators ─────────────────────────────────────
export const updateUserStatusSchema = Joi.object({
  userId: Joi.string().required(),
  isActive: Joi.boolean().required(),
});

export const assignReviewerSchema = Joi.object({
  reviewRequestId: Joi.string().required(),
  reviewerId: Joi.string().required(),
});

export const manageSubscriptionSchema = Joi.object({
  userId: Joi.string().required(),
  action: Joi.string().valid("extend", "suspend", "activate").required(),
  days: Joi.number().integer().positive().optional(),
});

export const createPromoCodeSchema = Joi.object({
  code: Joi.string().min(3).max(30).required(),
  discountPercent: Joi.number().min(1).max(100).required(),
  maxUses: Joi.number().integer().positive().required(),
  expiresAt: Joi.date().iso().required(),
  applicableTo: Joi.string()
    .valid("credits", "subscription", "video", "bundle", "booking")
    .required(),
});

// ─── Validate helper ──────────────────────────────────────
export const validate = (
  schema: Joi.ObjectSchema,
  data: any,
): { error?: string; value: any } => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    const messages = error.details.map((d) => d.message).join(", ");
    return { error: messages, value: null };
  }
  return { value };
};
