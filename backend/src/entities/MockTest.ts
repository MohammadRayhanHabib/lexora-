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

@Entity("mock_tests")
export class MockTest {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  @Index()
  title!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: true })
  @Index()
  isActive!: boolean;

  @Column({ default: false })
  isFinal!: boolean; // Final Mock cannot be split

  // Each module contains question data
  @Column("json")
  listening!: {
    sections: Array<{
      sectionNumber: number;
      audioUrl: string;
      questions: Array<{
        questionNumber: number;
        questionText: string;
        questionType: string; // 'multiple_choice', 'fill_blank', 'matching', 'map', 'diagram'
        options?: string[];
        correctAnswer: string;
        explanation?: string;
      }>;
    }>;
    totalQuestions: number;
    duration: number; // in minutes
  };

  @Column("json")
  reading!: {
    sections: Array<{
      sectionNumber: number;
      passageTitle: string;
      passageText: string;
      questions: Array<{
        questionNumber: number;
        questionText: string;
        questionType: string; // 'multiple_choice', 'true_false_ng', 'fill_blank', 'matching', 'heading'
        options?: string[];
        correctAnswer: string;
        explanation?: string;
      }>;
    }>;
    totalQuestions: number;
    duration: number;
  };

  @Column("json")
  writing!: {
    tasks: Array<{
      taskNumber: number;
      taskType: string; // 'task1', 'task2'
      prompt: string;
      imageUrl?: string; // For graphs/charts in Task 1
      minWords: number;
      maxWords: number;
      duration: number;
    }>;
    totalDuration: number;
  };

  @Column("json")
  speaking!: {
    parts: Array<{
      partNumber: number;
      partType: string; // 'part1', 'part2', 'part3'
      questions: Array<{
        questionText: string;
        cueCard?: string; // For Part 2
        followUpQuestions?: string[];
      }>;
      duration: number;
    }>;
    totalDuration: number;
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
