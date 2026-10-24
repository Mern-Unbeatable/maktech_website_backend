import { z } from 'zod';

const isValidTimezone = (tz) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

// Visitor picks any date/time in their own timezone; the frontend sends it as a UTC ISO string
const meetingDateSchema = z
  .string()
  .refine((val) => !Number.isNaN(Date.parse(val)), {
    message: 'Meeting date must be a valid date and time',
  })
  .refine((val) => Date.parse(val) > Date.now(), {
    message: 'Meeting time must be in the future',
  })
  .transform((val) => new Date(val).toISOString());

const timezoneSchema = z.string().refine(isValidTimezone, {
  message: 'Invalid timezone',
});

export class LeadsValidation {
  static createLeadsSchema = z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    companyName: z.string().optional(),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    location: z.string().optional(),
    service: z.string().optional(),
    budget: z.number().optional().or(z.string().transform(val => val ? Number(val) : undefined)),
    industry: z.string().optional(),
    message: z.string().optional(),
    // Old slot-picker flow (commented out)
    // meetingDate: z.string().optional(),
    // timezone: z.string().optional(),
    meetingDate: meetingDateSchema.optional(),
    timezone: timezoneSchema.optional(),
    meetingLink: z.string().optional(),
    
  });

  static updateLeadsSchema = z.object({
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
    meetingDate: z.string().optional(),
    timezone: z.string().optional(),
    meetingLink: z.string().optional(),
    
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



