import { catchAsync } from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { httpStatus } from '../../utils/httpStatus.js';
import { calculatePagination } from '../../utils/paginationHelper.js';

export class LeadsController {
  constructor(leadsService) {
    this.leadsService = leadsService;
  }

  createLead = catchAsync(async (req, res) => {
    const source = req.user ? 'MANUAL' : 'WEBSITE';
    const leadsData = { ...req.body, source };
    const result = await this.leadsService.createLead(leadsData);
    
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Your meeting request / message has been submitted successfully!',
      data: result
    });
  });

  /*
  // Old slot-picker flow (commented out)
  getBookedSlots = catchAsync(async (req, res) => {
    const result = await this.leadsService.getBookedSlots(req.query.date);
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Booked slots fetched successfully!',
      data: result
    });
  });
  */

  getAllLeads = catchAsync(async (req, res) => {
    const paginationOptions = calculatePagination(req.query);
    const filters = {
      searchTerm: req.query.searchTerm,
      status: req.query.status
    };

    const result = await this.leadsService.getAllLeads(paginationOptions, filters);
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Leads fetched successfully!',
      meta: result.meta,
      data: result.data
    });
  });

  getLeadsStats = catchAsync(async (req, res) => {
    const result = await this.leadsService.getLeadsStats();
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Lead stats fetched successfully!',
      data: result
    });
  });

  getLeadsById = catchAsync(async (req, res) => {
    const result = await this.leadsService.getLeadsById(req.params.id);
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Lead fetched successfully!',
      data: result
    });
  });

  updateLead = catchAsync(async (req, res) => {
    const result = await this.leadsService.updateLead(req.params.id, req.body);
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Lead updated successfully!',
      data: result
    });
  });

  deleteLead = catchAsync(async (req, res) => {
    await this.leadsService.deleteLead(req.params.id);
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Lead deleted successfully!',
      data: null
    });
  });
}
