import { z } from 'zod';
import { ApiError } from '../../utils/ApiError.js';

export class BlogValidation {
  static createBlogSchema = z.object({
    body: z.object({
      title: z.string().min(1, 'Title is required'),
      category: z.string().optional(),
      date: z.string().optional(),
      postedBy: z.string().optional(),
      keyTakeaways: z.string().optional(),
      blogContent: z.string().optional(),
      coverImage: z.string().url('Invalid image URL').optional().or(z.literal('')),
      slug: z.string().optional(),
      content: z.any().optional(),
      isPublished: z.boolean().optional(),
    }),
  });

  static updateBlogSchema = z.object({
    body: z.object({
      title: z.string().optional(),
      category: z.string().optional(),
      date: z.string().optional(),
      postedBy: z.string().optional(),
      keyTakeaways: z.string().optional(),
      blogContent: z.string().optional(),
      coverImage: z.string().url('Invalid image URL').optional().or(z.literal('')),
      slug: z.string().optional(),
      content: z.any().optional(),
      isPublished: z.boolean().optional(),
    }),
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
          next(new ApiError(error.errors[0].message, 400));
        } else {
          next(error);
        }
      }
    };
  }
}
