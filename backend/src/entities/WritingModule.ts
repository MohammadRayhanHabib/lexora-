import {
  Entity,
  ObjectIdColumn,
  ObjectId,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum WritingTaskType {
  TASK1 = "task1",
  TASK2 = "task2",
}

@Entity("writing_modules")
export class WritingModule {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  @Index()
  title!: string;

  @Column({ type: "enum", enum: WritingTaskType })
  @Index()
  taskType!: WritingTaskType;

  @Column("text")
  instruction!: string;

  /** URL to chart/graph image (Task 1) */
  @Column({ nullable: true })
  imageUrl?: string;

  /** Duration in minutes */
  @Column({ default: 40 })
  duration!: number;

  @Column({ default: true })
  @Index()
  isActive!: boolean;

  @Column()
  createdBy!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
