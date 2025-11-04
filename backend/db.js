import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'nijaltrade',
  password: 'Sadu2006$', // your password
  port: 5432,
});

// set correct schema
pool.query('SET search_path TO public');

export default pool;
