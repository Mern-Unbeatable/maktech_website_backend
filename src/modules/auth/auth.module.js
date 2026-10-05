import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthValidation } from './auth.validation.js';

export class AuthModule {
  constructor() {
    this.router = Router();
    
    // Dependency Injection
    this.authService = new AuthService();
    this.authController = new AuthController(this.authService);
    
    this.initializeRoutes();
  }

  initializeRoutes() {
    // Login route
    this.router.post(
      '/login', 
      AuthValidation.validate(AuthValidation.loginSchema), 
      this.authController.login
    );
  }
}
