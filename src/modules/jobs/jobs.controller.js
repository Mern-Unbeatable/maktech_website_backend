import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";

export class JobsController {
  constructor(jobsService) {
    this.jobsService = jobsService;
  }

  createJob = catchAsync(async (req, res) => {
    const result = await this.jobsService.createJob(req.body);
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Job created successfully",
      data: result
    });
  });

  getAllJobs = catchAsync(async (req, res) => {
    const result = await this.jobsService.getAllJobs(req.query);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Jobs fetched successfully",
      meta: result.meta,
      data: result.data
    });
  });

  getJobById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const result = await this.jobsService.getJobById(id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Job fetched successfully",
      data: result
    });
  });

  updateJob = catchAsync(async (req, res) => {
    const { id } = req.params;
    const result = await this.jobsService.updateJob(id, req.body);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Job updated successfully",
      data: result
    });
  });

  deleteJob = catchAsync(async (req, res) => {
    const { id } = req.params;
    await this.jobsService.deleteJob(id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Job deleted successfully",
      data: null
    });
  });

  // ─── APPLICANT METHODS ──────────────────────────────────────────────────────

  applyForJob = catchAsync(async (req, res) => {
    const { id } = req.params;
    let resumeUrl = req.body.resumeUrl;
    if (req.file) {
      resumeUrl = `/uploads/${req.file.filename}`;
    }

    const payload = {
      ...req.body,
      resumeUrl: resumeUrl || req.body.resumeUrl
    };

    if (typeof payload.answers === "string") {
      try {
        payload.answers = JSON.parse(payload.answers);
      } catch (e) {
        payload.answers = [];
      }
    }

    const result = await this.jobsService.applyForJob(id, payload);
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Application submitted successfully",
      data: result
    });
  });

  getJobApplicants = catchAsync(async (req, res) => {
    const { id } = req.params;
    const result = await this.jobsService.getJobApplicants(id, req.query);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Job applicants fetched successfully",
      meta: result.meta,
      statusCounts: result.statusCounts,
      job: result.job,
      data: result.data
    });
  });

  getApplicantById = catchAsync(async (req, res) => {
    const { applicantId } = req.params;
    const result = await this.jobsService.getApplicantById(applicantId);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Applicant details fetched successfully",
      data: result
    });
  });

  updateApplicantStatus = catchAsync(async (req, res) => {
    const { applicantId } = req.params;
    const { status } = req.body;
    const result = await this.jobsService.updateApplicantStatus(applicantId, status);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Applicant status updated successfully",
      data: result
    });
  });

  updateApplicantNotes = catchAsync(async (req, res) => {
    const { applicantId } = req.params;
    const { recruiterNotes } = req.body;
    const result = await this.jobsService.updateApplicantNotes(applicantId, recruiterNotes);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Recruiter notes updated successfully",
      data: result
    });
  });

  deleteApplicant = catchAsync(async (req, res) => {
    const { applicantId } = req.params;
    await this.jobsService.deleteApplicant(applicantId);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Applicant deleted successfully",
      data: null
    });
  });
}
