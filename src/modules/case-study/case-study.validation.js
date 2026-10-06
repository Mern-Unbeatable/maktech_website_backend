import { z } from 'zod';
import { ApiError } from '../../utils/ApiError.js';

export class CaseStudyValidation {
  static createCaseStudySchema = z.object({
    body: z.object({
      title: z.string().min(1, 'Title is required'),
      category: z.string().min(1, 'Category is required').optional(),
      description: z.string().min(1, 'Description is required').optional(),
      client: z.string().min(1, 'Client is required').optional(),
      timeline: z.string().optional(),
      services: z.string().optional(),
      tags: z.string().optional(),
      result: z.string().optional(),
      image: z.string().url('Invalid image URL').optional().or(z.literal('')),
      coverImage: z.string().url('Invalid image URL').optional().or(z.literal('')),
      slug: z.string().optional(),
      content: z.any().optional(),
      isPublished: z.boolean().optional(),
    }),
  });

  static updateCaseStudySchema = z.object({
    body: z.object({
      title: z.string().optional(),
      category: z.string().optional(),
      description: z.string().optional(),
      client: z.string().optional(),
      timeline: z.string().optional(),
      services: z.string().optional(),
      tags: z.string().optional(),
      result: z.string().optional(),
      image: z.string().url('Invalid image URL').optional().or(z.literal('')),
      coverImage: z.string().url('Invalid image URL').optional().or(z.literal('')),
      slug: z.string().optional(),
      content: z.any().optional(),
      isPublished: z.boolean().optional(),
    }),
  });

  static validate(schema) {
    return async (req, res, next) => {
      try {
        await schema.parseAsync({
          body: req.body,
          query: req.query,
          params: req.params,
        });
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          next(new ApiError(error.errors[0].message, 400));
        } else {
          next(error);
        }
      }
    };
  }
}
