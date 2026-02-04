import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Request, RequestHandler } from 'express';
import { AppError } from './AppError.js';

// Get the directory path for ESM modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists (relative to src/utils, so go up two levels)
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Configure storage for avatars
const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req: Request, file, cb) => {
    const userId = (req as any).user?.userId || 'unknown';
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${userId}-${Date.now()}${ext}`;
    cb(null, filename);
  },
});

// File filter for images only
const imageFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only image files are allowed (JPEG, PNG, GIF, WebP)', 400));
  }
};

// Avatar upload middleware (single file, max 5MB)
export const uploadAvatar: RequestHandler = multer({
  storage: avatarStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
}).single('photo');

// Helper to get public URL for uploaded file
export function getAvatarUrl(filename: string): string {
  return `/uploads/avatars/${filename}`;
}

// Helper to delete old avatar file
export function deleteOldAvatar(avatarUrl: string | null): void {
  if (!avatarUrl) return;

  try {
    // Extract filename from URL
    const filename = avatarUrl.split('/').pop();
    if (!filename) return;

    const filePath = path.join(avatarsDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error deleting old avatar:', error);
  }
}
