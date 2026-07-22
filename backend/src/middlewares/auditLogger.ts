import { Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { AuditLog } from "../entities/AuditLog";
import { AuditAction, AuthenticatedRequest } from "../types";
import logger from "../utils/logger";

const auditRepo = () => AppDataSource.getMongoRepository(AuditLog);

/**
 * Middleware to automatically log actions to audit_logs
 */
export const auditLogger = (action: AuditAction, resourceType?: string) => {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const log = new AuditLog();
      log.userId = req.user?.id;
      log.action = action;
      log.resourceType = resourceType;
      log.resourceId = req.params.id || req.body?.id;
      log.details = {
        method: req.method,
        path: req.originalUrl,
        body: sanitizeBody(req.body),
      };
      log.ipAddress = req.ip || req.socket.remoteAddress;
      log.userAgent = req.headers["user-agent"];
      log.fingerprint = req.headers["x-device-fingerprint"] as string;

      // Fire-and-forget (don't block the request)
      auditRepo()
        .save(log)
        .catch((err) => {
          logger.error("Audit log save failed:", err);
        });
    } catch (error) {
      logger.error("Audit logger error:", error);
    }

    next();
  };
};

/**
 * Direct audit log creation (for use in services)
 */
export const createAuditLog = async (data: {
  userId?: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  fingerprint?: string;
}): Promise<void> => {
  try {
    const log = new AuditLog();
    Object.assign(log, data);
    await auditRepo().save(log);
  } catch (error) {
    logger.error("Audit log creation failed:", error);
  }
};

/**
 * Remove sensitive fields from request body before logging
 */
function sanitizeBody(body: any): any {
  if (!body) return {};
  const sanitized = { ...body };
  const sensitiveFields = ["password", "otp", "token", "transactionId"];
  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = "***REDACTED***";
    }
  });
  return sanitized;
}
