// routes/shippingBills.js
import express from "express";
import pool from "../db.js"; // your Postgres pool

const invoicesRouter = express.Router();

// GET all shipping bills (with invoices summarized)
invoicesRouter.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM invoices ORDER BY shippingbilldate DESC");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ error: "Server error fetching invoices" });
  }
});

export default invoicesRouter;
