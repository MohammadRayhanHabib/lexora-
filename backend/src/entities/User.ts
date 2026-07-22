import {
  Entity,
  ObjectIdColumn,
  ObjectId,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { UserRole, UserStatus } from "../types";

@Entity("users")
export class User {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  @Index()
  name!: string;

  @Column()
  @Index({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ type: "enum", enum: UserRole, default: UserRole.STUDENT })
  @Index()
  role!: UserRole;

  @Column({ type: "enum", enum: UserStatus, default: UserStatus.ACTIVE })
  @Index()
  status!: UserStatus;

  @Column({ default: 0 })
  creditBalance!: number;

  @Column({ nullable: true })
  currentFingerprint?: string;

  @Column({ default: false })
  isEmailVerified!: boolean;

  @Column({ default: false })
  twoFactorEnabled!: boolean;

  @Column({ nullable: true })
  twoFactorSecret?: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ nullable: true })
  targetBand?: number;

  @Column({ nullable: true })
  examDate?: Date;

  @Column({ nullable: true })
  website?: string;

  @Column({ nullable: true })
  profileImage?: string;

  @Column({ nullable: true })
  googleId?: string;

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @Column({ nullable: true })
  lastLoginIp?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
