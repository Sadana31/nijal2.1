// 1. Check your import path! 
// If your file is in 'backend/db.js', use '../db.js'
// If it is in 'backend/config/db.js', use '../config/db.js'
import pool from '../db.js'; 

export const getInvoicesByBuyer = async (req, res) => {
  try {
    const { buyerCode } = req.query; 

    if (!buyerCode) {
      return res.status(400).json({ message: "Buyer Name is required" });
    }

    // 🔍 FILTER BY CONSIGNEE NAME
    const query = `
      SELECT 
        i.invoiceid AS id, 
        i.invoiceno AS "invoiceNo", 
        s.shippingbillno AS "shippingBillNo", 
        TO_CHAR(i.invoicedate, 'YYYY-MM-DD') AS "invoiceDate",
        i.fobcurrencycode AS currency, 
        i.exportbillvalue AS amount, 
        i.exportbillvalue AS outstanding
      
      FROM invoices i
      JOIN shippingbills s ON i.sbid = s.sbid  -- 👈 Fixed: Using your specific table name
      WHERE 
        s.consigneename ILIKE $1 
      ORDER BY i.invoicedate ASC
    `;

    const result = await pool.query(query, [`%${buyerCode}%`]);

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ message: "Server error fetching invoices" });
  }
};