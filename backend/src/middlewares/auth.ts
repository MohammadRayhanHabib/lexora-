import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { getSession } from "../config/redis";
import { ApiResponse } from "../utils/response";
import { AuthenticatedRequest, UserRole } from "../types";

/**
 * Verify JWT token and attach user to request
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      ApiResponse.unauthorized(res, "Access token required");
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, env.jwtSecret) as {
      id: string;
      email: string;
      role: UserRole;
    };

    // Check single-device session
    const fingerprint = req.headers["x-device-fingerprint"] as string;
    if (!fingerprint) {
      ApiResponse.unauthorized(res, "Device fingerprint required");
      return;
    }

    const session = await getSession(decoded.id);
    if (!session) {
      ApiResponse.unauthorized(res, "Session expired. Please login again");
      return;
    }

    if (session.fingerprint !== fingerprint) {
      ApiResponse.unauthorized(
        res,
        "Session active on another device. Please login again",
      );
      return;
    }

    if (session.token !== token) {
      ApiResponse.unauthorized(res, "Invalid session token");
      return;
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      fingerprint,
    };

    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      ApiResponse.unauthorized(res, "Token expired. Please login again");
      return;
    }
    ApiResponse.unauthorized(res, "Invalid token");
  }
};

/**
 * Role-based authorization
 */
export const authorize = (...roles: UserRole[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user) {
      ApiResponse.unauthorized(res, "Not authenticated");
      return;
    }
    if (!roles.includes(req.user.role)) {
      ApiResponse.forbidden(res, "Insufficient permissions");
      return;
    }
    next();
  };
};
