import { catchAsync } from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { httpStatus } from '../../utils/httpStatus.js';
import { calculatePagination } from '../../utils/paginationHelper.js';

export class OrdersController {
  constructor(ordersService) {
    this.ordersService = ordersService;
  }

  createOrder = catchAsync(async (req, res) => {
    const result = await this.ordersService.createOrder(req.body);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Order created successfully',
      data: result
    });
  });

  getAllOrders = catchAsync(async (req, res) => {
    const filters = {
      searchTerm: req.query.searchTerm,
      status: req.query.status
    };
    const options = calculatePagination(req.query);

    const result = await this.ordersService.getAllOrders(filters, options);

    // Make sure data is before meta in response as requested previously
    res.status(httpStatus.OK).json({
      statusCode: httpStatus.OK,
      success: true,
      message: 'Orders retrieved successfully',
      data: result.data,
      meta: result.meta
    });
  });

  getOrdersById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const result = await this.ordersService.getOrdersById(id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Order retrieved successfully',
      data: result
    });
  });

  updateOrder = catchAsync(async (req, res) => {
    const { id } = req.params;
    const result = await this.ordersService.updateOrder(id, req.body);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Order updated successfully',
      data: result
    });
  });

  deleteOrder = catchAsync(async (req, res) => {
    const { id } = req.params;
    const result = await this.ordersService.deleteOrder(id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Order deleted successfully',
      data: result
    });
  });
}