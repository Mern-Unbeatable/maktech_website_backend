import { z } from 'zod';

export class AuthValidation {
  static loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters')
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
}
