import { prisma } from "../../config/db.js";
import { ApiError } from "../../utils/ApiError.js";
import { calculatePagination } from "../../utils/paginationHelper.js";

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
    const { page, limit, skip, sortBy = "createdAt", sortOrder = "desc" } = calculatePagination(options);
    const { searchTerm, department, isActive } = options;

    const where = {};

    if (searchTerm) {
      where.OR = [
        { title: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
        { department: { contains: searchTerm, mode: "insensitive" } }
      ];
    }

    if (department) {
      where.department = department;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === "true";
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
            order: "asc"
          }
        },
        _count: {
          select: {
            applications: true
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
            order: "asc"
          }
        },
        _count: {
          select: {
            applications: true
          }
        }
      }
    });

    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    return job;
  }

  async updateJob(id, data) {
    const job = await prisma.job.findUnique({
      where: { id }
    });

    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    const { questions, ...jobData } = data;

    const updatedJob = await prisma.job.update({
      where: { id },
      data: jobData
    });

    if (questions !== undefined) {
      const existingQuestions = await prisma.jobQuestion.findMany({
        where: { jobId: id },
        select: { id: true }
      });
      const existingQuestionIds = existingQuestions.map(q => q.id);

      const payloadQuestionIds = questions.map(q => q.id).filter(Boolean);

      const idsToDelete = existingQuestionIds.filter(qId => !payloadQuestionIds.includes(qId));
      if (idsToDelete.length > 0) {
        await prisma.jobQuestion.deleteMany({
          where: { id: { in: idsToDelete } }
        });
      }

      for (const q of questions) {
        if (q.id) {
          const { options, id: _id, ...qData } = q;
          
          await prisma.jobQuestion.update({
            where: { id: q.id },
            data: {
              ...qData,
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
      throw new ApiError(404, "Job not found");
    }

    await prisma.job.delete({
      where: { id }
    });

    return null;
  }

  // ─── APPLICANTS & APPLICATION LOGIC ───────────────────────────────────────

  async applyForJob(jobId, data) {
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    if (job.isActive === false) {
      throw new ApiError(400, "This position is currently inactive and no longer accepting applications");
    }

    const {
      applicantName,
      applicantEmail,
      applicantPhone,
      resumeUrl,
      answers = []
    } = data;

    if (!applicantName || !applicantEmail) {
      throw new ApiError(400, "Applicant name and email are required");
    }

    const result = await prisma.$transaction(async (tx) => {
      const application = await tx.jobApplication.create({
        data: {
          jobId,
          applicantName: applicantName.trim(),
          applicantEmail: applicantEmail.trim(),
          applicantPhone: applicantPhone ? applicantPhone.trim() : null,
          resumeUrl: resumeUrl || null,
          status: "PENDING"
        }
      });

      if (Array.isArray(answers) && answers.length > 0) {
        const validAnswers = answers
          .filter(a => a && a.questionId)
          .map(a => ({
            applicationId: application.id,
            questionId: a.questionId,
            answerData: a.answerData !== undefined ? a.answerData : (a.value !== undefined ? a.value : null)
          }));

        if (validAnswers.length > 0) {
          await tx.jobApplicationAnswer.createMany({
            data: validAnswers,
            skipDuplicates: true
          });
        }
      }

      return tx.jobApplication.findUnique({
        where: { id: application.id },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              department: true
            }
          },
          answers: {
            include: {
              question: {
                include: {
                  options: true
                }
              }
            }
          }
        }
      });
    });

    return result;
  }

  async getJobApplicants(jobId, options = {}) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, title: true, department: true }
    });

    if (!job) {
      throw new ApiError(404, "Job not found");
    }

    const { page, limit, skip, sortBy = "createdAt", sortOrder = "desc" } = calculatePagination(options);
    const { searchTerm, status } = options;

    const where = { jobId };

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.trim();
      where.OR = [
        { applicantName: { contains: term, mode: "insensitive" } },
        { applicantEmail: { contains: term, mode: "insensitive" } },
        { applicantPhone: { contains: term, mode: "insensitive" } }
      ];
    }

    const [applicants, total, allForJob] = await Promise.all([
      prisma.jobApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          answers: {
            include: {
              question: {
                include: {
                  options: true
                }
              }
            }
          }
        }
      }),
      prisma.jobApplication.count({ where }),
      prisma.jobApplication.findMany({
        where: { jobId },
        select: { status: true }
      })
    ]);

    const statusCounts = {
      ALL: allForJob.length,
      PENDING: 0,
      REVIEWING: 0,
      SHORTLISTED: 0,
      INTERVIEW: 0,
      HIRED: 0,
      REJECTED: 0
    };

    allForJob.forEach(a => {
      if (statusCounts[a.status] !== undefined) {
        statusCounts[a.status]++;
      }
    });

    return {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrevious: page > 1
      },
      statusCounts,
      job,
      data: applicants
    };
  }

  async getApplicantById(applicantId) {
    const applicant = await prisma.jobApplication.findUnique({
      where: { id: applicantId },
      include: {
        job: true,
        answers: {
          include: {
            question: {
              include: {
                options: true
              }
            }
          }
        }
      }
    });

    if (!applicant) {
      throw new ApiError(404, "Applicant not found");
    }

    return applicant;
  }

  async updateApplicantStatus(applicantId, status) {
    const validStatuses = ["PENDING", "REVIEWING", "SHORTLISTED", "INTERVIEW", "HIRED", "REJECTED"];
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, "Invalid status. Must be one of: " + validStatuses.join(", "));
    }

    const applicant = await prisma.jobApplication.findUnique({
      where: { id: applicantId }
    });

    if (!applicant) {
      throw new ApiError(404, "Applicant not found");
    }

    const updated = await prisma.jobApplication.update({
      where: { id: applicantId },
      data: { status }
    });

    return updated;
  }

  async updateApplicantNotes(applicantId, recruiterNotes) {
    const applicant = await prisma.jobApplication.findUnique({
      where: { id: applicantId }
    });

    if (!applicant) {
      throw new ApiError(404, "Applicant not found");
    }

    const updated = await prisma.jobApplication.update({
      where: { id: applicantId },
      data: { recruiterNotes }
    });

    return updated;
  }

  async deleteApplicant(applicantId) {
    const applicant = await prisma.jobApplication.findUnique({
      where: { id: applicantId }
    });

    if (!applicant) {
      throw new ApiError(404, "Applicant not found");
    }

    await prisma.jobApplication.delete({
      where: { id: applicantId }
    });

    return null;
  }
}
