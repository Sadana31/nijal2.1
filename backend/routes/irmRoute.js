import express from 'express';
// 1. Import all functions from the controller at once
import { 
  getAllRemittances, 
  createRemittance, 
  uploadRemittances 
} from '../controllers/irmController.js';

const router = express.Router();

// --- ROUTES ---

// GET all remittances
router.get('/', getAllRemittances);

// POST a single remittance (if used manually)
router.post('/', createRemittance);

// POST bulk upload (The one we just built for Citi/ICICI)
router.post('/upload', uploadRemittances);

export default router;