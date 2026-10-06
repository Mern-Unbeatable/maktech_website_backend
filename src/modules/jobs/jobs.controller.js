import { catchAsync } from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/sendResponse.js';

export class JobsController {
  constructor(jobsService) {
    this.jobsService = jobsService;
  }

  createJob = catchAsync(async (req, res) => {
    const result = await this.jobsService.createJob(req.body);
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Job created successfully',
      data: result
    });
  });

  getAllJobs = catchAsync(async (req, res) => {
    const result = await this.jobsService.getAllJobs(req.query);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Jobs fetched successfully',
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
      message: 'Job fetched successfully',
      data: result
    });
  });

  updateJob = catchAsync(async (req, res) => {
    const { id } = req.params;
    const result = await this.jobsService.updateJob(id, req.body);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Job updated successfully',
      data: result
    });
  });

  deleteJob = catchAsync(async (req, res) => {
    const { id } = req.params;
    await this.jobsService.deleteJob(id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Job deleted successfully',
      data: null
    });
  });
}
