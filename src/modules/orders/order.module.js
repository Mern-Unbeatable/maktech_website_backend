import express from 'express';
import { OrderController } from './order.controller.js';
import OrderService from './order.service.js';
import { OrderValidation } from './order.validation.js';

const router = express.Router();

const orderService = new OrderService();
const orderController = new OrderController(orderService);

router.post(
  '/',
  OrderValidation.validate(OrderValidation.createOrderSchema),
  orderController.createOrder
);

router.get(
  '/', 
  OrderValidation.validateQuery(OrderValidation.getOrdersQuerySchema),
  orderController.getAllOrders
);

router.get('/:id', orderController.getOrderById);

router.patch(
  '/:id',
  OrderValidation.validate(OrderValidation.updateOrderSchema),
  orderController.updateOrder
);

router.delete('/:id', orderController.deleteOrder);

export const orderModule = { router };