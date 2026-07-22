import { Response } from "express";
import { bookingService } from "./booking.service";
import { ApiResponse } from "../../utils/response";
import { validate, createBookingSchema } from "../../utils/validators";
import { AuthenticatedRequest, BookingStatus } from "../../types";

export class BookingController {
  /** POST /api/bookings */
  async createBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { error, value } = validate(createBookingSchema, req.body);
      if (error) {
        ApiResponse.badRequest(res, error);
        return;
      }

      const booking = await bookingService.createBooking({
        userId: req.user!.id,
        preferredDate: value.preferredDate,
        preferredTimeSlot: value.preferredTimeSlot,
        notes: value.notes,
        paymentId: value.transactionId,
      });
      ApiResponse.created(
        res,
        booking,
        "Booking created. Awaiting admin confirmation.",
      );
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message);
    }
  }

  /** GET /api/bookings */
  async getUserBookings(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const bookings = await bookingService.getUserBookings(req.user!.id);
      ApiResponse.success(res, bookings);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/bookings/:id */
  async getBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const booking = await bookingService.getBooking(req.params.id);
      ApiResponse.success(res, booking);
    } catch (err: any) {
      ApiResponse.notFound(res, err.message);
    }
  }

  /** GET /api/bookings/all (admin) */
  async getAllBookings(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const status = req.query.status as BookingStatus | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const { bookings, total } = await bookingService.getAllBookings(
        status,
        page,
        limit,
      );
      ApiResponse.paginated(res, bookings, total, page, limit);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** PUT /api/bookings/:id/confirm (admin) */
  async confirmBooking(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { confirmedDate, confirmedTimeSlot, adminNotes } = req.body;
      if (!confirmedDate || !confirmedTimeSlot) {
        ApiResponse.badRequest(
          res,
          "confirmedDate and confirmedTimeSlot are required",
        );
        return;
      }
      const booking = await bookingService.confirmBooking(
        req.params.id,
        confirmedDate,
        confirmedTimeSlot,
        req.user!.id,
        adminNotes,
      );
      ApiResponse.success(res, booking, "Booking confirmed");
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message);
    }
  }

  /** PUT /api/bookings/:id/complete (admin) */
  async completeBooking(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const booking = await bookingService.completeBooking(req.params.id);
      ApiResponse.success(res, booking, "Booking completed");
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message);
    }
  }

  /** PUT /api/bookings/:id/cancel */
  async cancelBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const booking = await bookingService.cancelBooking(req.params.id);
      ApiResponse.success(res, booking, "Booking cancelled");
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message);
    }
  }
}

export const bookingController = new BookingController();
