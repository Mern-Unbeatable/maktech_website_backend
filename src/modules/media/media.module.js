import { Router } from 'express';
import multer from 'multer';
import { auth } from '../../middlewares/auth.js';
import { ApiError } from '../../utils/ApiError.js';
import { httpStatus } from '../../utils/httpStatus.js';
import { MediaController } from './media.controller.js';

// SVG is excluded on purpose: it can carry inline scripts when opened from the public bucket URL
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 20 },
  fileFilter: (req, file, cb) =>
    IMAGE_TYPES.includes(file.mimetype)
      ? cb(null, true)
      : cb(
          new ApiError(
            httpStatus.BAD_REQUEST,
            'Only JPG, PNG, WEBP, GIF or AVIF images are allowed'
          ),
          false
        ),
});

export class MediaModule {
  constructor() {
    this.router = Router();
    this.mediaController = new MediaController();
    this.initializeRoutes();
  }

  initializeRoutes() {
    this.router.get('/', auth('ADMIN'), this.mediaController.list);
    this.router.post(
      '/',
      auth('ADMIN'),
      imageUpload.array('images', 20),
      this.mediaController.upload
    );
    this.router.delete('/', auth('ADMIN'), this.mediaController.remove);
  }
}
