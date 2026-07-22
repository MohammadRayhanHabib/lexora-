import {
  Entity,
  ObjectIdColumn,
  ObjectId,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export type ItemType = "task" | "event";
export type Priority = "low" | "medium" | "high";

@Entity("schedule_items")
export class ScheduleItem {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  @Index()
  userId!: string;

  @Column()
  type!: ItemType;

  @Column()
  title!: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  date!: string; // YYYY-MM-DD

  @Column({ nullable: true })
  time?: string; // HH:mm

  @Column({ nullable: true })
  priority?: Priority;

  @Column({ default: false })
  completed!: boolean;

  @Column()
  color!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
