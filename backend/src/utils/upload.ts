import multer from "multer";
import path from "path";
import fs from "fs";

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const imageFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ok =
    allowed.test(path.extname(file.originalname).toLowerCase()) &&
    allowed.test(file.mimetype);
  if (ok) cb(null, true);
  else cb(new Error("Only image files (jpg, png, webp) are allowed"));
};

export const uploadWritingImage = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// ─────────────────────────────────────────────────────────
// Listening — audio upload  (admin uploads test audio)
// ─────────────────────────────────────────────────────────
const audioFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowedExt = /mp3|wav|ogg|webm|m4a/;
  const allowedMime = /audio\/(mpeg|wav|ogg|webm|mp4|x-m4a|mp3|x-wav|wave)/;
  const extOk = allowedExt.test(
    path.extname(file.originalname).toLowerCase().replace(".", ""),
  );
  const mimeOk = allowedMime.test(file.mimetype);
  if (extOk || mimeOk) cb(null, true);
  else cb(new Error("Only audio files (mp3, wav, ogg, webm, m4a) are allowed"));
};

export const uploadListeningAudio = multer({
  storage: multer.memoryStorage(),
  fileFilter: audioFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

// ─────────────────────────────────────────────────────────
// Listening — map labelling image (admin, memory → object storage)
// ─────────────────────────────────────────────────────────
const mapImageFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowedExt = /jpeg|jpg|png|webp|gif|svg/;
  const extOk = allowedExt.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimeOk = file.mimetype.startsWith("image/");
  if (extOk && mimeOk) cb(null, true);
  else
    cb(
      new Error(
        "Only image files (jpg, png, webp, gif, svg) are allowed for map upload",
      ),
    );
};

export const uploadListeningMapImage = multer({
  storage: multer.memoryStorage(),
  fileFilter: mapImageFilter,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
});

// ─────────────────────────────────────────────────────────
// Speaking — student recordings upload
// ─────────────────────────────────────────────────────────
const speakingAudioStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(process.cwd(), "uploads", "speaking");
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".webm";
    cb(null, `speaking_${Date.now()}${ext}`);
  },
});

export const uploadSpeakingAudio = multer({
  storage: speakingAudioStorage,
  fileFilter: audioFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB per chunk
});

// ─────────────────────────────────────────────────────────
// Course video upload (admin uploads lesson videos)
// ─────────────────────────────────────────────────────────
const videoFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowedExt = /mp4|webm|mov|m4v/;
  const allowedMime = /video\/(mp4|webm|quicktime|x-m4v|x-msvideo)/;
  const extOk = allowedExt.test(
    path.extname(file.originalname).toLowerCase().replace(".", ""),
  );
  const mimeOk = allowedMime.test(file.mimetype);
  if (extOk || mimeOk) cb(null, true);
  else cb(new Error("Only video files (mp4, webm, mov, m4v) are allowed"));
};

export const uploadCourseVideoAssets = multer({
  storage: multer.memoryStorage(),
  fileFilter: videoFilter,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
});

// ─────────────────────────────────────────────────────────
// Profile photo upload
// ─────────────────────────────────────────────────────────
export const uploadProfilePhoto = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// ─────────────────────────────────────────────────────────
// Reading — passage image upload (memory, sent to object storage)
// ─────────────────────────────────────────────────────────
export const uploadReadingPassageImage = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFilter,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
});
