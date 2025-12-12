import pool from '../db.js';

// --- 1. Get All Remittances ---
export const getAllRemittances = async (req, res) => {
  try {
    const query = `
      SELECT 
        r.remittanceid AS "id",
        r.remittanceref AS "remRef",
        r.remittancedate AS "remDate",
        r.netvalue AS "net",
        r.instructedvalue AS "instructed",
        r.chargesdeducted AS "charges",
        r.currencycode AS "currency",
        r.senderrefno AS "senderRefNo",
        r.senderrefdate AS "senderRefDate",
        r.remittername AS "remitterName",
        r.beneficiarynameswift AS "beneficiaryNameSwift",
        r.remitterremarks AS "remitterRemarks",
        r.detailsofchargescode AS "detailsOfCharges",
        r.beneficiarybankid AS "beneficiaryBankId",
        r.bankid AS "bankId",
        r.source AS "source",
        COALESCE(
          json_agg(
            json_build_object(
              'irmRef', i.irmref,
              'irmDate', i.irmdate,
              'purposeCode', i.purposecode,
              'purposeDesc', i.purposedescription,
              'irmUtilized', i.amountutilizedfcy,
              'currency', i.currencycode,
              'convRate', i.conversionrate,
              'invRealized', i.invoicerealizedfcy,
              'fbChargesRem', i.fbchargesremfcy
            ) 
          ) FILTER (WHERE i.irmid IS NOT NULL), 
          '[]'
        ) AS "irmLines"
      FROM remittance r
      LEFT JOIN irmlines i ON r.remittanceid = i.remittanceid
      GROUP BY r.remittanceid
      ORDER BY r.createdat DESC
    `;

    const result = await pool.query(query);

    const formattedData = result.rows.map(row => {
      let bankName = 'Unknown';
      if (row.bankId === 1) bankName = 'ICICI Bank';
      else if (row.bankId === 2) bankName = 'Citi Bank';
      else if (row.bankId === 3) bankName = 'HSBC Bank';

      return {
        ...row,
        bankName: bankName 
      };
    });

    res.status(200).json(formattedData);

  } catch (error) {
    console.error('Error fetching remittances:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// --- 2. Create Single Remittance (Manual) ---
export const createRemittance = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      remRef, remDate, net, instructed, charges, currency,
      senderRefNo, senderRefDate, remitterName, 
      beneficiaryNameSwift, remitterRemarks, detailsOfCharges,
      beneficiaryBankId, bankId, source
    } = req.body;

    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO remittance (
        remittanceref, remittancedate, netvalue, instructedvalue, chargesdeducted,
        currencycode, senderrefno, senderrefdate, remittername,
        beneficiarynameswift, remitterremarks, detailsofchargescode,
        beneficiarybankid, bankid, source, createdat, updatedat
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
      ) RETURNING remittanceid`;

    const values = [
      remRef, remDate, net, instructed || net, charges || 0,
      currency, senderRefNo, senderRefDate, remitterName,
      beneficiaryNameSwift, remitterRemarks, detailsOfCharges,
      beneficiaryBankId, bankId, source
    ];

    const result = await client.query(insertQuery, values);

    await client.query('COMMIT');
    
    res.status(201).json({ message: 'Remittance created', id: result.rows[0].remittanceid });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating remittance:', error);
    res.status(500).json({ error: 'Failed to create remittance' });
  } finally {
    client.release();
  }
};

// --- 3. Upload Bulk Remittances (Citi/ICICI) ---
// FIXED: Exported correctly using 'export const' and adapted for PostgreSQL
export const uploadRemittances = async (req, res) => {
  const client = await pool.connect();

  try {
    const { remittances } = req.body;

    if (!remittances || !Array.isArray(remittances) || remittances.length === 0) {
      return res.status(400).json({ message: "No remittance data provided" });
    }

    await client.query('BEGIN');

    let upsertCount = 0;

    // PostgreSQL "Upsert" Loop
    for (const rem of remittances) {
      // Logic to determine Bank ID based on string name
      let bankId = null;
      if (rem.bankName === 'ICICI Bank') bankId = 1;
      else if (rem.bankName === 'Citi Bank') bankId = 2;
      else if (rem.bankName === 'HSBC Bank') bankId = 3;

      const query = `
        INSERT INTO remittance (
          remittanceref, bankid, remittancedate, netvalue, 
          currencycode, remittername, source, createdat, updatedat
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 'UPLOAD', NOW(), NOW()
        )
        ON CONFLICT (remittanceref) 
        DO UPDATE SET 
          netvalue = EXCLUDED.netvalue,
          updatedat = NOW()
        RETURNING remittanceid;
      `;

      const values = [
        rem.remRef,
        bankId,
        rem.remDate || null, // Ensure dates are formatted YYYY-MM-DD
        rem.net,
        rem.currency,
        rem.remitterName
      ];

      await client.query(query, values);
      upsertCount++;
    }

    await client.query('COMMIT');

    res.status(200).json({
      message: "Upload successful",
      count: upsertCount
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Upload Error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  } finally {
    client.release();
  }
};