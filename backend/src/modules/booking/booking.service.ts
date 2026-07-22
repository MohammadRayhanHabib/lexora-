import { ObjectId } from "mongodb";
import { AppDataSource } from "../../config/database";
import { OneOnOneBooking } from "../../entities/OneOnOneBooking";
import { BookingStatus, AuditAction } from "../../types";
import { createAuditLog } from "../../middlewares/auditLogger";

const bookingRepo = () => AppDataSource.getMongoRepository(OneOnOneBooking);

export class BookingService {
  async createBooking(data: {
    userId: string;
    preferredDate: Date;
    preferredTimeSlot: string;
    notes?: string;
    paymentId: string;
  }): Promise<OneOnOneBooking> {
    const booking = new OneOnOneBooking();
    booking.userId = data.userId;
    booking.preferredDate = data.preferredDate;
    booking.preferredTimeSlot = data.preferredTimeSlot;
    booking.notes = data.notes;
    booking.paymentId = data.paymentId;
    booking.status = BookingStatus.PAID;
    booking.durationMinutes = 90; // 1.5 hours

    const saved = await bookingRepo().save(booking);

    await createAuditLog({
      userId: data.userId,
      action: AuditAction.BOOKING_CREATED,
      resourceType: "one_on_one_booking",
      resourceId: saved._id.toString(),
      details: {
        preferredDate: data.preferredDate,
        preferredTimeSlot: data.preferredTimeSlot,
      },
    });

    return saved;
  }

  async confirmBooking(
    bookingId: string,
    confirmedDate: Date,
    confirmedTimeSlot: string,
    adminId: string,
    adminNotes?: string,
  ): Promise<OneOnOneBooking> {
    const booking = await bookingRepo().findOne({
      where: { _id: new ObjectId(bookingId) as any },
    });
    if (!booking) throw new Error("Booking not found");

    booking.status = BookingStatus.CONFIRMED;
    booking.confirmedDate = confirmedDate;
    booking.confirmedTimeSlot = confirmedTimeSlot;
    booking.confirmedBy = adminId;
    booking.confirmedAt = new Date();
    booking.adminNotes = adminNotes;

    const saved = await bookingRepo().save(booking);

    await createAuditLog({
      userId: adminId,
      action: AuditAction.BOOKING_CONFIRMED,
      resourceType: "one_on_one_booking",
      resourceId: bookingId,
      details: { confirmedDate, confirmedTimeSlot },
    });

    return saved;
  }

  async completeBooking(bookingId: string): Promise<OneOnOneBooking> {
    const booking = await bookingRepo().findOne({
      where: { _id: new ObjectId(bookingId) as any },
    });
    if (!booking) throw new Error("Booking not found");

    booking.status = BookingStatus.COMPLETED;
    booking.completedAt = new Date();

    return bookingRepo().save(booking);
  }

  async cancelBooking(bookingId: string): Promise<OneOnOneBooking> {
    const booking = await bookingRepo().findOne({
      where: { _id: new ObjectId(bookingId) as any },
    });
    if (!booking) throw new Error("Booking not found");

    booking.status = BookingStatus.CANCELLED;
    return bookingRepo().save(booking);
  }

  async getUserBookings(userId: string): Promise<OneOnOneBooking[]> {
    return bookingRepo().find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
  }

  async getAllBookings(
    status?: BookingStatus,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ bookings: OneOnOneBooking[]; total: number }> {
    const where: any = {};
    if (status) where.status = status;

    const [bookings, total] = await bookingRepo().findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { bookings, total };
  }

  async getBooking(bookingId: string): Promise<OneOnOneBooking> {
    const booking = await bookingRepo().findOne({
      where: { _id: new ObjectId(bookingId) as any },
    });
    if (!booking) throw new Error("Booking not found");
    return booking;
  }
}

export const bookingService = new BookingService();
