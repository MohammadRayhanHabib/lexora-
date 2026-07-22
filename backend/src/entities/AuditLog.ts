import {
  Entity,
  ObjectIdColumn,
  ObjectId,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";
import { AuditAction } from "../types";

@Entity("audit_logs")
export class AuditLog {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column({ nullable: true })
  @Index()
  userId?: string;

  @Column({ type: "enum", enum: AuditAction })
  @Index()
  action!: AuditAction;

  @Column({ nullable: true })
  resourceType?: string; // 'user', 'attempt', 'payment', 'review', etc.

  @Column({ nullable: true })
  resourceId?: string;

  @Column("json", { nullable: true })
  details?: Record<string, any>;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  fingerprint?: string;

  @CreateDateColumn()
  @Index()
  createdAt!: Date;
}
