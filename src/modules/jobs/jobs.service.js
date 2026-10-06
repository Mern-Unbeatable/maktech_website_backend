import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { calculatePagination } from '../../utils/paginationHelper.js';

export class JobsService {
  async createJob(data) {
    const { questions, ...jobData } = data;

    const createPayload = {
      ...jobData,
    };

    if (questions && questions.length > 0) {
      createPayload.questions = {
        create: questions.map(q => ({
          title: q.title,
          type: q.type,
          isRequired: q.isRequired || false,
          order: q.order || 0,
          options: q.options && q.options.length > 0 ? {
            create: q.options.map(opt => ({
              value: opt.value,
              order: opt.order || 0
            }))
          } : undefined
        }))
      };
    }

    const job = await prisma.job.create({
      data: createPayload,
      include: {
        questions: {
          include: {
            options: true
          }
        }
      }
    });

    return job;
  }

  async getAllJobs(options) {
    const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);
    const { searchTerm, department, isActive } = options;

    const where = {};

    if (searchTerm) {
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { department: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    if (department) {
      where.department = department;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const jobs = await prisma.job.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        questions: {
          include: {
            options: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    const total = await prisma.job.count({ where });

    return {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrevious: page > 1
      },
      data: jobs
    };
  }

  async getJobById(id) {
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            options: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    if (!job) {
      throw new ApiError('Job not found', 404);
    }

    return job;
  }

  async updateJob(id, data) {
    const job = await prisma.job.findUnique({
      where: { id }
    });

    if (!job) {
      throw new ApiError('Job not found', 404);
    }

    const { questions, ...jobData } = data;

    // First update the base job fields
    const updatedJob = await prisma.job.update({
      where: { id },
      data: jobData
    });

    // Handle questions complex nested updates manually if provided
    if (questions !== undefined) {
      // 1. Find existing questions to figure out what to delete
      const existingQuestions = await prisma.jobQuestion.findMany({
        where: { jobId: id },
        select: { id: true }
      });
      const existingQuestionIds = existingQuestions.map(q => q.id);

      // Extract IDs that came from the payload (these are kept/updated)
      const payloadQuestionIds = questions.map(q => q.id).filter(Boolean);

      // Find which IDs to delete
      const idsToDelete = existingQuestionIds.filter(qId => !payloadQuestionIds.includes(qId));
      if (idsToDelete.length > 0) {
        await prisma.jobQuestion.deleteMany({
          where: { id: { in: idsToDelete } }
        });
      }

      // 2. Upsert each question
      for (const q of questions) {
        if (q.id) {
          // Update existing question
          const { options, id: _id, ...qData } = q;
          
          await prisma.jobQuestion.update({
            where: { id: q.id },
            data: {
              ...qData,
              // We could do the same diffing for options here, but for simplicity:
              // Delete all options and recreate them for this question to avoid deep diffing
              options: options !== undefined ? {
                deleteMany: {},
                create: options.map(opt => ({
                  value: opt.value,
                  order: opt.order || 0
                }))
              } : undefined
            }
          });
        } else {
          // Create new question
          await prisma.jobQuestion.create({
            data: {
              title: q.title,
              type: q.type,
              isRequired: q.isRequired || false,
              order: q.order || 0,
              jobId: id,
              options: q.options && q.options.length > 0 ? {
                create: q.options.map(opt => ({
                  value: opt.value,
                  order: opt.order || 0
                }))
              } : undefined
            }
          });
        }
      }
    }

    return this.getJobById(id);
  }

  async deleteJob(id) {
    const job = await prisma.job.findUnique({
      where: { id }
    });

    if (!job) {
      throw new ApiError('Job not found', 404);
    }

    await prisma.job.delete({
      where: { id }
    });

    return null;
  }
}
