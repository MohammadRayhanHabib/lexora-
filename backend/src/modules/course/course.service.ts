import { ObjectId } from "mongodb";
import { AppDataSource } from "../../config/database";
import { CourseVideo } from "../../entities/CourseVideo";
import { CourseNote } from "../../entities/CourseNote";
import { AuditAction } from "../../types";
import { createAuditLog } from "../../middlewares/auditLogger";
import {
  deleteObjectFromObjectStorage,
  getObjectStorageKeyFromUrl,
} from "../../utils/objectStorage";
import { env } from "../../config/env";

const videoRepo = () => AppDataSource.getMongoRepository(CourseVideo);
const noteRepo = () => AppDataSource.getMongoRepository(CourseNote);
const purchaseCollection = () =>
  (AppDataSource.mongoManager.queryRunner as any)?.databaseConnection
    ?.db()
    .collection("video_purchases");

export class CourseService {
  async createVideo(
    data: Partial<CourseVideo>,
    adminId: string,
  ): Promise<CourseVideo> {
    const video = new CourseVideo();
    Object.assign(video, data);
    video.createdBy = adminId;
    video.totalViews = 0;
    video.isActive = true;

    const saved = await videoRepo().save(video);

    await createAuditLog({
      userId: adminId,
      action: AuditAction.VIDEO_PURCHASED,
      resourceType: "course_video",
      resourceId: saved._id.toString(),
      details: { title: data.title, action: "created" },
    });

    return saved;
  }

  async updateVideo(
    videoId: string,
    data: Partial<CourseVideo>,
  ): Promise<CourseVideo> {
    const video = await videoRepo().findOne({
      where: { _id: new ObjectId(videoId) as any },
    });
    if (!video) throw new Error("Video not found");
    Object.assign(video, data);
    return videoRepo().save(video);
  }

  async listVideos(category?: string): Promise<CourseVideo[]> {
    const where: any = { isActive: true };
    if (category) where.category = category;
    return videoRepo().find({ where, order: { sortOrder: "ASC" } });
  }

  async adminListVideos(): Promise<CourseVideo[]> {
    return videoRepo().find({ order: { sortOrder: "ASC" } });
  }

  async getVideo(videoId: string): Promise<CourseVideo> {
    const video = await videoRepo().findOne({
      where: { _id: new ObjectId(videoId) as any },
    });
    if (!video) throw new Error("Video not found");
    return video;
  }

  async incrementViews(videoId: string): Promise<void> {
    await videoRepo().updateOne(
      { _id: new ObjectId(videoId) },
      { $inc: { totalViews: 1 } },
    );
  }

  async getStreamUrl(videoId: string, userId: string): Promise<string> {
    const video = await this.getVideo(videoId);

    await this.incrementViews(videoId);

    // Return streaming URL (not a direct download link)
    return video.videoUrl;
  }

  async purchaseVideo(
    userId: string,
    videoId: string,
    paymentId: string,
  ): Promise<void> {
    const video = await this.getVideo(videoId);
    await createAuditLog({
      userId,
      action: AuditAction.VIDEO_PURCHASED,
      resourceType: "course_video",
      resourceId: videoId,
      details: { title: video.title, paymentId, access: "direct" },
    });
  }

  async getUserPurchasedVideos(userId: string): Promise<string[]> {
    const videos = await this.listVideos();
    return videos.map((video) => video._id.toString());
  }

  async getPurchasedVideos(userId: string): Promise<CourseVideo[]> {
    return this.listVideos();
  }

  async listNotes(videoId: string, userId: string): Promise<CourseNote[]> {
    await this.assertCanAccessVideo(videoId, userId);
    return noteRepo().find({
      where: { videoId, userId },
      order: { createdAt: "DESC" },
    });
  }

  async createNote(
    videoId: string,
    userId: string,
    content: string,
    videoTimestamp?: number,
  ): Promise<CourseNote> {
    await this.assertCanAccessVideo(videoId, userId);

    const note = new CourseNote();
    note.videoId = videoId;
    note.userId = userId;
    note.content = content;
    note.videoTimestamp = videoTimestamp;
    return noteRepo().save(note);
  }

  async deleteNote(noteId: string, userId: string): Promise<void> {
    const note = await noteRepo().findOne({
      where: { _id: new ObjectId(noteId) as any },
    });
    if (!note) throw new Error("Note not found");
    if (note.userId !== userId) throw new Error("Forbidden");
    await noteRepo().deleteOne({ _id: note._id });
  }

  private async assertCanAccessVideo(videoId: string, userId: string) {
    await this.getVideo(videoId);
  }

  async deleteVideo(videoId: string): Promise<void> {
    const video = await this.getVideo(videoId);
    await videoRepo().updateOne(
      { _id: new ObjectId(videoId) },
      { $set: { isActive: false } },
    );

    const videoKey = getObjectStorageKeyFromUrl(
      video.videoUrl,
      env.storageCourseBucket,
    );
    if (videoKey) {
      await deleteObjectFromObjectStorage({
        bucket: env.storageCourseBucket,
        key: videoKey,
      });
    }

    if (video.thumbnailUrl) {
      const thumbnailKey = getObjectStorageKeyFromUrl(
        video.thumbnailUrl,
        env.storagePicturesBucket,
      );
      if (thumbnailKey) {
        await deleteObjectFromObjectStorage({
          bucket: env.storagePicturesBucket,
          key: thumbnailKey,
        });
      }
    }
  }
}

export const courseService = new CourseService();
