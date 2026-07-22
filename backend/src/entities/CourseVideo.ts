import {
  Entity,
  ObjectIdColumn,
  ObjectId,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("course_videos")
export class CourseVideo {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  @Index()
  title!: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  videoUrl!: string; // Streaming URL, not direct download

  @Column({ nullable: true })
  thumbnailUrl?: string;

  @Column({ default: 0 })
  duration!: number; // in seconds

  @Column({ nullable: true })
  category?: string;

  @Column({ default: 0 })
  @Index()
  sortOrder!: number;

  @Column({ default: true })
  @Index()
  isActive!: boolean;

  @Column({ default: false })
  isFree!: boolean;

  @Column({ default: 0 })
  price!: number;

  @Column({ nullable: true })
  bundleId?: string;

  // Outline / attachments
  @Column("json", { nullable: true })
  outline?: Array<{
    title: string;
    timestamp: number; // seconds
    description?: string;
  }>;

  @Column("json", { nullable: true })
  attachments?: Array<{
    title: string;
    fileUrl: string;
    fileType: string;
  }>;

  @Column({ default: 0 })
  totalViews!: number;

  @Column({ nullable: true })
  createdBy?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
