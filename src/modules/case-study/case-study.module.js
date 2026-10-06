import { Router } from 'express';
import { CaseStudyController } from './case-study.controller.js';
import { CaseStudyService } from './case-study.service.js';
import { CaseStudyValidation } from './case-study.validation.js';
import { auth } from '../../middlewares/auth.js';

export class CaseStudyModule {
  constructor() {
    this.router = Router();
    
    this.caseStudyService = new CaseStudyService();
    this.caseStudyController = new CaseStudyController(this.caseStudyService);
    
    this.initializeRoutes();
  }

  initializeRoutes() {
    // Public routes (anyone can view case studies)
    this.router.get(
      '/',
      this.caseStudyController.getAllCaseStudies
    );

    this.router.get(
      '/:id',
      this.caseStudyController.getCaseStudyById
    );

    // Protected routes (Admin only)
    this.router.post(
      '/',
      auth('ADMIN'),
      CaseStudyValidation.validate(CaseStudyValidation.createCaseStudySchema),
      this.caseStudyController.createCaseStudy
    );

    this.router.put(
      '/:id',
      auth('ADMIN'),
      CaseStudyValidation.validate(CaseStudyValidation.updateCaseStudySchema),
      this.caseStudyController.updateCaseStudy
    );
    
    this.router.patch(
      '/:id',
      auth('ADMIN'),
      CaseStudyValidation.validate(CaseStudyValidation.updateCaseStudySchema),
      this.caseStudyController.updateCaseStudy
    );

    this.router.delete(
      '/:id',
      auth('ADMIN'),
      this.caseStudyController.deleteCaseStudy
    );
  }
}
