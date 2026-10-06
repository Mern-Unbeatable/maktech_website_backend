import express from 'express';
import config from './config/env.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { LeadsModule } from './modules/leads/leads.module.js';
import { ordersModule } from './modules/orders/orders.module.js';
import { CaseStudyModule } from './modules/case-studies/case-studies.module.js';
import { UploadModule } from './modules/uploads/uploads.module.js';
import { blogModule } from './modules/blogs/blogs.module.js';
import { jobsModule } from './modules/jobs/jobs.module.js';
import { pricingModule } from './modules/pricing/pricing.module.js';
import { dashboardModule } from './modules/dashboard/dashboard.module.js';
import { emailsModule } from './modules/emails/emails.module.js';
import { globalErrorHandler } from './middlewares/globalErrorHandler.js';

class App {
  constructor() {
    this.app = express();
    
    this.initializeMiddlewares();
    this.initializeModules();
    this.initializeErrorHandling();
  }

  initializeMiddlewares() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Serve uploaded files statically
    this.app.use('/uploads', express.static('uploads'));
  }

  initializeModules() {
    this.app.get('/', (req, res) => {
      res.status(200).json({ 
        status: 'OK', 
        message: 'Welcome to the API',
        version: '1.0.0',
        Email: "shanjidahmed66@gmail.com",
        timestamp: new Date().toISOString()
      });
    });

    this.app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'OK', 
        message: 'Server is running',
        timestamp: new Date().toISOString()
      });
    });

    // Feature Modules
    const authModule = new AuthModule();
    const leadsModule = new LeadsModule();
    const caseStudyModule = new CaseStudyModule();
    const uploadModule = new UploadModule();
    
    this.app.use('/api/v1/auth', authModule.router);
    this.app.use('/api/v1/leads', leadsModule.router);
    this.app.use('/api/v1/orders', ordersModule.router);
    this.app.use('/api/v1/case-studies', caseStudyModule.router);
    this.app.use('/api/v1/uploads', uploadModule.router);
    this.app.use('/api/v1/blogs', blogModule.router);
    this.app.use('/api/v1/jobs', jobsModule.router);
    this.app.use('/api/v1/pricing', pricingModule.router);
    this.app.use('/api/v1/dashboard', dashboardModule.router);
    this.app.use('/api/v1/emails', emailsModule.router);
  }

  initializeErrorHandling() {
    // 404 handler
    this.app.use((req, res, next) => {
      res.status(404).json({ 
        success: false,
        message: 'The requested resource does not exist',
        errorMessages: [{ path: req.originalUrl, message: 'API Not Found' }]
      });
    });

    // Global Error Handler
    this.app.use(globalErrorHandler);
  }
}

export default new App().app;
