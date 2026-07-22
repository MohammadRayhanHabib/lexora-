import {
  Entity,
  ObjectIdColumn,
  ObjectId,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";
import { TestModule } from "../types";

@Entity("review_feedback")
export class ReviewFeedback {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  @Index()
  reviewRequestId!: string;

  @Column()
  @Index()
  reviewerId!: string;

  @Column()
  @Index()
  userId!: string;

  @Column()
  attemptId!: string;

  @Column({ type: "enum", enum: TestModule })
  module!: TestModule;

  @Column()
  bandScore!: number;

  @Column()
  feedback!: string;

  // Detailed criteria scores
  @Column("json", { nullable: true })
  criteriaScores?: {
    // Writing criteria
    taskAchievement?: number;
    coherenceCohesion?: number;
    lexicalResource?: number;
    grammaticalRange?: number;
    // Speaking criteria
    fluencyCoherence?: number;
    pronunciation?: number;
  };

  @Column({ nullable: true })
  additionalNotes?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
