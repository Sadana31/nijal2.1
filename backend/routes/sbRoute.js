import express from "express";
import pool from "../db.js";

const shippingBillsRouter = express.Router();

// ✅ ROUTE 1: Get all shipping bills with nested invoices (detailed)
shippingBillsRouter.get("/", async (req, res) => {
  try {
    const query = `
      SELECT 
        sb.sbid,
        sb.shippingbillno AS "shippingBillNo",
        sb.shippingbilldate AS "shippingBillDate",
        sb.portcode AS "portCode",
        sb.bankname AS "bankName",
        sb.buyername AS "buyerName",
        sb.fobcurrency AS "fobCurrency",
        sb.exportbillvalue AS "exportBillValue",
        COUNT(i.invoiceid) AS "invoiceCount",

        i.invoiceid AS "invoiceId",
        i.invoiceno AS "invoiceNo",
        i.invoicedate AS "invoiceDate",
        i.fobcurrencycode AS "fobCurrencyCode",
        i.exportbillvalue AS "invoiceExportBillValue",
        i.tenorasperinvoice AS "tenorAsPerInvoice",
        i.commoditydescription AS "commodityDescription",
        i.shippingcompanyname AS "shippingCompanyName",
        i.blawbno AS "blAwbNo",
        i.vesselname AS "vesselName",
        i.bldate AS "blDate",
        i.commercialinvoiceno AS "commercialInvoiceNo"

      FROM shippingBills sb
      LEFT JOIN invoices i ON sb.sbid = i.sbid
      GROUP BY sb.sbid, i.invoiceid
      ORDER BY sb.shippingbilldate DESC;
    `;

    const result = await pool.query(query);

    // Group flat rows into nested JSON per SB
    const grouped = result.rows.reduce((acc, row) => {
      const sbid = row.sbid;

      if (!acc[sbid]) {
        acc[sbid] = {
          sbid: row.sbid,
          shippingBillNo: row.shippingBillNo,
          shippingBillDate: row.shippingBillDate,
          portCode: row.portCode,
          bankName: row.bankName,
          buyerName: row.buyerName,
          fobCurrency: row.fobCurrency,
          exportBillValue: row.exportBillValue,
          invoiceCount: parseInt(row.invoiceCount) || 0,
          invoices: [],
        };
      }

      if (row.invoiceId) {
        acc[sbid].invoices.push({
          invoiceId: row.invoiceId,
          invoiceNo: row.invoiceNo,
          invoiceDate: row.invoiceDate,
          fobCurrencyCode: row.fobCurrencyCode,
          exportBillValue: row.invoiceExportBillValue,
          tenorAsPerInvoice: row.tenorAsPerInvoice,
          commodityDescription: row.commodityDescription,
          shippingCompanyName: row.shippingCompanyName,
          blAwbNo: row.blAwbNo,
          vesselName: row.vesselName,
          blDate: row.blDate,
          commercialInvoiceNo: row.commercialInvoiceNo,
        });
      }

      return acc;
    }, {});

    res.json(Object.values(grouped));
  } catch (error) {
    console.error("❌ Error fetching shipping bills with invoices:", error);
    res.status(500).json({ error: "Server error fetching shipping bills with invoices" });
  }
});

// ✅ ROUTE 2: Simpler version using JSON aggregation
shippingBillsRouter.get("/withInvoices", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        sb.*,
        COALESCE(
          json_agg(
            json_build_object(
              'invoiceid', i.invoiceid,
              'invoiceno', i.invoiceno,
              'invoicedate', i.invoicedate,
              'fobcurrencycode', i.fobcurrencycode,
              'exportbillvalue', i.exportbillvalue,
              'commoditydescription', i.commoditydescription,
              'bldate', i.bldate,
              'vesselname', i.vesselname,
              'commercialinvoiceno', i.commercialinvoiceno
            )
          ) FILTER (WHERE i.invoiceid IS NOT NULL),
          '[]'
        ) AS invoicelist
      FROM shippingBills sb
      LEFT JOIN invoices i ON sb.sbid = i.sbid
      GROUP BY sb.sbid
      ORDER BY sb.shippingbilldate DESC;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error fetching joined SB + invoices:", error);
    res.status(500).json({ error: "Error fetching joined data" });
  }
});

export default shippingBillsRouter;
