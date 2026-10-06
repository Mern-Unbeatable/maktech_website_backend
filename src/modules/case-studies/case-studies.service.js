import { prisma } from '../../config/db.js';

export class CaseStudyService {
  async createCaseStudy(data) {
    if (!data.slug) {
      data.slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      // Ensure slug uniqueness
      const existing = await prisma.caseStudy.findUnique({ where: { slug: data.slug } });
      if (existing) {
        data.slug = `${data.slug}-${Date.now()}`;
      }
    }

    return await prisma.caseStudy.create({
      data
    });
  }

  async getAllCaseStudies(paginationOptions, filters) {
    const { page, limit, skip, sortBy, sortOrder } = paginationOptions;
    
    const whereCondition = {};
    if (filters.searchTerm) {
      whereCondition.OR = [
        { title: { contains: filters.searchTerm, mode: 'insensitive' } },
        { client: { contains: filters.searchTerm, mode: 'insensitive' } },
        { description: { contains: filters.searchTerm, mode: 'insensitive' } },
      ];
    }
    
    if (filters.category) {
      whereCondition.category = filters.category;
    }

    const caseStudies = await prisma.caseStudy.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder }
    });
    
    const total = await prisma.caseStudy.count({ where: whereCondition });

    return {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrevious: page > 1
      },
      data: caseStudies
    };
  }

  async getCaseStudyById(id) {
    return await prisma.caseStudy.findUnique({
      where: { id }
    });
  }

  async updateCaseStudy(id, data) {
    if (data.title && !data.slug) {
      data.slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }
    
    return await prisma.caseStudy.update({
      where: { id },
      data
    });
  }

  async deleteCaseStudy(id) {
    return await prisma.caseStudy.delete({
      where: { id }
    });
  }
}
