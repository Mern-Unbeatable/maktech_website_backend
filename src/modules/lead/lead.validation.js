import { z } from 'zod';

export class LeadValidation {
  static createLeadSchema = z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    companyName: z.string().optional(),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    location: z.string().optional(),
    service: z.string().optional(),
    budget: z.number().optional().or(z.string().transform(val => val ? Number(val) : undefined)),
    industry: z.string().optional(),
    message: z.string().optional(),
    
  });

  static updateLeadSchema = z.object({
    status: z.enum(['NEW', 'CONTACTED', 'IN_PROGRESS', 'CONVERTED', 'LOST']).optional(),
    fullName: z.string().min(2).optional(),
    companyName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    service: z.string().optional(),
    budget: z.number().optional().or(z.string().transform(val => val ? Number(val) : undefined)),
    industry: z.string().optional(),
    message: z.string().optional(),
    
  });

  static getLeadsQuerySchema = z.object({
    status: z.enum(['NEW', 'CONTACTED', 'IN_PROGRESS', 'CONVERTED', 'LOST'], {
      errorMap: () => ({ message: 'Status must be one of: NEW, CONTACTED, IN_PROGRESS, CONVERTED, LOST' })
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



