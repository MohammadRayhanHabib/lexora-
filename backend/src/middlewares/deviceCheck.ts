import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../utils/response";
import { AuthenticatedRequest } from "../types";

/**
 * Block requests from mobile devices for full mock tests
 */
export const blockMobileForMock = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const userAgent = req.headers["user-agent"] || "";
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      userAgent,
    );

  if (isMobile) {
    ApiResponse.forbidden(
      res,
      "Full mock tests are not available on mobile devices. Please use a desktop browser.",
    );
    return;
  }

  next();
};

/**
 * Check for device fingerprint consistency
 */
export const validateFingerprint = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const fingerprint = req.headers["x-device-fingerprint"] as string;

  if (!fingerprint || fingerprint.length < 10) {
    ApiResponse.badRequest(res, "Valid device fingerprint is required");
    return;
  }

  next();
};

/**
 * Detect incognito mode attempt via header flag (set by frontend)
 */
export const detectIncognito = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const isIncognito = req.headers["x-incognito-detected"] === "true";

  if (isIncognito) {
    ApiResponse.forbidden(
      res,
      "Incognito/private browsing is not allowed during tests.",
    );
    return;
  }

  next();
};
