import express from 'express';
import config from './config/env.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { LeadModule } from './modules/leads/lead.module.js';
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
    const leadModule = new LeadModule();
    
    this.app.use('/api/v1/auth', authModule.router);
    this.app.use('/api/v1/leads', leadModule.router);
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
