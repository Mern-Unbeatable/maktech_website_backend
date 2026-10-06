import { Router } from 'express';
import { LeadsController } from './leads.controller.js';
import { LeadsService } from './leads.service.js';
import { LeadsValidation } from './leads.validation.js';
import { auth } from '../../middlewares/auth.js';
import { optionalAuth } from '../../middlewares/optionalAuth.js';

export class LeadsModule {
  constructor() {
    this.router = Router();
    
    this.leadsService = new LeadsService();
    this.leadsController = new LeadsController(this.leadsService);
    
    this.initializeRoutes();
  }

  initializeRoutes() {
    // Public route
    this.router.post(
      '/',
      optionalAuth,
      LeadsValidation.validate(LeadsValidation.createLeadsSchema),
      this.leadsController.createLead
    );

    // Protected routes
    this.router.get(
      '/',
      auth('ADMIN'),
      LeadsValidation.validateQuery(LeadsValidation.getLeadsQuerySchema),
      this.leadsController.getAllLeads
    );

    // Stats route MUST be before /:id route
    this.router.get(
      '/stats',
      auth('ADMIN'),
      this.leadsController.getLeadsStats
    );

    this.router.get(
      '/:id',
      auth('ADMIN'),
      this.leadsController.getLeadsById
    );

    this.router.put(
      '/:id',
      auth('ADMIN'),
      LeadsValidation.validate(LeadsValidation.updateLeadsSchema),
      this.leadsController.updateLead
    );

    this.router.patch(
      '/:id',
      auth('ADMIN'),
      LeadsValidation.validate(LeadsValidation.updateLeadsSchema),
      this.leadsController.updateLead
    );

    this.router.delete(
      '/:id',
      auth('ADMIN'),
      this.leadsController.deleteLead
    );
  }
}



