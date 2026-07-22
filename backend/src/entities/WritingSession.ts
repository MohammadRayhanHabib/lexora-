import {
  Entity,
  ObjectIdColumn,
  ObjectId,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum WritingSessionStatus {
  ACTIVE = "active",
  PAUSED = "paused",
  SUBMITTED = "submitted",
  AUTO_SUBMITTED = "auto_submitted",
}

export enum WritingSessionMode {
  PRACTICE = "practice",
  EXAM = "exam",
}

@Entity("writing_sessions")
export class WritingSession {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  @Index()
  userId!: string;

  @Column()
  @Index()
  moduleId!: string;

  @Column({ type: "enum", enum: WritingSessionMode })
  mode!: WritingSessionMode;

  @Column({
    type: "enum",
    enum: WritingSessionStatus,
    default: WritingSessionStatus.ACTIVE,
  })
  @Index()
  status!: WritingSessionStatus;

  /** Essay text — latest submitted/autosaved version */
  @Column({ nullable: true })
  essayText?: string;

  @Column({ default: 0 })
  wordCount!: number;

  @Column()
  startTime!: Date;

  @Column({ nullable: true })
  endTime?: Date;

  /** Remaining seconds at pause */
  @Column({ nullable: true })
  remainingTime?: number;

  /** Band score 0–9 set by reviewer */
  @Column({ nullable: true })
  score?: number;

  @Column({ nullable: true })
  feedback?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
