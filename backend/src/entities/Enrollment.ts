import {
  Entity,
  ObjectIdColumn,
  ObjectId,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum EnrollmentType {
  CAM_OFFICIAL_BOOK = "cam_official_book",
  POPULAR_TESTS = "popular_tests",
  RECENT_TESTS = "recent_tests",
  INDIVIDUAL_MODULE = "individual_module",
}

export enum EnrolledModule {
  LISTENING = "listening",
  READING = "reading",
  WRITING = "writing",
  SPEAKING = "speaking",
}

@Entity("enrollments")
export class Enrollment {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Column()
  @Index()
  userId!: string;

  @Column({ type: "enum", enum: EnrollmentType })
  @Index()
  type!: EnrollmentType;

  /** Only set when type === INDIVIDUAL_MODULE */
  @Column({ nullable: true })
  module?: EnrolledModule;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ nullable: true })
  expiresAt?: Date;

  @CreateDateColumn()
  enrolledAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
