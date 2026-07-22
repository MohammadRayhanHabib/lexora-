import dotenv from "dotenv";
dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),

  // MongoDB
  mongodbUrl: process.env.MONGODB_URL || "mongodb://localhost:27017/lexora",

  // Redis
  redisHost: process.env.REDIS_HOST || "127.0.0.1",
  redisPort: parseInt(process.env.REDIS_PORT || "6379", 10),
  redisPassword: process.env.REDIS_PASSWORD || undefined,

  // JWT
  jwtSecret: process.env.JWT_SECRET || "default-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",

  // Email
  smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
  smtpPort: parseInt(process.env.SMTP_PORT || "587", 10),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  emailFrom: process.env.EMAIL_FROM || "noreply@lexora.com",

  // OTP
  otpExpiry: parseInt(process.env.OTP_EXPIRY_SECONDS || "300", 10),

  // Frontend
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",

  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",

  // Storage
  storageEndpoint: process.env.STORAGE_ENDPOINT || "",
  storageAccessKey: process.env.STORAGE_ACCESS_KEY || "",
  storageSecretKey: process.env.STORAGE_SECRET_KEY || "",
  storageBucket: process.env.STORAGE_BUCKET || "lexora-assets",
  storageCourseBucket:
    process.env.STORAGE_COURSE_BUCKET ||
    process.env.STORAGE_SPEAKING_BUCKET ||
    "lexora-course-videos",
  storagePicturesBucket:
    process.env.STORAGE_PICTURES_BUCKET ||
    process.env.STORAGE_BUCKET ||
    "lexora-pictures",
  storageListeningBucket:
    process.env.STORAGE_LISTENING_BUCKET ||
    process.env.STORAGE_BUCKET ||
    "lexora-listening-audio",
  storageSpeakingBucket:
    process.env.STORAGE_SPEAKING_BUCKET || "lexora-speaking-audio",
  storageRegion: process.env.STORAGE_REGION || "us-east-1",
};
