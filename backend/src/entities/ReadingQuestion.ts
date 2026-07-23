import {
  Entity,
  ObjectIdColumn,
  ObjectId,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum ReadingQuestionType {
  TRUE_FALSE_NOT_GIVEN = "true_false_not_given",
  YES_NO_NOT_GIVEN = "yes_no_not_given",
  MCQ_SINGLE = "mcq_single",
  MCQ_MULTIPLE = "mcq_multiple",
  TITLE_SUBTITLE_FINDING = "title_subtitle_finding",
  FILL_IN_BLANKS = "fill_in_blanks",
  SENTENCE_COMPLETION = "sentence_completion",
  SUMMARY_COMPLETION = "summary_completion",
  NOTE_COMPLETION = "note_completion",
  MATCHING_HEADINGS = "matching_headings",
  MATCHING_INFORMATION = "matching_information",
  MATCHING_FEATURES = "matching_features",
  LIST_MATCHING = "list_matching",
  /** IELTS-style: letter box on the left, item to classify on the right (same mechanics as list matching). */
  CLASSIFICATION = "classification",
  MATCHING_SENTENCE_ENDINGS = "matching_sentence_endings",
  DRAG_AND_DROP = "drag_and_drop",
  TABLE_COMPLETION = "table_completion",
  FLOWCHART_COMPLETION = "flowchart_completion",
  DIAGRAM_LABEL_COMPLETION = "diagram_label_completion",
  SHORT_ANSWER = "short_answer",
}

/**
 * Every allowed `questionType` wire value. Derived from the string enum so
 * adding a member here always allows the same value in API validation (no
 * duplicate list to keep in sync).
 */
const READING_QUESTION_TYPE_VALUE_SET = new Set<string>(
  Object.values(ReadingQuestionType).filter(
    (v) => typeof v === "string",
  ) as string[],
);

export function isReadingQuestionType(v: unknown): v is ReadingQuestionType {
  if (typeof v !== "string") return false;
  return READING_QUESTION_TYPE_VALUE_SET.has(v.trim());
}

@Entity("reading_questions")
export class ReadingQuestion {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  @Index()
  readingTestId!: string;

  @Column({
    type: "enum",
    enum: ReadingQuestionType,
    default: ReadingQuestionType.MCQ_SINGLE,
  })
  questionType!: ReadingQuestionType;

  /** Displayed above the question (e.g. "Choose ONE letter A–D") */
  @Column({ nullable: true })
  instructions?: string;

  @Column()
  questionText!: string;

  /**
   * For MCQ: answer choices
   * For Matching: the list items to match (e.g. paragraph letters A–E)
   * For TFNG / YNNNG: ["TRUE","FALSE","NOT GIVEN"] or ["YES","NO","NOT GIVEN"]
   */
  @Column("json", { nullable: true })
  options?: string[];

  /**
   * Word bank for DRAG_AND_DROP / SUMMARY / TABLE / FLOWCHART types, heading
   * pools, sentence endings, and matching information column letters (A–G).
   */
  @Column("json", { nullable: true })
  wordBank?: string[];

  /**
   * Correct answer(s).
   * Single string for TFNG, MCQ_SINGLE, SHORT_ANSWER etc.
   * Array for MCQ_MULTIPLE, FILL_IN_BLANKS (multiple acceptable answers),
   * DRAG_AND_DROP (ordered array), MATCHING types.
   */
  @Column("json")
  correctAnswer!: string | string[];

  @Column({ default: 1 })
  orderNumber!: number;

  /** Optional grouping label e.g. "Questions 1–6 (Passage A)" */
  @Column({ nullable: true })
  groupLabel?: string;

  /** Page number for group-based pagination (all questions with the same
   *  pageNumber appear together on one scrollable page). Default: 1. */
  @Column({ default: 1 })
  pageNumber!: number;

  @Column({ default: 1 })
  marks!: number;

  @Column({ nullable: true })
  explanation?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
