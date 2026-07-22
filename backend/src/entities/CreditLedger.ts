import {
  Entity,
  ObjectIdColumn,
  ObjectId,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";
import { CreditAction } from "../types";

/**
 * Immutable credit ledger - every credit change is logged here.
 * Never update or delete rows; only insert.
 */
@Entity("credit_ledger")
export class CreditLedger {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  @Index()
  userId!: string;

  @Column({ type: "enum", enum: CreditAction })
  action!: CreditAction;

  @Column()
  amount!: number;

  @Column()
  balanceAfter!: number;

  @Column()
  reason!: string;

  @Column({ nullable: true })
  referenceId?: string; // paymentId, reviewRequestId, etc.

  @Column({ nullable: true })
  referenceType?: string; // 'payment', 'review_request', 'admin_adjustment'

  @Column({ nullable: true })
  performedBy?: string; // userId of admin if manual

  @CreateDateColumn()
  createdAt!: Date;
}
