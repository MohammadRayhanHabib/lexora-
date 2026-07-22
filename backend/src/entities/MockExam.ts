import {
  Entity,
  ObjectIdColumn,
  ObjectId,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

/**
 * A full IELTS Mock Exam bundle.
 * Links together existing Listening / Reading / Writing / Speaking test records
 * into a single exam session without duplicating any question data.
 */
@Entity("mock_exams")
export class MockExam {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  @Index()
  title!: string;

  @Column({ nullable: true })
  description?: string;

  // ─── Section test IDs (references to individual module records) ───

  /** ListeningTest._id  */
  @Column({ nullable: true })
  listeningTestId?: string;

  /** ReadingTest._id for Part 1 */
  @Column({ nullable: true })
  readingPart1Id?: string;

  /** ReadingTest._id for Part 2 */
  @Column({ nullable: true })
  readingPart2Id?: string;

  /** ReadingTest._id for Part 3 */
  @Column({ nullable: true })
  readingPart3Id?: string;

  /** WritingModule._id for Task 1 */
  @Column({ nullable: true })
  writingTask1Id?: string;

  /** WritingModule._id for Task 2 */
  @Column({ nullable: true })
  writingTask2Id?: string;

  /** SpeakingTest._id */
  @Column({ nullable: true })
  speakingTestId?: string;

  // ─── Per-section durations (minutes) ──────────────────────────────

  @Column({ default: 40 })
  listeningDuration!: number;

  @Column({ default: 60 })
  readingDuration!: number;

  @Column({ default: 60 })
  writingDuration!: number;

  @Column({ default: 15 })
  speakingDuration!: number;

  // ─── Metadata ─────────────────────────────────────────────────────

  @Column({ default: true })
  @Index()
  isActive!: boolean;

  @Column({ default: "mock" })
  examType!: "mock" | "practice";

  /** Cambridge Academic book number, e.g. 20 */
  @Column({ nullable: true })
  academicNumber?: number;

  /** Which test number in the book, e.g. 2 */
  @Column({ nullable: true })
  testNumber?: number;

  @Column()
  @Index()
  createdBy!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
