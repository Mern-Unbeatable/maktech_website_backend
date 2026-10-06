import { catchAsync } from '../../utils/catchAsync.js';
import { ApiError } from '../../utils/ApiError.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { httpStatus } from '../../utils/httpStatus.js';
import { calculatePagination } from '../../utils/paginationHelper.js';

export class CaseStudyController {
  constructor(caseStudyService) {
    this.caseStudyService = caseStudyService;
  }

  createCaseStudy = catchAsync(async (req, res) => {
    const caseStudy = await this.caseStudyService.createCaseStudy(req.body);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Case study created successfully',
      data: caseStudy
    });
  });

  getAllCaseStudies = catchAsync(async (req, res) => {
    const paginationOptions = calculatePagination(req.query);
    const filters = {
      searchTerm: req.query.searchTerm,
      category: req.query.category
    };

    const result = await this.caseStudyService.getAllCaseStudies(paginationOptions, filters);
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Case studies fetched successfully',
      meta: result.meta,
      data: result.data
    });
  });

  getCaseStudyById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const caseStudy = await this.caseStudyService.getCaseStudyById(id);
    
    if (!caseStudy) {
      throw new ApiError('Case study not found', 404);
    }
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Case study fetched successfully',
      data: caseStudy
    });
  });

  updateCaseStudy = catchAsync(async (req, res) => {
    const { id } = req.params;
    const caseStudy = await this.caseStudyService.updateCaseStudy(id, req.body);
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Case study updated successfully',
      data: caseStudy
    });
  });

  deleteCaseStudy = catchAsync(async (req, res) => {
    const { id } = req.params;
    await this.caseStudyService.deleteCaseStudy(id);
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Case study deleted successfully',
      data: null
    });
  });
}
