import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { httpStatus } from '../../utils/httpStatus.js';

export class LeadService {
  constructor() {
    this.prisma = prisma;
  }

  async createLead(data) {
    return await this.prisma.lead.create({
      data,
    });
  }

  async getAllLeads(paginationOptions, filters) {
    const { page, limit, skip, sortBy, sortOrder } = paginationOptions;
    
    // Search by name, email or company if searchTerm is provided
    const whereCondition = {};
    if (filters.searchTerm) {
      whereCondition.OR = [
        { fullName: { contains: filters.searchTerm, mode: 'insensitive' } },
        { email: { contains: filters.searchTerm, mode: 'insensitive' } },
        { companyName: { contains: filters.searchTerm, mode: 'insensitive' } },
      ];
    }

    if (filters.status) {
      whereCondition.status = filters.status;
    }

    const leads = await this.prisma.lead.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    const total = await this.prisma.lead.count({ where: whereCondition });

    return {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrevious: page > 1
      },
      data: leads
    };
  }

  async getLeadById(id) {
    const lead = await this.prisma.lead.findUnique({
      where: { id }
    });
    
    if (!lead) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Lead not found!');
    }
    return lead;
  }

  async updateLead(id, data) {
    // Check if exists
    await this.getLeadById(id);
    
    return await this.prisma.lead.update({
      where: { id },
      data
    });
  }

  async deleteLead(id) {
    // Check if exists
    await this.getLeadById(id);
    
    return await this.prisma.lead.delete({
      where: { id }
    });
  }
}

