import {
  Entity,
  ObjectIdColumn,
  ObjectId,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";
import { PaymentStatus, PaymentMethod, PackageType } from "../types";

@Entity("payments")
export class Payment {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  @Index()
  userId!: string;

  @Column()
  amount!: number;

  @Column({ default: "BDT" })
  currency!: string;

  @Column({ type: "enum", enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @Column()
  @Index({ unique: true })
  transactionId!: string;

  @Column({ type: "enum", enum: PaymentStatus, default: PaymentStatus.PENDING })
  @Index()
  status!: PaymentStatus;

  @Column({ type: "enum", enum: PackageType })
  packageType!: PackageType;

  @Column({ nullable: true })
  packageId?: string;

  @Column({ default: 1 })
  quantity!: number;

  @Column({ nullable: true })
  promoCode?: string;

  @Column({ default: 0 })
  discountAmount!: number;

  @Column({ nullable: true })
  gatewayResponse?: string;

  @Column({ default: false })
  isProcessed!: boolean;

  @Column({ nullable: true })
  processedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
