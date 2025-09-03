import express from 'express';
import { authenticateJWT, requireAdmin } from '../middleware/auth.js';
import * as orderController from '../controllers/order.js';

const router = express.Router();

router.use(authenticateJWT);

router.post('/place', orderController.placeOrder);
router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrderById);

// Refund/Return requests
router.post('/refund-request', orderController.createRefundRequest);
router.post('/refund-process', requireAdmin, orderController.processRefundRequest);
router.get('/:id/refund', orderController.getRefundRequestByOrder);

export default router; 