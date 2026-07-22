import {
  Entity,
  ObjectIdColumn,
  ObjectId,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("reading_tests")
export class ReadingTest {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  @Index()
  title!: string;

  @Column()
  passageTitle!: string;

  /** Rich text HTML content */
  @Column({ type: "text" })
  passageContent!: string;

  @Column({ nullable: true })
  passageImage?: string;

  /** Duration in minutes (default 60) */
  @Column({ default: 60 })
  duration!: number;

  @Column({ default: 0 })
  totalQuestions!: number;

  // ─── Hierarchy grouping ──────────────────────────────────
  /**
   * Cambridge IELTS Academic book number, e.g. 20, 19, 18…
   * null = ungrouped / legacy test
   */
  @Column({ nullable: true })
  academicNumber?: number;

  /**
   * Which full test inside the book (1–4).
   * Only meaningful when academicNumber is set.
   */
  @Column({ nullable: true })
  testNumber?: number;

  /**
   * Passage number / part inside the test (1–3).
   * Only meaningful when testNumber is set.
   */
  @Column({ nullable: true })
  partNumber?: number;

  /**
   * Human-readable label for the dominant question type in this part,
   * e.g. "Short Answer", "Identify", "Choice", "Matching", "Heading".
   * Used on the filter bar in the student UI.
   */
  @Column({ nullable: true })
  partTypeLabel?: string;
  // ─────────────────────────────────────────────────────────

  @Column({ default: true })
  @Index()
  isActive!: boolean;

  /** Whether to show answer explanations after submission */
  @Column({ default: false })
  showExplanations!: boolean;

  @Column()
  @Index()
  createdBy!: string; // userId of admin

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
