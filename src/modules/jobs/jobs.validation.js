import { z } from 'zod';
import { ApiError } from '../../utils/ApiError.js';

export class JobsValidation {
  static createJobSchema = z.object({
    body: z.object({
      title: z.string().min(1, 'Title is required'),
      description: z.string().min(1, 'Description is required'),
      department: z.string().min(1, 'Department is required'),
      vacancy: z.number().int().optional().default(1),
      salary: z.string().optional(),
      coverImage: z.string().url('Invalid image URL').optional().or(z.literal('')),
      isActive: z.boolean().optional(),
      
      jobTypes: z.any().optional(),
      responsibilities: z.any().optional(),
      benefits: z.any().optional(),
      
      questions: z.array(z.object({
        title: z.string(),
        type: z.string(),
        isRequired: z.boolean().optional(),
        order: z.number().int().optional(),
        options: z.array(z.object({
          value: z.string(),
          order: z.number().int().optional()
        })).optional()
      })).optional()
    })
  });

  static updateJobSchema = z.object({
    body: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      department: z.string().optional(),
      vacancy: z.number().int().optional(),
      salary: z.string().optional(),
      coverImage: z.string().url('Invalid image URL').optional().or(z.literal('')),
      isActive: z.boolean().optional(),
      
      jobTypes: z.any().optional(),
      responsibilities: z.any().optional(),
      benefits: z.any().optional(),
      
      questions: z.array(z.object({
        id: z.string().optional(),
        title: z.string(),
        type: z.string(),
        isRequired: z.boolean().optional(),
        order: z.number().int().optional(),
        options: z.array(z.object({
          id: z.string().optional(),
          value: z.string(),
          order: z.number().int().optional()
        })).optional()
      })).optional()
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
