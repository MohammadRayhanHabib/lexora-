import {
  Entity,
  ObjectIdColumn,
  ObjectId,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum ListeningQuestionType {
  MULTIPLE_CHOICE = "multiple_choice",
  /** Choose N answers (checkboxes); options ordered A, B, C…; answer key = JSON sorted letters */
  MULTIPLE_CHOICE_MULTIPLE = "multiple_choice_multiple",
  FILL_IN_BLANK = "fill_in_blank",
  MATCHING = "matching",
  FORM_COMPLETION = "form_completion",
  MAP_LABELING = "map_labeling",
  /** IELTS-style table: options[0] = header row (cells split by |||), body rows with [[GAP]] */
  TABLE_COMPLETION = "table_completion",
  /** Flow chart: options = one string per step; use [[GAP]] for each blank; wordBank = draggable pool */
  FLOWCHART_COMPLETION = "flowchart_completion",
  /** Note completion: option lines; `# ` prefix = heading; only [[GAP]] creates blanks (no implicit line box) */
  NOTE_COMPLETION = "note_completion",
}

export interface ListeningQuestion {
  id: string;
  type: ListeningQuestionType;
  questionText: string;
  options?: string[]; // MCQ / matching / table / flowchart steps / note lines (# heading, [[GAP]] blanks)
  /** Word pool for FLOWCHART_COMPLETION (shown beside the chart; extras = distractors) */
  wordBank?: string[];
  /** Single value, or for TABLE / FLOWCHART / NOTE completion: array aligned to [[GAP]] order */
  answer: string | string[];
  /** For MULTIPLE_CHOICE_MULTIPLE: how many options the student must pick (default 2) */
  selectCount?: number;
  /**
   * For MATCHING (IELTS box style): number of left-column stems stored as the
   * first `matchStemCount` entries of `options`; remaining entries are the answer pool (A…).
   * Omit or 0 for legacy single-dropdown matching (stem = questionText, pool = options).
   */
  matchStemCount?: number;
  /**
   * For MAP_LABELING (IELTS): URL of the map image. When set with non-empty
   * `options` (one string per numbered label row), students use the map + letter grid.
   */
  mapImageUrl?: string;
  /** For MAP_LABELING: how many letters on the map (A … default 8). */
  mapChoiceCount?: number;
  points?: number;
}

export interface ListeningSection {
  partNumber: number; // 1..4
  title: string;
  description?: string;
  questions: ListeningQuestion[];
}

@Entity("listening_tests")
export class ListeningTest {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  @Index()
  title!: string;

  @Column({ nullable: true })
  description?: string;

  /** Object storage URL for listening audio */
  @Column()
  audioUrl!: string;

  /** Duration in minutes */
  @Column({ default: 40 })
  duration!: number;

  /**
   * Whether students may replay audio (practice=true, exam=false by default)
   */
  @Column({ default: false })
  allowReplay!: boolean;

  /** JSON array of ListeningSection */
  @Column("simple-json")
  sections!: ListeningSection[];

  /** Flat map of questionId → correctAnswer  (auto-computed on save) */
  @Column("simple-json", { nullable: true })
  answerKey?: Record<string, string>;

  @Column({ default: true })
  @Index()
  isActive!: boolean;

  @Column()
  @Index()
  createdBy!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
