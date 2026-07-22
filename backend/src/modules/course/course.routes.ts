import { Router } from "express";
import { courseController } from "./course.controller";
import { authenticate, authorize } from "../../middlewares/auth";
import { UserRole } from "../../types";
import { uploadCourseVideoAssets } from "../../utils/upload";

const router = Router();

router.use(authenticate);

// User routes
router.get("/videos", (req, res) => courseController.listVideos(req, res));
router.get("/videos/:id", (req, res) => courseController.getVideo(req, res));
router.get("/videos/:id/stream", (req, res) =>
  courseController.streamVideo(req, res),
);
router.post("/videos/:id/purchase", (req, res) =>
  courseController.purchaseVideo(req, res),
);
router.get("/purchased", (req, res) =>
  courseController.getPurchasedVideos(req, res),
);
router.get("/videos/:id/notes", (req, res) =>
  courseController.listNotes(req, res),
);
router.post("/videos/:id/notes", (req, res) =>
  courseController.createNote(req, res),
);
router.delete("/notes/:noteId", (req, res) =>
  courseController.deleteNote(req, res),
);

// Admin routes
router.get(
  "/admin/videos",
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  (req, res) => courseController.adminListVideos(req, res),
);
router.post(
  "/videos",
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  uploadCourseVideoAssets.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "thumbnailFile", maxCount: 1 },
  ]),
  (req, res) => courseController.createVideo(req, res),
);
router.put(
  "/videos/:id",
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  uploadCourseVideoAssets.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "thumbnailFile", maxCount: 1 },
  ]),
  (req, res) => courseController.updateVideo(req, res),
);
router.delete(
  "/videos/:id",
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  (req, res) => courseController.deleteVideo(req, res),
);

export default router;
