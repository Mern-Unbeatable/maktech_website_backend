import { z } from 'zod';

export class OrdersValidation {
  static createOrdersSchema = z.object({
    client: z.string({ required_error: 'Client name is required' }),
    service: z.string({ required_error: 'Service name is required' }),
    startDate: z.string({ required_error: 'Start date is required' }),
    deliveryDate: z.string({ required_error: 'Delivery date is required' }),
    price: z.string({ required_error: 'Price is required' }),
    assignedTeam: z.string({ required_error: 'Assigned team is required' }),
    notes: z.string().optional(),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  });

  static updateOrdersSchema = z.object({
    client: z.string().optional(),
    service: z.string().optional(),
    startDate: z.string().optional(),
    deliveryDate: z.string().optional(),
    price: z.string().optional(),
    assignedTeam: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  });

  static getOrdersQuerySchema = z.object({
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], {
      errorMap: () => ({ message: 'Status must be one of: PENDING, IN_PROGRESS, COMPLETED, CANCELLED' })
    }).optional(),
    searchTerm: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  });

  static validate(schema) {
    return async (req, res, next) => {
      try {
        req.body = await schema.parseAsync(req.body);
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  static validateQuery(schema) {
    return async (req, res, next) => {
      try {
        await schema.parseAsync(req.query);
        next();
      } catch (error) {
        next(error);
      }
    };
  }
}