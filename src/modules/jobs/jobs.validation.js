import { z } from "zod";
import { ApiError } from "../../utils/ApiError.js";

export class JobsValidation {
  static createJobSchema = z.object({
    body: z.object({
      title: z.string().min(1, "Title is required"),
      description: z.string().optional().default(""),
      department: z.string().optional().default("General"),
      vacancy: z.union([z.number(), z.string()]).transform(val => Number(val) || 1).optional().default(1),
      salary: z.string().nullable().optional(),
      coverImage: z.string().nullable().optional(),
      isActive: z.boolean().optional().default(true),
      
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
      vacancy: z.union([z.number(), z.string()]).transform(val => Number(val) || 1).optional(),
      salary: z.string().nullable().optional(),
      coverImage: z.string().nullable().optional(),
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

  static applyJobSchema = z.object({
    body: z.object({
      applicantName: z.string().min(1, "Applicant name is required"),
      applicantEmail: z.string().email("Valid email address is required"),
      applicantPhone: z.string().optional(),
      resumeUrl: z.string().optional(),
      answers: z.any().optional()
    })
  });

  static updateApplicantStatusSchema = z.object({
    body: z.object({
      status: z.enum(["PENDING", "REVIEWING", "SHORTLISTED", "INTERVIEW", "HIRED", "REJECTED"], {
        errorMap: () => ({ message: "Status must be PENDING, REVIEWING, SHORTLISTED, INTERVIEW, HIRED, or REJECTED" })
      })
    })
  });

  static updateApplicantNotesSchema = z.object({
    body: z.object({
      recruiterNotes: z.string().optional()
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
          console.error("Zod Validation Error:", JSON.stringify(error, null, 2));
          const errs = error.errors || error.issues || [];
          const msg = errs.length > 0 ? `${errs[0].path.join(".")}: ${errs[0].message}` : "Validation failed";
          next(new ApiError(400, msg));
        } else {
          next(error);
        }
      }
    };
  }
}
