import { catchAsync } from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { httpStatus } from '../../utils/httpStatus.js';

export class DashboardController {
  constructor(dashboardService) {
    this.dashboardService = dashboardService;
  }

  getDashboardSummary = catchAsync(async (req, res) => {
    const result = await this.dashboardService.getDashboardSummary();
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Dashboard stats retrieved successfully',
      data: result
    });
  });
}
