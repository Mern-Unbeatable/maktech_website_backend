import express, { Router } from 'express';
import { auth } from '../../middlewares/auth.js';
import { MediaController, MAX_PART_SIZE } from './media.controller.js';

const rawChunk = express.raw({ type: () => true, limit: MAX_PART_SIZE });

export class MediaModule {
  constructor() {
    this.router = Router();
    this.mediaController = new MediaController();
    this.initializeRoutes();
  }

  initializeRoutes() {
    this.router.get('/', auth('ADMIN'), this.mediaController.list);
    this.router.delete('/', auth('ADMIN'), this.mediaController.remove);
    this.router.post('/multipart/start', auth('ADMIN'), this.mediaController.startUpload);
    this.router.post(
      '/multipart/part',
      auth('ADMIN'),
      rawChunk,
      this.mediaController.uploadPart
    );
    this.router.post('/multipart/complete', auth('ADMIN'), this.mediaController.completeUpload);
    this.router.post('/multipart/abort', auth('ADMIN'), this.mediaController.abortUpload);
  }
}
