import Redis from "ioredis";
import { env } from "./env";

export const redis = new Redis({
  host: env.redisHost,
  port: env.redisPort,
  password: env.redisPassword,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redis.on("connect", () => {
  console.log("✅ Redis connected");
});

redis.on("error", (err) => {
  console.error("❌ Redis connection error:", err.message);
});

// ─── OTP helpers ───────────────────────────────────────────
export const setOTP = async (
  key: string,
  otp: string,
  expiry: number,
): Promise<void> => {
  await redis.set(`otp:${key}`, otp, "EX", expiry);
};

export const getOTP = async (key: string): Promise<string | null> => {
  return redis.get(`otp:${key}`);
};

export const deleteOTP = async (key: string): Promise<void> => {
  await redis.del(`otp:${key}`);
};

// ─── Session helpers ───────────────────────────────────────
export const setSession = async (
  userId: string,
  fingerprint: string,
  token: string,
  expiry: number,
): Promise<void> => {
  await redis.set(
    `session:${userId}`,
    JSON.stringify({ fingerprint, token }),
    "EX",
    expiry,
  );
};

export const getSession = async (
  userId: string,
): Promise<{ fingerprint: string; token: string } | null> => {
  const data = await redis.get(`session:${userId}`);
  return data ? JSON.parse(data) : null;
};

export const deleteSession = async (userId: string): Promise<void> => {
  await redis.del(`session:${userId}`);
};

// ─── Rate limit helpers ────────────────────────────────────
export const incrementRateLimit = async (
  key: string,
  windowSeconds: number,
): Promise<number> => {
  const current = await redis.incr(`ratelimit:${key}`);
  if (current === 1) {
    await redis.expire(`ratelimit:${key}`, windowSeconds);
  }
  return current;
};

// ─── Test lock helpers ─────────────────────────────────────
export const setTestLock = async (
  userId: string,
  testId: string,
  expiry: number,
): Promise<boolean> => {
  const result = await redis.set(
    `testlock:${userId}:${testId}`,
    "1",
    "EX",
    expiry,
    "NX",
  );
  return result === "OK";
};

export const deleteTestLock = async (
  userId: string,
  testId: string,
): Promise<void> => {
  await redis.del(`testlock:${userId}:${testId}`);
};

// ─── Transaction state helpers ─────────────────────────────
export const setTransactionState = async (
  txnId: string,
  state: string,
  expiry: number,
): Promise<void> => {
  await redis.set(`txn:${txnId}`, state, "EX", expiry);
};

export const getTransactionState = async (
  txnId: string,
): Promise<string | null> => {
  return redis.get(`txn:${txnId}`);
};
