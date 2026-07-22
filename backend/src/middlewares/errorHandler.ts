import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../utils/response";
import logger from "../utils/logger";

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  logger.error("Unhandled error:", {
    message: err.message,
    stack: err.stack,
    name: err.name,
  });

  if (err.name === "ValidationError") {
    ApiResponse.badRequest(res, err.message);
    return;
  }

  if (err.name === "MongoServerError" && err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    ApiResponse.conflict(res, `Duplicate value for ${field}`);
    return;
  }

  if (err.name === "JsonWebTokenError") {
    ApiResponse.unauthorized(res, "Invalid token");
    return;
  }

  if (err.name === "MulterError") {
    ApiResponse.badRequest(res, `File upload error: ${err.message}`);
    return;
  }

  if (
    typeof err.message === "string" &&
    /Only (audio|image) files|File too large/i.test(err.message)
  ) {
    ApiResponse.badRequest(res, err.message);
    return;
  }

  ApiResponse.error(res, "Internal server error", 500);
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (_req: Request, res: Response): void => {
  ApiResponse.notFound(res, "Route not found");
};
