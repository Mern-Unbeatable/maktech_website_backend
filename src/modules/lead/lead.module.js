import { Router } from 'express';
import { LeadController } from './lead.controller.js';
import { LeadService } from './lead.service.js';
import { LeadValidation } from './lead.validation.js';
import { auth } from '../../middlewares/auth.js';
import { optionalAuth } from '../../middlewares/optionalAuth.js';

export class LeadModule {
  constructor() {
    this.router = Router();
    
    this.leadService = new LeadService();
    this.leadController = new LeadController(this.leadService);
    
    this.initializeRoutes();
  }

  initializeRoutes() {
    // Public route
    this.router.post(
      '/',
      optionalAuth,
      LeadValidation.validate(LeadValidation.createLeadSchema),
      this.leadController.createLead
    );

    // Protected routes
    this.router.get(
      '/',
      auth('ADMIN'),
      LeadValidation.validateQuery(LeadValidation.getLeadsQuerySchema),
      this.leadController.getAllLeads
    );

    this.router.get(
      '/:id',
      auth('ADMIN'),
      this.leadController.getLeadById
    );

    this.router.put(
      '/:id',
      auth('ADMIN'),
      LeadValidation.validate(LeadValidation.updateLeadSchema),
      this.leadController.updateLead
    );

    this.router.patch(
      '/:id',
      auth('ADMIN'),
      LeadValidation.validate(LeadValidation.updateLeadSchema),
      this.leadController.updateLead
    );

    this.router.delete(
      '/:id',
      auth('ADMIN'),
      this.leadController.deleteLead
    );
  }
}


