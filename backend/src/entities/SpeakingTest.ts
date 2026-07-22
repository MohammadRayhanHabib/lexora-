import {
  Entity,
  ObjectIdColumn,
  ObjectId,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("speaking_tests")
export class SpeakingTest {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  @Index()
  title!: string;

  @Column({ nullable: true })
  description?: string;

  // ── Part 1: Interview ─────────────────────────────
  /** Array of question strings for Part 1 */
  @Column("simple-json")
  part1Questions!: string[];

  // ── Part 2: Cue Card ──────────────────────────────
  @Column()
  cueCardTopic!: string;

  @Column({ nullable: true })
  cueCardInstructions?: string;

  /** Preparation time in seconds (default 60) */
  @Column({ default: 60 })
  prepTime!: number;

  /** Speaking time in seconds (default 120) */
  @Column({ default: 120 })
  speakingTime!: number;

  // ── Part 3: Discussion ────────────────────────────
  /** Array of follow-up question strings for Part 3 */
  @Column("simple-json")
  part3Questions!: string[];

  // ── Config ────────────────────────────────────────
  /** Total test duration in minutes */
  @Column({ default: 15 })
  totalDuration!: number;

  /** Allow per-question recording in Part 3 */
  @Column({ default: true })
  perQuestionRecording!: boolean;

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
