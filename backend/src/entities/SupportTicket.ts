import {
  Entity,
  ObjectIdColumn,
  ObjectId,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { TicketStatus, TicketCategory } from "../types";

@Entity("support_tickets")
export class SupportTicket {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  @Index()
  userId!: string;

  @Column()
  subject!: string;

  @Column({ type: "enum", enum: TicketCategory })
  @Index()
  category!: TicketCategory;

  @Column({ type: "enum", enum: TicketStatus, default: TicketStatus.OPEN })
  @Index()
  status!: TicketStatus;

  @Column("json")
  messages!: Array<{
    senderId: string;
    senderRole: string;
    message: string;
    timestamp: Date;
  }>;

  @Column({ nullable: true })
  assignedTo?: string;

  @Column({ nullable: true })
  resolvedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
