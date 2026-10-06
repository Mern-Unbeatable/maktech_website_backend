import express from 'express';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
import { auth } from '../../middlewares/auth.js';

const router = express.Router();

const dashboardService = new DashboardService();
const dashboardController = new DashboardController(dashboardService);

// We should protect analytics endpoints, auth('ADMIN')
router.get('/summary', auth('ADMIN'), dashboardController.getDashboardSummary);

export const dashboardModule = { router };
