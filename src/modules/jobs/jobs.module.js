import express from 'express';
import { JobsController } from './jobs.controller.js';
import { JobsService } from './jobs.service.js';
import { JobsValidation } from './jobs.validation.js';
import { auth } from '../../middlewares/auth.js';

const router = express.Router();

const jobsService = new JobsService();
const jobsController = new JobsController(jobsService);

// Public routes
router.get('/', jobsController.getAllJobs);
router.get('/:id', jobsController.getJobById);

// Protected routes
router.post(
  '/',
  auth('ADMIN'),
  JobsValidation.validate(JobsValidation.createJobSchema),
  jobsController.createJob
);

router.patch(
  '/:id',
  auth('ADMIN'),
  JobsValidation.validate(JobsValidation.updateJobSchema),
  jobsController.updateJob
);

router.delete(
  '/:id',
  auth('ADMIN'),
  jobsController.deleteJob
);

export const jobsModule = { router };
