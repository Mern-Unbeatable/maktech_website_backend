import express from 'express';
import { PricingController } from './pricing.controller.js';
import { PricingService } from './pricing.service.js';
import { PricingValidation } from './pricing.validation.js';
import { auth } from '../../middlewares/auth.js';

const router = express.Router();

const pricingService = new PricingService();
const pricingController = new PricingController(pricingService);

// Public routes
router.get('/', pricingController.getAllPlans);
router.get('/:id', pricingController.getPlanById);

// Protected routes
router.post(
  '/',
  auth('ADMIN'),
  PricingValidation.validate(PricingValidation.createPlanSchema),
  pricingController.createPlan
);

router.patch(
  '/:id',
  auth('ADMIN'),
  PricingValidation.validate(PricingValidation.updatePlanSchema),
  pricingController.updatePlan
);

router.delete(
  '/:id',
  auth('ADMIN'),
  pricingController.deletePlan
);

export const pricingModule = { router };
