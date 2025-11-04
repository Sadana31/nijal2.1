import pool from "../db.js";
// ✅ Get all shipping bills with nested invoices
export const getAllShippingBills = async (req, res) => {
  try {
    const query = `
      SELECT
        sb.sbid,
        sb.shippingbillno AS "sbNumber",
        sb.shippingbilldate AS "sbDate",
        sb.buyername AS "customer",

        -- Party Details
        json_build_object(
          'name', sb.buyername,
          'customerCode', sb.iebuyerCode,
          'address', sb.buyeraddress
        ) AS "partyDetails",

        -- SB Details
        json_build_object(
          'portCode', sb.portcode,
          'sbValue', sb.exportbillvalue::text,
          'bankName', sb.bankname,
          'fobCurrency', sb.fobcurrency
        ) AS "sbDetails",

        -- Aggregate invoice list
        COALESCE(
          json_agg(
            json_build_object(
              'invoiceId', i.invoiceid,
              'invNumber', i.invoiceno,
              'invDate', i.invoicedate,
              'invValue', i.exportbillvalue,
              'currency', i.fobcurrencycode,
              'tenor', i.tenorasperinvoice,
              'commodity', i.commoditydescription,
              'shippingCompany', i.shippingcompanyname,
              'blAwbNo', i.blawbno,
              'vesselName', i.vesselname,
              'blDate', i.bldate,
              'commercialInvoiceNo', i.commercialinvoiceno
            )
          ) FILTER (WHERE i.invoiceid IS NOT NULL),
          '[]'::json
        ) AS "invoices"

      FROM shippingbill."shippingBills" sb
      LEFT JOIN shippingbill."invoices" i
        ON sb.sbid = i.sbid
      GROUP BY sb.sbid
      ORDER BY sb.shippingbilldate DESC;
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching shipping bills:", err);
    res.status(500).json({ error: "Error fetching shipping bills" });
  }
};


// ✅ Create a new shipping bill + its invoices
export const createShippingBill = async (req, res) => {
  const { sbNumber, sbDate, invoices, partyDetails, sbDetails } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Insert into shippingBills
    const sbInsert = `
      INSERT INTO shippingbill."shippingBills" (
        shippingbillno, shippingbilldate, buyername, buyeraddress, portcode, bankname,
        fobcurrency, exportbillvalue
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING sbid;
    `;

    const sbValues = [
      sbNumber,
      sbDate,
      partyDetails.name,
      partyDetails.address,
      sbDetails.portCode,
      sbDetails.bankName,
      sbDetails.fobCurrency,
      sbDetails.sbValue || 0
    ];

    const sbResult = await client.query(sbInsert, sbValues);
    const newSbId = sbResult.rows[0].sbid;

    // 2️⃣ Insert associated invoices
    const invInsert = `
      INSERT INTO shippingbill."invoices" (
        sbid, invoiceno, invoicedate, fobcurrencycode, exportbillvalue,
        tenorasperinvoice, commoditydescription, shippingcompanyname,
        blawbno, vesselname, bldate, commercialinvoiceno
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
      );
    `;

    for (const inv of invoices) {
      await client.query(invInsert, [
        newSbId,
        inv.invNumber,
        inv.invDate,
        inv.currency,
        inv.invValue,
        inv.tenor,
        inv.commodity,
        inv.shippingCompany,
        inv.blAwbNo,
        inv.vesselName,
        inv.blDate,
        inv.commercialInvoiceNo
      ]);
    }

    await client.query("COMMIT");
    res.status(201).json({ message: "✅ Shipping bill created successfully", sbid: newSbId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error creating shipping bill:", err);
    res.status(500).json({ error: "Error creating shipping bill" });
  } finally {
    client.release();
  }
};


export const getShippingBillById = async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      SELECT
        sb.*,
        COALESCE(
          json_agg(
            json_build_object(
              'invoiceId', i.invoiceid,
              'invNumber', i.invoiceno,
              'invDate', i.invoicedate,
              'invValue', i.exportbillvalue
            )
          ) FILTER (WHERE i.invoiceid IS NOT NULL),
          '[]'::json
        ) AS invoices
      FROM shippingbill."shippingBills" sb
      LEFT JOIN shippingbill."invoices" i
        ON sb.sbid = i.sbid
      WHERE sb.sbid = $1
      GROUP BY sb.sbid;
    `;

    const result = await pool.query(query, [id]);
    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("❌ Error fetching shipping bill by ID:", err);
    res.status(500).json({ error: "Error fetching shipping bill by ID" });
  }
};
