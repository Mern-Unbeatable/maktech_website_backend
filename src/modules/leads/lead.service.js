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

  async getLeadStats() {
    const totalLeads = await this.prisma.lead.count();
    
    // Dates for this week and last week
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const newLeadsThisWeek = await this.prisma.lead.count({
      where: {
        createdAt: {
          gte: oneWeekAgo
        }
      }
    });

    const newLeadsLastWeek = await this.prisma.lead.count({
      where: {
        createdAt: {
          gte: twoWeeksAgo,
          lt: oneWeekAgo
        }
      }
    });

    // Breakdown by status
    const statusGroup = await this.prisma.lead.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    // Format status counts nicely
    const statusCounts = {
      NEW: 0,
      CONTACTED: 0,
      IN_PROGRESS: 0,
      CONVERTED: 0,
      LOST: 0
    };

    statusGroup.forEach(group => {
      statusCounts[group.status] = group._count.status;
    });

    return {
      totalLeads,
      newLeadsThisWeek,
      newLeadsLastWeek,
      statusCounts
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


