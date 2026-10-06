import express from 'express';
import { EmailsController } from './emails.controller.js';
import { EmailsService } from './emails.service.js';
import { auth } from '../../middlewares/auth.js';

const router = express.Router();

const emailsService = new EmailsService();
const emailsController = new EmailsController(emailsService);

// We should protect email endpoints to ADMIN only
router.post('/send', auth('ADMIN'), emailsController.sendEmail);
router.get('/inbox', auth('ADMIN'), emailsController.getInbox);

export const emailsModule = { router };
