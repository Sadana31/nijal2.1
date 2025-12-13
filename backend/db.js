import pkg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pkg;

// specific configuration for Render vs Local
const poolConfig = process.env.DATABASE_URL
  ? {
      // PROD: Use Render's Connection String
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false, // Required for Render's secure connection
      },
    }
  : {
      // LOCAL: Use your laptop's settings
      user: 'postgres',
      host: 'localhost',
      database: 'nijaltrade',
      password: 'Sadu2006$',
      port: 5432,
    };

const pool = new Pool(poolConfig);

// set correct schema
pool.query('SET search_path TO public');

export default pool;