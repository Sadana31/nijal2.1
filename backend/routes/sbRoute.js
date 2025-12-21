import express from 'express';
// Note: In ESM, you must include the .js extension when importing local files
import * as shippingBillController from '../controllers/sbController.js'; 

const router = express.Router();

// GET /api/shipping-bills
router.get('/', shippingBillController.getDashboard);

export default router;