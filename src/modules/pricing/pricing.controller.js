import { catchAsync } from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/sendResponse.js';

export class PricingController {
  constructor(pricingService) {
    this.pricingService = pricingService;
  }

  createPlan = catchAsync(async (req, res) => {
    const result = await this.pricingService.createPlan(req.body);
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Pricing plan created successfully',
      data: result
    });
  });

  getAllPlans = catchAsync(async (req, res) => {
    const result = await this.pricingService.getAllPlans(req.query);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Pricing plans fetched successfully',
      meta: result.meta,
      data: result.data
    });
  });

  getPlanById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const result = await this.pricingService.getPlanById(id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Pricing plan fetched successfully',
      data: result
    });
  });

  updatePlan = catchAsync(async (req, res) => {
    const { id } = req.params;
    const result = await this.pricingService.updatePlan(id, req.body);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Pricing plan updated successfully',
      data: result
    });
  });

  deletePlan = catchAsync(async (req, res) => {
    const { id } = req.params;
    await this.pricingService.deletePlan(id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Pricing plan deleted successfully',
      data: null
    });
  });
}
