import {
  Entity,
  ObjectIdColumn,
  ObjectId,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum SpeakingSessionStatus {
  ACTIVE = "active",
  SUBMITTED = "submitted",
  ABANDONED = "abandoned",
}

export enum SpeakingTestMode {
  PRACTICE = "practice",
  EXAM = "exam",
}

export interface SpeakingRecording {
  part: 1 | 2 | 3;
  questionIndex?: number; // which question (Part1, Part3)
  audioUrl: string;
  durationSeconds?: number;
  uploadedAt: string; // ISO string
}

@Entity("speaking_sessions")
export class SpeakingSession {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  @Index()
  userId!: string;

  @Column()
  @Index()
  testId!: string;

  @Column({
    type: "enum",
    enum: SpeakingTestMode,
    default: SpeakingTestMode.PRACTICE,
  })
  mode!: SpeakingTestMode;

  @Column({
    type: "enum",
    enum: SpeakingSessionStatus,
    default: SpeakingSessionStatus.ACTIVE,
  })
  @Index()
  status!: SpeakingSessionStatus;

  /** All recorded audio files */
  @Column("simple-json", { nullable: true })
  recordings?: SpeakingRecording[];

  /** Overall band score (set by admin/reviewer) */
  @Column({ nullable: true })
  score?: number;

  /** Part-level scores */
  @Column("simple-json", { nullable: true })
  partScores?: { part1?: number; part2?: number; part3?: number };

  /** Admin feedback text */
  @Column({ nullable: true })
  feedback?: string;

  /** Who scored this session */
  @Column({ nullable: true })
  reviewedBy?: string;

  @Column({ nullable: true })
  reviewedAt?: Date;

  /** Epoch ms when session expires / was submitted */
  @Column({ nullable: true })
  expiresAt?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
