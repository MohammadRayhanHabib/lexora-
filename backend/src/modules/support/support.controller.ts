import { Response } from "express";
import { supportService } from "./support.service";
import { ApiResponse } from "../../utils/response";
import {
  validate,
  createTicketSchema,
  replyTicketSchema,
} from "../../utils/validators";
import { AuthenticatedRequest, TicketStatus } from "../../types";

export class SupportController {
  /** POST /api/support/tickets */
  async createTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { error, value } = validate(createTicketSchema, req.body);
      if (error) {
        ApiResponse.badRequest(res, error);
        return;
      }

      const ticket = await supportService.createTicket(
        req.user!.id,
        value.subject,
        value.message,
        value.category,
      );
      ApiResponse.created(res, ticket, "Support ticket created");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** POST /api/support/tickets/reply */
  async replyToTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { error, value } = validate(replyTicketSchema, req.body);
      if (error) {
        ApiResponse.badRequest(res, error);
        return;
      }

      const ticket = await supportService.replyToTicket(
        value.ticketId,
        req.user!.id,
        req.user!.role,
        value.message,
      );
      ApiResponse.success(res, ticket, "Reply sent");
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message);
    }
  }

  /** GET /api/support/tickets */
  async getUserTickets(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const tickets = await supportService.getUserTickets(req.user!.id);
      ApiResponse.success(res, tickets);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/support/tickets/:id */
  async getTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const ticket = await supportService.getTicket(req.params.id);
      ApiResponse.success(res, ticket);
    } catch (err: any) {
      ApiResponse.notFound(res, err.message);
    }
  }

  /** GET /api/support/tickets/all (admin) */
  async getAllTickets(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const status = req.query.status as TicketStatus | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const { tickets, total } = await supportService.getAllTickets(
        status,
        page,
        limit,
      );
      ApiResponse.paginated(res, tickets, total, page, limit);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** PUT /api/support/tickets/:id/status */
  async updateStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { status } = req.body;
      if (!status) {
        ApiResponse.badRequest(res, "status is required");
        return;
      }
      const ticket = await supportService.updateTicketStatus(
        req.params.id,
        status,
      );
      ApiResponse.success(res, ticket, "Ticket status updated");
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message);
    }
  }
}

export const supportController = new SupportController();
