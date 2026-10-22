import { Router } from 'express';
import { auth } from '../../middlewares/auth.js';
import { MediaController } from './media.controller.js';

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
    this.router.post('/multipart/sign', auth('ADMIN'), this.mediaController.signParts);
    this.router.post('/multipart/complete', auth('ADMIN'), this.mediaController.completeUpload);
    this.router.post('/multipart/abort', auth('ADMIN'), this.mediaController.abortUpload);
  }
}
