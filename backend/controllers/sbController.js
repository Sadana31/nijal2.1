import pool from "../db.js";

// ✅ Get all shipping bills (NEW, CORRECTED VERSION)
export const getAllShippingBills = async (req, res) => {
  try {
    /*
     * This is the main query. It joins shipping_bills (sb) with sbInvoices (i)
     * and builds the nested JSON structure your frontend expects.
     */
    const query = `
      SELECT
        sb.shipping_bill_no AS "sbNumber",
        sb.shipping_bill_date AS "sbDate",
        sb.buyer_name AS "customer",
        
        -- Build the 'partyDetails' object
        json_build_object(
          'name', sb.buyer_name,
          'customerCode', sb.buyer_code,
          'address', sb.buyer_address
          -- Add other partyDetails fields here if they are in the 'shippingBills' table
        ) AS "partyDetails",
        
        -- Build the 'sbDetails' object
        json_build_object(
          'portCode', sb.port_code,
          'sbValue', sb.export_bill_value::text -- Cast to text if it's a number
          -- Add 'shippingLine' and 'vessel' if they are in the 'shipping_bills' table
        ) AS "sbDetails",
        
        -- Aggregate all matching invoices into a JSON array
        COALESCE(
          json_agg(
            json_build_object(
              'invNumber', i.invoice_no,
              'invDate', i.invoice_date,
              'invValue', i.invoice_amount,
              'currency', i.invoice_currency,
              'realized', i.total_remittance_utilized,
              'outstanding', i.invoice_outstanding_amount,
              'fbCharges', 0, -- You don't have this column, so we default to 0
              'reduction', i.total_invoice_reduction,
              'dueDate', i.invoice_date + (i.tenor)::interval, -- Calculate due date
              'status', i.invoice_status,
              'documents', json_build_object(
                  'invoiceCopy', i.attachments, -- Assuming attachments is the URL/path
                  'blCopy', 'https://placehold.co/600x840?text=BL+Copy' -- Placeholder
              ),
              'remittances', '[]'::json -- Placeholder for now
            )
          ) FILTER (WHERE i.invoice_no IS NOT NULL),
          '[]'::json
        ) AS "invoices",

        -- Add placeholders for other sections your frontend expects
        '{"pos": []}'::json AS "poDetails",
        '{"sos": []}'::json AS "soDetails",
        '{"details": "N/A", "amount": "N/A", "status": "N/A"}'::json AS "preShipment",
        '{"proforma": "N/A", "linkedPIs": [], "details": "N/A"}'::json AS "commercialInvoice"
        
      FROM
        shippingbill."shippingBills" AS sb
      LEFT JOIN
        shippingbill."sbInvoices" AS i ON sb.sb_id = i.shipping_bill_id
      GROUP BY
        sb.sb_id
      ORDER BY
        sb.shipping_bill_date DESC;
    `;

    const result = await pool.query(query);
    res.json(result.rows); // This is now in the perfect format for React
    
  } catch (err) {
    console.error("❌ Error fetching shipping bills:", err);
    res.status(500).json({ error: "Error fetching shipping bills" });
  }
};

// ✅ Create a new shipping bill (NEW, CORRECTED VERSION)
export const createShippingBill = async (req, res) => {
  // Get the FULL nested object from the React modal
  const {
    sbNumber,
    sbDate,
    invoices, // This is the array
    partyDetails,
    sbDetails,
  } = req.body;

  const client = await pool.connect();

  try {
    // Start the transaction
    await client.query('BEGIN');

    // 1. Insert the main shipping bill
    const sbQuery = `
      INSERT INTO shippingbill."shippingBills" (
        shipping_bill_no, shipping_bill_date, buyer_name, buyer_code, buyer_address,
        port_code, export_bill_value
        -- Add other columns like 'shipping_line', 'vessel' if they exist
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING sb_id;
    `;
    
    // Note: sbDetails.sbValue is like "185,000 USD". You must parse it
    // or (better) change your modal to send the number and currency separately.
    // For now, I'll hardcode the value.
    // Parse the sbValue string (which might be "12 122" or "150,000 USD")
    const valueString = sbDetails.sbValue || '0';
    // 1. Remove commas. 2. Split by space. 3. Take the first part.
    const numericString = valueString.replace(/,/g, '').split(' ')[0];
    const numericValue = parseFloat(numericString) || 0;

    const sbValues = [
      sbNumber,
      sbDate,
      partyDetails.name,
      partyDetails.customerCode,
      partyDetails.address,
      sbDetails.portCode,
      numericValue, // Use the clean number
    ];
    
    const sbResult = await client.query(sbQuery, sbValues);
    const newSbId = sbResult.rows[0].sb_id;

    // 2. Loop and insert all associated invoices
    const invQuery = `
      INSERT INTO shippingbill."sbInvoices" (
        shipping_bill_id, invoice_no, invoice_date, invoice_currency, invoice_amount,
        invoice_outstanding_amount, due_date, status
        -- Add other non-null/defaulted columns
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
    `;

    for (const inv of invoices) {
      const invValues = [
        newSbId,
        inv.invNumber,
        inv.invDate,
        inv.currency,
        inv.invValue,
        inv.outstanding,
        inv.dueDate,
        inv.status,
      ];
      await client.query(invQuery, invValues);
    }

    // 3. Commit the transaction
    await client.query('COMMIT');

    // 4. Return the newly created object (or just a success message)
    // We'll just send back the original data + the new sb_id
    res.status(201).json({ ...req.body, sb_id: newSbId });

  } catch (err) {
    // 5. If anything failed, roll back the transaction
    await client.query('ROLLBACK');
    console.error("❌ Error creating shipping bill (transaction rolled back):", err);
    res.status(500).json({ error: "Error creating shipping bill" });
  } finally {
    // 6. ALWAYS release the client back to the pool
    client.release();
  }
};

// ✅ Get a single shipping bill by ID
export const getShippingBillById = async (req, res) => {
  // TODO: This should be updated to use the same JOIN query as getAllShippingBills
  // but with a "WHERE sb.sb_id = $1" clause.
  // For now, returning the old flat data.
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM shippingbill."shippingBills" WHERE sb_id = $1;`,
      [id]
    );
    res.json(result.rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: "Error fetching shipping bill" });
  }
};

// ✅ Delete a shipping bill by ID
export const deleteShippingBill = async (req, res) => {
  const { id } = req.params;
  try {
    // If your 'sbInvoices' table has "ON DELETE CASCADE" for the shipping_bill_id
    // foreign key, this will delete the bill AND all its invoices.
    // If not, you must delete from 'sbInvoices' first, then 'shipping_bills'.
    const result = await pool.query(
      `DELETE FROM shippingbill."shippingBills" WHERE sb_id = $1 RETURNING *;`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Shipping Bill not found" });
    }
    res.json({ message: "Shipping Bill deleted successfully", deleted: result.rows[0] });
  } catch (err) {
    console.error("❌ Error deleting shipping bill:", err);
    res.status(500).json({ error: "Error deleting shipping bill" });
  }
};