import { ObjectId } from "mongodb";
import { AppDataSource } from "../../config/database";
import { SupportTicket } from "../../entities/SupportTicket";
import { TicketStatus, TicketCategory, AuditAction } from "../../types";
import { createAuditLog } from "../../middlewares/auditLogger";

const ticketRepo = () => AppDataSource.getMongoRepository(SupportTicket);

export class SupportService {
  async createTicket(
    userId: string,
    subject: string,
    message: string,
    category: TicketCategory,
  ): Promise<SupportTicket> {
    const ticket = new SupportTicket();
    ticket.userId = userId;
    ticket.subject = subject;
    ticket.category = category;
    ticket.status = TicketStatus.OPEN;
    ticket.messages = [
      {
        senderId: userId,
        senderRole: "student",
        message,
        timestamp: new Date(),
      },
    ];

    const saved = await ticketRepo().save(ticket);

    await createAuditLog({
      userId,
      action: AuditAction.TICKET_CREATED,
      resourceType: "support_ticket",
      resourceId: saved._id.toString(),
      details: { subject, category },
    });

    return saved;
  }

  async replyToTicket(
    ticketId: string,
    senderId: string,
    senderRole: string,
    message: string,
  ): Promise<SupportTicket> {
    const ticket = await ticketRepo().findOne({
      where: { _id: new ObjectId(ticketId) as any },
    });
    if (!ticket) throw new Error("Ticket not found");

    ticket.messages.push({
      senderId,
      senderRole,
      message,
      timestamp: new Date(),
    });

    if (senderRole === "admin" || senderRole === "super_admin") {
      ticket.status = TicketStatus.IN_PROGRESS;
    }

    return ticketRepo().save(ticket);
  }

  async updateTicketStatus(
    ticketId: string,
    status: TicketStatus,
  ): Promise<SupportTicket> {
    const ticket = await ticketRepo().findOne({
      where: { _id: new ObjectId(ticketId) as any },
    });
    if (!ticket) throw new Error("Ticket not found");

    ticket.status = status;
    if (status === TicketStatus.RESOLVED) ticket.resolvedAt = new Date();

    return ticketRepo().save(ticket);
  }

  async getUserTickets(userId: string): Promise<SupportTicket[]> {
    return ticketRepo().find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
  }

  async getAllTickets(
    status?: TicketStatus,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ tickets: SupportTicket[]; total: number }> {
    const where: any = {};
    if (status) where.status = status;

    const [tickets, total] = await ticketRepo().findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { tickets, total };
  }

  async getTicket(ticketId: string): Promise<SupportTicket> {
    const ticket = await ticketRepo().findOne({
      where: { _id: new ObjectId(ticketId) as any },
    });
    if (!ticket) throw new Error("Ticket not found");
    return ticket;
  }
}

export const supportService = new SupportService();
