import { Response } from "express";
import { paymentService } from "./payment.service";
import { ApiResponse } from "../../utils/response";
import { validate, createPaymentSchema } from "../../utils/validators";
import { AuthenticatedRequest, PaymentStatus } from "../../types";

export class PaymentController {
  /** POST /api/payments */
  async createPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { error, value } = validate(createPaymentSchema, req.body);
      if (error) {
        ApiResponse.badRequest(res, error);
        return;
      }

      const payment = await paymentService.createPayment({
        ...value,
        userId: req.user!.id,
      });
      ApiResponse.created(res, payment, "Payment initiated");
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message);
    }
  }

  /** POST /api/payments/verify */
  async verifyPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { transactionId, gatewayResponse } = req.body;
      if (!transactionId) {
        ApiResponse.badRequest(res, "transactionId is required");
        return;
      }

      const payment = await paymentService.verifyAndCompletePayment(
        transactionId,
        gatewayResponse,
      );
      ApiResponse.success(res, payment, "Payment verified and completed");
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message);
    }
  }

  /** POST /api/payments/fail */
  async failPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { transactionId, reason } = req.body;
      if (!transactionId) {
        ApiResponse.badRequest(res, "transactionId is required");
        return;
      }

      const payment = await paymentService.failPayment(transactionId, reason);
      ApiResponse.success(res, payment, "Payment marked as failed");
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message);
    }
  }

  /** GET /api/payments/history */
  async getUserPayments(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { payments, total } = await paymentService.getUserPayments(
        req.user!.id,
        page,
        limit,
      );
      ApiResponse.paginated(res, payments, total, page, limit);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/payments/credits */
  async getCreditLedger(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const { entries, total } = await paymentService.getCreditLedger(
        req.user!.id,
        page,
        limit,
      );
      ApiResponse.paginated(res, entries, total, page, limit);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/payments/all (admin) */
  async getAllPayments(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as PaymentStatus | undefined;
      const { payments, total } = await paymentService.getAllPayments(
        page,
        limit,
        status,
      );
      ApiResponse.paginated(res, payments, total, page, limit);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }
}

export const paymentController = new PaymentController();
