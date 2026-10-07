import { catchAsync } from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { httpStatus } from '../../utils/httpStatus.js';
import { ApiError } from '../../utils/ApiError.js';
import { calculatePagination } from '../../utils/paginationHelper.js';

export class EmailsController {
  constructor(emailsService) {
    this.emailsService = emailsService;
  }

  sendEmail = catchAsync(async (req, res) => {
    const { to, subject, html } = req.body;
    
    if (!to || !subject || !html) {
      throw new ApiError(400, 'Missing required fields: to, subject, html');
    }

    const result = await this.emailsService.sendEmail(to, subject, html);
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Email sent successfully',
      data: result
    });
  });

  getInbox = catchAsync(async (req, res) => {
    const options = calculatePagination(req.query);
    const result = await this.emailsService.getInbox(options);
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Inbox fetched successfully',
      meta: result.meta,
      data: result.data
    });
  });
  
  markAsRead = catchAsync(async (req, res) => {
    const { id } = req.params;
    await this.emailsService.markAsRead(id);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Email marked as read',
    });
  });

  getStats = catchAsync(async (req, res) => {
    const stats = await this.emailsService.getStats();
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Stats fetched successfully',
      data: stats
    });
  });
}
