import { z } from 'zod';
import { ApiError } from '../../utils/ApiError.js';

export class PricingValidation {
  static createPlanSchema = z.object({
    body: z.object({
      name: z.string().min(1, 'Package Name is required'),
      price: z.preprocess((val) => Number(val), z.number().min(0, 'Price must be positive')),
      service: z.string().min(1, 'Service is required'),
      billingCycle: z.enum(['MONTHLY', 'YEARLY', 'ONETIME']).default('MONTHLY'),
      description: z.string().min(1, 'Description is required'),
      isPopular: z.boolean().optional().default(false),
      
      // Features can come as a flat array of strings or array of objects
      features: z.array(
        z.union([
          z.string(),
          z.object({
            id: z.string().optional(),
            name: z.string(),
            isIncluded: z.boolean().optional(),
            order: z.number().int().optional(),
            icon: z.string().optional()
          })
        ])
      ).optional()
    })
  });

  static updatePlanSchema = z.object({
    body: z.object({
      name: z.string().optional(),
      price: z.preprocess((val) => val === undefined ? undefined : Number(val), z.number().min(0).optional()),
      service: z.string().optional(),
      billingCycle: z.enum(['MONTHLY', 'YEARLY', 'ONETIME']).optional(),
      description: z.string().optional(),
      isPopular: z.boolean().optional(),
      
      features: z.array(
        z.union([
          z.string(),
          z.object({
            id: z.string().optional(),
            name: z.string(),
            isIncluded: z.boolean().optional(),
            order: z.number().int().optional(),
            icon: z.string().optional()
          })
        ])
      ).optional()
    })
  });

  static validate(schema) {
    return async (req, res, next) => {
      try {
        const parsedData = await schema.parseAsync({
          body: req.body,
          query: req.query,
          params: req.params,
        });
        
        if (parsedData.body) req.body = parsedData.body;
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          next(new ApiError(400, error.errors[0].message));
        } else {
          next(error);
        }
      }
    };
  }
}
