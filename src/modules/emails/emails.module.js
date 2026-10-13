import express from 'express';
import { EmailsController } from './emails.controller.js';
import { EmailsService } from './emails.service.js';
import { auth } from '../../middlewares/auth.js';

const router = express.Router();

const emailsService = new EmailsService();
const emailsController = new EmailsController(emailsService);

// ── Public Tracking Routes (Public - No Token Required for Email Clients!) ──
router.get('/track/open/:trackingId.png', emailsController.trackOpen);
router.get('/track/click', emailsController.trackClick);

// ── Protected Admin Routes (Requires Admin Login) ──
router.post('/send', auth('ADMIN'), emailsController.sendEmail);
router.get('/sent', auth('ADMIN'), emailsController.getSentEmails);
router.get('/messages/:id', auth('ADMIN'), emailsController.getEmailDetails);
router.get('/inbox', auth('ADMIN'), emailsController.getInbox);
router.get('/stats', auth('ADMIN'), emailsController.getStats);
router.patch('/:id/read', auth('ADMIN'), emailsController.markAsRead);

export const emailsModule = { router };
