import { PrismaClient } from '../../generated/prisma/index.js';
import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';

class OrderService {
  constructor() {
    this.prisma = prisma;
  }

  async generateOrderId() {
    const lastOrder = await this.prisma.order.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    
    if (!lastOrder) return '#1';
    
    const lastNum = parseInt(lastOrder.orderId.replace('#', ''), 10);
    if (isNaN(lastNum)) return '#' + Math.floor(Math.random() * 1000);
    
    return '#' + (lastNum + 1);
  }

  async createOrder(payload) {
    const orderId = await this.generateOrderId();
    
    const result = await this.prisma.order.create({
      data: {
        ...payload,
        orderId
      }
    });
    return result;
  }

  async getAllOrders(filters, options) {
    const { page, limit, skip, sortBy, sortOrder } = options;
    const { searchTerm, status } = filters;

    const andConditions = [];

    if (searchTerm) {
      andConditions.push({
        OR: [
          { client: { contains: searchTerm, mode: 'insensitive' } },
          { service: { contains: searchTerm, mode: 'insensitive' } },
          { orderId: { contains: searchTerm, mode: 'insensitive' } },
        ]
      });
    }

    if (status) {
      andConditions.push({ status });
    }

    const whereConditions = andConditions.length > 0 ? { AND: andConditions } : {};

    const result = await this.prisma.order.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder }
    });

    const total = await this.prisma.order.count({ where: whereConditions });

    return {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1
      },
      data: result
    };
  }

  async getOrderById(id) {
    const result = await this.prisma.order.findUnique({
      where: { id }
    });
    if (!result) throw new ApiError(404, 'Order not found');
    return result;
  }

  async updateOrder(id, payload) {
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, 'Order not found');

    const result = await this.prisma.order.update({
      where: { id },
      data: payload
    });
    return result;
  }

  async deleteOrder(id) {
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, 'Order not found');

    const result = await this.prisma.order.delete({
      where: { id }
    });
    return result;
  }
}

export default OrderService;