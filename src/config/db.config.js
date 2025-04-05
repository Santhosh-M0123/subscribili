import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'saco_v2',
  password: 'postgres',
  port: 5432,
});

// Normal query usage
export const query = (text, params) => pool.query(text, params);

// Export the pool for transactions
export const getClient = async () => await pool.connect();
