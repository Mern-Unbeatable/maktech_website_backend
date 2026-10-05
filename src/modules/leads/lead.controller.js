import { catchAsync } from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { httpStatus } from '../../utils/httpStatus.js';
import { calculatePagination } from '../../utils/paginationHelper.js';

export class LeadController {
  constructor(leadService) {
    this.leadService = leadService;
  }

  createLead = catchAsync(async (req, res) => {
    const source = req.user ? 'MANUAL' : 'WEBSITE';
    const leadData = { ...req.body, source };
    const result = await this.leadService.createLead(leadData);
    
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Your message has been submitted successfully!',
      data: result
    });
  });

  getAllLeads = catchAsync(async (req, res) => {
    const paginationOptions = calculatePagination(req.query);
    const filters = {
      searchTerm: req.query.searchTerm,
      status: req.query.status
    };

    const result = await this.leadService.getAllLeads(paginationOptions, filters);
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Leads fetched successfully!',
      meta: result.meta,
      data: result.data
    });
  });

  getLeadStats = catchAsync(async (req, res) => {
    const result = await this.leadService.getLeadStats();
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Lead stats fetched successfully!',
      data: result
    });
  });

  getLeadById = catchAsync(async (req, res) => {
    const result = await this.leadService.getLeadById(req.params.id);
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Lead fetched successfully!',
      data: result
    });
  });

  updateLead = catchAsync(async (req, res) => {
    const result = await this.leadService.updateLead(req.params.id, req.body);
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Lead updated successfully!',
      data: result
    });
  });

  deleteLead = catchAsync(async (req, res) => {
    await this.leadService.deleteLead(req.params.id);
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Lead deleted successfully!',
      data: null
    });
  });
}


