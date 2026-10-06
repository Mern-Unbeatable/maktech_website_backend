import express from 'express';
import { OrdersController } from './orders.controller.js';
import OrdersService from './orders.service.js';
import { OrdersValidation } from './orders.validation.js';

const router = express.Router();

const ordersService = new OrdersService();
const ordersController = new OrdersController(ordersService);

router.post(
  '/',
  OrdersValidation.validate(OrdersValidation.createOrdersSchema),
  ordersController.createOrder
);

router.get(
  '/', 
  OrdersValidation.validateQuery(OrdersValidation.getOrdersQuerySchema),
  ordersController.getAllOrders
);

router.get('/stats', ordersController.getOrdersStats);
router.get('/:id', ordersController.getOrdersById);

router.patch(
  '/:id',
  OrdersValidation.validate(OrdersValidation.updateOrdersSchema),
  ordersController.updateOrder
);

router.delete('/:id', ordersController.deleteOrder);

export const ordersModule = { router };