import { Response } from "express";
import { courseService } from "./course.service";
import { ApiResponse } from "../../utils/response";
import { AuthenticatedRequest } from "../../types";
import {
  deleteObjectFromObjectStorage,
  getObjectStorageKeyFromUrl,
  uploadBufferToObjectStorage,
} from "../../utils/objectStorage";
import { env } from "../../config/env";

function toNumber(value: any): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toBoolean(value: any): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value === "true" || value === "1";
  }
  return undefined;
}

export class CourseController {
  /** GET /api/courses/videos */
  async listVideos(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const category = req.query.category as string | undefined;
      const videos = await courseService.listVideos(category);
      const data = videos.map((v) => ({
        ...v,
        isPurchased: true,
        videoUrl: v.videoUrl,
      }));
      ApiResponse.success(res, data);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** GET /api/courses/videos/:id */
  async getVideo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const video = await courseService.getVideo(req.params.id);
      ApiResponse.success(res, video);
    } catch (err: any) {
      ApiResponse.notFound(res, err.message);
    }
  }

  /** GET /api/courses/videos/:id/stream */
  async streamVideo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const streamUrl = await courseService.getStreamUrl(
        req.params.id,
        req.user!.id,
      );
      ApiResponse.success(res, { streamUrl });
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** POST /api/courses/videos/:id/purchase */
  async purchaseVideo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      await courseService.purchaseVideo(
        req.user!.id,
        req.params.id,
        req.body.paymentId || req.body.transactionId || "direct-access",
      );
      ApiResponse.success(res, null, "Video access granted");
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message);
    }
  }

  /** GET /api/courses/purchased */
  async getPurchasedVideos(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const videos = await courseService.getPurchasedVideos(req.user!.id);
      ApiResponse.success(res, videos);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** POST /api/courses/videos (admin) */
  async createVideo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const files = (req as any).files as
        | Record<string, Express.Multer.File[]>
        | undefined;
      const videoFile = files?.videoFile?.[0];
      const thumbnailFile = files?.thumbnailFile?.[0];

      const category = req.body.category || req.body.module;
      const videoUrl = req.body.videoUrl;
      const thumbnailUrl = req.body.thumbnailUrl;

      if (!req.body.title || (!videoUrl && !videoFile)) {
        ApiResponse.badRequest(res, "title and video file/url are required");
        return;
      }

      let resolvedVideoUrl = videoUrl;
      if (videoFile) {
        const uploaded = await uploadBufferToObjectStorage({
          bucket: env.storageCourseBucket,
          folder: "course-videos",
          originalName: videoFile.originalname,
          mimeType: videoFile.mimetype,
          content: videoFile.buffer,
        });
        resolvedVideoUrl = uploaded.url;
      }

      let resolvedThumbnailUrl = thumbnailUrl;
      if (thumbnailFile) {
        const uploaded = await uploadBufferToObjectStorage({
          bucket: env.storagePicturesBucket,
          folder: "course-thumbnails",
          originalName: thumbnailFile.originalname,
          mimeType: thumbnailFile.mimetype,
          content: thumbnailFile.buffer,
        });
        resolvedThumbnailUrl = uploaded.url;
      }

      const video = await courseService.createVideo(
        {
          title: String(req.body.title).trim(),
          description: req.body.description,
          category,
          videoUrl: resolvedVideoUrl,
          thumbnailUrl: resolvedThumbnailUrl,
          duration: toNumber(req.body.duration) ?? 0,
          price: toNumber(req.body.price) ?? 0,
          sortOrder: toNumber(req.body.sortOrder) ?? 0,
          isFree: toBoolean(req.body.isFree) ?? false,
          bundleId: req.body.bundleId,
          outline: req.body.outline,
          attachments: req.body.attachments,
        } as any,
        req.user!.id,
      );
      ApiResponse.created(res, video, "Video created");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** PUT /api/courses/videos/:id (admin) */
  async updateVideo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const existing = await courseService.getVideo(req.params.id);
      const files = (req as any).files as
        | Record<string, Express.Multer.File[]>
        | undefined;
      const videoFile = files?.videoFile?.[0];
      const thumbnailFile = files?.thumbnailFile?.[0];

      const updates: any = { ...req.body };
      if (req.body.category || req.body.module) {
        updates.category = req.body.category || req.body.module;
      }
      if (req.body.duration !== undefined)
        updates.duration = toNumber(req.body.duration);
      if (req.body.price !== undefined)
        updates.price = toNumber(req.body.price);
      if (req.body.sortOrder !== undefined)
        updates.sortOrder = toNumber(req.body.sortOrder);
      if (req.body.isFree !== undefined)
        updates.isFree = toBoolean(req.body.isFree);

      if (videoFile) {
        const uploaded = await uploadBufferToObjectStorage({
          bucket: env.storageCourseBucket,
          folder: "course-videos",
          originalName: videoFile.originalname,
          mimeType: videoFile.mimetype,
          content: videoFile.buffer,
        });
        updates.videoUrl = uploaded.url;
      }

      if (thumbnailFile) {
        const uploaded = await uploadBufferToObjectStorage({
          bucket: env.storagePicturesBucket,
          folder: "course-thumbnails",
          originalName: thumbnailFile.originalname,
          mimeType: thumbnailFile.mimetype,
          content: thumbnailFile.buffer,
        });
        updates.thumbnailUrl = uploaded.url;
      }

      const video = await courseService.updateVideo(req.params.id, updates);

      if (videoFile && existing.videoUrl) {
        const previousVideoKey = getObjectStorageKeyFromUrl(
          existing.videoUrl,
          env.storageCourseBucket,
        );
        if (previousVideoKey) {
          await deleteObjectFromObjectStorage({
            bucket: env.storageCourseBucket,
            key: previousVideoKey,
          });
        }
      }

      if (thumbnailFile && existing.thumbnailUrl) {
        const previousThumbnailKey = getObjectStorageKeyFromUrl(
          existing.thumbnailUrl,
          env.storagePicturesBucket,
        );
        if (previousThumbnailKey) {
          await deleteObjectFromObjectStorage({
            bucket: env.storagePicturesBucket,
            key: previousThumbnailKey,
          });
        }
      }
      ApiResponse.success(res, video, "Video updated");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  /** DELETE /api/courses/videos/:id (admin) */
  async deleteVideo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      await courseService.deleteVideo(req.params.id);
      ApiResponse.success(res, null, "Video deactivated");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  async adminListVideos(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const videos = await courseService.adminListVideos();
      ApiResponse.success(res, videos);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  async listNotes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const notes = await courseService.listNotes(req.params.id, req.user!.id);
      ApiResponse.success(res, notes);
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  async createNote(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { content, videoTimestamp } = req.body;
      if (!content || !String(content).trim()) {
        ApiResponse.badRequest(res, "content is required");
        return;
      }
      const note = await courseService.createNote(
        req.params.id,
        req.user!.id,
        String(content).trim(),
        toNumber(videoTimestamp),
      );
      ApiResponse.created(res, note, "Note saved");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }

  async deleteNote(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      await courseService.deleteNote(req.params.noteId, req.user!.id);
      ApiResponse.success(res, null, "Note deleted");
    } catch (err: any) {
      ApiResponse.error(res, err.message);
    }
  }
}

export const courseController = new CourseController();
