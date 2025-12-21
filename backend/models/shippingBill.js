import pool from '../db.js';

const getDashboardData = async () => {
  const query = `
    SELECT 
      sb.sbid,
      sb.shippingbillno,
      sb.shippingbilldate,
      sb.portcode,
      sb.customerid,
      sb.consigneename,
      sb.lodgementno,
      COALESCE(
        json_agg(
          json_build_object(
            'invoiceid', inv.invoiceid,
            'invoiceno', inv.invoiceno,
            'invoicedate', inv.invoicedate,
            'amount', inv.exportbillvalue,
            'currency', inv.fobcurrencycode,
            'status', 'Lodged'
          ) 
        ) FILTER (WHERE inv.invoiceid IS NOT NULL), 
        '[]'
      ) as invoices
    FROM shippingbills sb
    LEFT JOIN invoices inv ON sb.sbid = inv.sbid
    GROUP BY sb.sbid, sb.shippingbillno, sb.shippingbilldate, sb.portcode, sb.customerid, sb.consigneename, sb.lodgementno
    ORDER BY sb.shippingbilldate DESC;
  `;

  const { rows } = await pool.query(query);
  return rows;
};

export { getDashboardData };