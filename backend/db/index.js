import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

// 👇 Important: set schema context
pool.query('SET search_path TO "shippingBill"')
  .then(() => console.log('✅ Connected to shippingBill schema!'))
  .catch(err => console.error('❌ Schema error:', err));

export default pool;
