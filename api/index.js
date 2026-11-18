const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS knock_records (
        id SERIAL PRIMARY KEY,
        date VARCHAR(20) NOT NULL,
        duty VARCHAR(50) NOT NULL,
        open TEXT,
        contact VARCHAR(10),
        times VARCHAR(10),
        deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS late_records (
        id SERIAL PRIMARY KEY,
        date VARCHAR(20) NOT NULL,
        shift VARCHAR(20),
        name VARCHAR(50) NOT NULL,
        reason TEXT,
        deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } finally {
    client.release();
  }
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
