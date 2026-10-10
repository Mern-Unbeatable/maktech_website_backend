import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { calculatePagination } from '../../utils/paginationHelper.js';

export class PricingService {
  async createPlan(data) {
    const { features, ...planData } = data;

    const createPayload = { ...planData };

    if (features && features.length > 0) {
      createPayload.features = {
        create: features.map((f, index) => {
          if (typeof f === 'string') {
            return { name: f.trim(), order: index };
          }
          return {
            name: f.name.trim(),
            isIncluded: f.isIncluded !== false,
            order: f.order !== undefined ? f.order : index,
            icon: f.icon
          };
        })
      };
    }

    const plan = await prisma.pricingPlan.create({
      data: createPayload,
      include: {
        features: {
          orderBy: { order: 'asc' }
        }
      }
    });

    return plan;
  }

  async getAllPlans(options) {
    const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);
    const { searchTerm, service, billingCycle } = options;

    const where = {};

    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    if (service) {
      where.service = service;
    }

    if (billingCycle) {
      where.billingCycle = billingCycle;
    }

    const plans = await prisma.pricingPlan.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        features: {
          orderBy: { order: 'asc' }
        }
      }
    });

    const total = await prisma.pricingPlan.count({ where });

    return {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrevious: page > 1
      },
      data: plans
    };
  }

  async getPlanById(id) {
    const plan = await prisma.pricingPlan.findUnique({
      where: { id },
      include: {
        features: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!plan) {
      throw new ApiError(404, 'Pricing plan not found');
    }

    return plan;
  }

  async updatePlan(id, data) {
    const plan = await prisma.pricingPlan.findUnique({
      where: { id }
    });

    if (!plan) {
      throw new ApiError(404, 'Pricing plan not found');
    }

    const { features, ...planData } = data;

    // We can do a simpler update for features: delete all existing and recreate them
    // since they are just simple strings on a UI textarea.
    const updatePayload = {
      ...planData
    };

    if (features !== undefined) {
      updatePayload.features = {
        deleteMany: {},
        create: features.map((f, index) => {
          if (typeof f === 'string') {
            return { name: f.trim(), order: index };
          }
          return {
            name: f.name.trim(),
            isIncluded: f.isIncluded !== false,
            order: f.order !== undefined ? f.order : index,
            icon: f.icon
          };
        })
      };
    }

    const updatedPlan = await prisma.pricingPlan.update({
      where: { id },
      data: updatePayload,
      include: {
        features: {
          orderBy: { order: 'asc' }
        }
      }
    });

    return updatedPlan;
  }

  async deletePlan(id) {
    const plan = await prisma.pricingPlan.findUnique({
      where: { id }
    });

    if (!plan) {
      throw new ApiError(404, 'Pricing plan not found');
    }

    await prisma.pricingPlan.delete({
      where: { id }
    });

    return null;
  }
}
