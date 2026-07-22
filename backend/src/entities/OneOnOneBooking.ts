import {
  Entity,
  ObjectIdColumn,
  ObjectId,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { BookingStatus } from "../types";

@Entity("one_on_one_bookings")
export class OneOnOneBooking {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  @Index()
  userId!: string;

  @Column({
    type: "enum",
    enum: BookingStatus,
    default: BookingStatus.PENDING_PAYMENT,
  })
  @Index()
  status!: BookingStatus;

  @Column()
  preferredDate!: Date;

  @Column()
  preferredTimeSlot!: string;

  @Column({ nullable: true })
  confirmedDate?: Date;

  @Column({ nullable: true })
  confirmedTimeSlot?: string;

  @Column({ default: 90 })
  durationMinutes!: number; // 1.5 hours = 90 min

  @Column({ nullable: true })
  notes?: string; // User's notes before payment

  @Column({ nullable: true })
  paymentId?: string;

  @Column({ nullable: true })
  adminNotes?: string;

  @Column({ nullable: true })
  confirmedBy?: string; // Admin userId

  @Column({ nullable: true })
  confirmedAt?: Date;

  @Column({ nullable: true })
  completedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
