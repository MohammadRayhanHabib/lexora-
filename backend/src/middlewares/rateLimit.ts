import { Request, Response, NextFunction } from "express";
import { incrementRateLimit } from "../config/redis";
import { ApiResponse } from "../utils/response";

interface RateLimitOptions {
  windowSeconds: number;
  maxRequests: number;
  keyPrefix?: string;
}

/**
 * Redis-based rate limiter middleware
 */
export const rateLimiter = (options: RateLimitOptions) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const key = `${options.keyPrefix || "global"}:${ip}`;

      const current = await incrementRateLimit(key, options.windowSeconds);

      res.setHeader("X-RateLimit-Limit", options.maxRequests);
      res.setHeader(
        "X-RateLimit-Remaining",
        Math.max(0, options.maxRequests - current),
      );

      if (current > options.maxRequests) {
        ApiResponse.error(
          res,
          "Too many requests. Please try again later.",
          429,
        );
        return;
      }

      next();
    } catch (error) {
      // If Redis fails, allow the request but log the error
      console.error("Rate limiter error:", error);
      next();
    }
  };
};

// Pre-configured rate limiters
export const authRateLimiter = rateLimiter({
  windowSeconds: 900, // 15 minutes
  maxRequests: 10,
  keyPrefix: "auth",
});

export const otpRateLimiter = rateLimiter({
  windowSeconds: 300, // 5 minutes
  maxRequests: 5,
  keyPrefix: "otp",
});

export const apiRateLimiter = rateLimiter({
  windowSeconds: 60,
  maxRequests: 100,
  keyPrefix: "api",
});

export const paymentRateLimiter = rateLimiter({
  windowSeconds: 60,
  maxRequests: 10,
  keyPrefix: "payment",
});
