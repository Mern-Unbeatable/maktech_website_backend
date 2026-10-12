import express from "express";
import { JobsController } from "./jobs.controller.js";
import { JobsService } from "./jobs.service.js";
import { JobsValidation } from "./jobs.validation.js";
import { auth } from "../../middlewares/auth.js";
import { upload } from "../../middlewares/upload.js";

const router = express.Router();

const jobsService = new JobsService();
const jobsController = new JobsController(jobsService);

// ─── Public routes ────────────────────────────────────────────────────────────
router.get("/", jobsController.getAllJobs);
router.get("/:id", jobsController.getJobById);

// Public application submission (supports resume file upload via "resume" field)
router.post(
  "/:id/apply",
  upload.single("resume"),
  JobsValidation.validate(JobsValidation.applyJobSchema),
  jobsController.applyForJob
);

// ─── Admin Job Posting Management routes ──────────────────────────────────────
router.post(
  "/",
  auth("ADMIN"),
  JobsValidation.validate(JobsValidation.createJobSchema),
  jobsController.createJob
);

router.patch(
  "/:id",
  auth("ADMIN"),
  JobsValidation.validate(JobsValidation.updateJobSchema),
  jobsController.updateJob
);

router.delete(
  "/:id",
  auth("ADMIN"),
  jobsController.deleteJob
);

// ─── Admin Applicants Management routes ───────────────────────────────────────
router.get(
  "/:id/applicants",
  auth("ADMIN"),
  jobsController.getJobApplicants
);

router.get(
  "/applicants/:applicantId",
  auth("ADMIN"),
  jobsController.getApplicantById
);

router.patch(
  "/applicants/:applicantId/status",
  auth("ADMIN"),
  JobsValidation.validate(JobsValidation.updateApplicantStatusSchema),
  jobsController.updateApplicantStatus
);

router.patch(
  "/applicants/:applicantId/notes",
  auth("ADMIN"),
  JobsValidation.validate(JobsValidation.updateApplicantNotesSchema),
  jobsController.updateApplicantNotes
);

router.delete(
  "/applicants/:applicantId",
  auth("ADMIN"),
  jobsController.deleteApplicant
);

export const jobsModule = { router };
