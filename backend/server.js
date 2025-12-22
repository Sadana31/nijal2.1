import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import remittanceRoutes from './routes/irmRoute.js';
import shippingBillsRouter from "./routes/sbRoute.js";
import invoiceRoutes from './routes/invoiceRoutes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🔥 Server running on port ${PORT}`));

app.use('/api/shippingBills', shippingBillsRouter);
app.use('/api/remittances', remittanceRoutes);
app.use('/api/invoices', invoiceRoutes);