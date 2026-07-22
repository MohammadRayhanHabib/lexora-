import {
  Entity,
  ObjectIdColumn,
  ObjectId,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { TestModule } from "../types";

@Entity("practice_tests")
export class PracticeTest {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  @Index()
  title!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: "enum", enum: TestModule })
  @Index()
  module!: TestModule;

  @Column({ default: true })
  @Index()
  isActive!: boolean;

  @Column({ default: "medium" })
  difficulty!: string; // easy, medium, hard

  @Column("json")
  content!: {
    // For Listening
    sections?: Array<{
      sectionNumber: number;
      audioUrl?: string;
      questions: Array<{
        questionNumber: number;
        questionText: string;
        questionType: string;
        options?: string[];
        correctAnswer: string;
        explanation?: string;
      }>;
    }>;
    // For Reading
    passages?: Array<{
      passageTitle: string;
      passageText: string;
      questions: Array<{
        questionNumber: number;
        questionText: string;
        questionType: string;
        options?: string[];
        correctAnswer: string;
        explanation?: string;
      }>;
    }>;
    // For Writing
    tasks?: Array<{
      taskNumber: number;
      taskType: string;
      prompt: string;
      imageUrl?: string;
      minWords: number;
      maxWords: number;
      duration: number;
    }>;
    // For Speaking
    parts?: Array<{
      partNumber: number;
      partType: string;
      questions: Array<{
        questionText: string;
        cueCard?: string;
        followUpQuestions?: string[];
      }>;
      duration: number;
    }>;
    totalQuestions?: number;
    duration: number; // in minutes
  };

  @Column({ nullable: true })
  createdBy?: string;

  @Column({ default: 0 })
  totalAttempts!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
