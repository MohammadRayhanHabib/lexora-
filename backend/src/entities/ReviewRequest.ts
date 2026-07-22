import {
  Entity,
  ObjectIdColumn,
  ObjectId,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { ReviewStatus, TestModule } from "../types";

@Entity("review_requests")
export class ReviewRequest {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  @Index()
  userId!: string;

  @Column()
  @Index()
  attemptId!: string;

  @Column({ type: "enum", enum: TestModule })
  @Index()
  module!: TestModule; // Only 'writing' or 'speaking'

  @Column({ type: "enum", enum: ReviewStatus, default: ReviewStatus.PENDING })
  @Index()
  status!: ReviewStatus;

  @Column({ nullable: true })
  @Index()
  reviewerId?: string;

  @Column({ default: 1 })
  creditsDeducted!: number;

  @Column({ nullable: true })
  assignedAt?: Date;

  @Column({ nullable: true })
  completedAt?: Date;

  @Column({ nullable: true })
  rejectedAt?: Date;

  @Column({ nullable: true })
  rejectionReason?: string;

  // Submission content for reviewer reference
  @Column("json", { nullable: true })
  submissionContent?: {
    writingResponse?: string;
    speakingAudioUrl?: string;
    taskPrompt?: string;
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
