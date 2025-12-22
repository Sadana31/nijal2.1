import express from 'express';
// 1. Import the specific function from the controller
import { getInvoicesByBuyer } from '../controllers/invoiceController.js';

const router = express.Router();

router.get('/', getInvoicesByBuyer);

export default router;