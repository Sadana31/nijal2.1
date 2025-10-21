import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',          // your PostgreSQL username
  host: 'localhost',         // database host
  database: 'nijal',     // your database name
  password: 'Sadu2006$', // your password here
  port: 5432,                // your port
});

pool.query('SET search_path TO "shippingBill"'); 
export default pool;
