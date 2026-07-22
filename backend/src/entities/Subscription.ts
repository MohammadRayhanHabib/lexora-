import {
  Entity,
  ObjectIdColumn,
  ObjectId,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { SubscriptionPlan, SubscriptionStatus } from "../types";

@Entity("subscriptions")
export class Subscription {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  @Index()
  userId!: string;

  @Column({
    type: "enum",
    enum: SubscriptionPlan,
    default: SubscriptionPlan.FREE,
  })
  plan!: SubscriptionPlan;

  @Column({
    type: "enum",
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  @Index()
  status!: SubscriptionStatus;

  @Column()
  startDate!: Date;

  @Column()
  endDate!: Date;

  @Column({ default: false })
  autoRenew!: boolean;

  @Column({ nullable: true })
  paymentId?: string;

  // Feature limits per plan
  @Column({ default: 0 })
  practiceTestsAllowed!: number;

  @Column({ default: 0 })
  mockTestsAllowed!: number;

  @Column({ default: 0 })
  practiceTestsUsed!: number;

  @Column({ default: 0 })
  mockTestsUsed!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
