import { Router } from 'express';
import { UploadController } from './uploads.controller.js';
import { upload } from '../../middlewares/upload.js';
import { auth } from '../../middlewares/auth.js';

export class UploadModule {
  constructor() {
    this.router = Router();
    this.uploadController = new UploadController();
    this.initializeRoutes();
  }

  initializeRoutes() {
    // Only Admin can upload files (used in rich text editor or cover images)
    this.router.post(
      '/',
      auth('ADMIN'),
      upload.single('image'),
      this.uploadController.uploadFile
    );

    // Route for deleting uploaded files
    this.router.delete(
      '/:filename',
      auth('ADMIN'),
      this.uploadController.deleteFile
    );
  }
}
