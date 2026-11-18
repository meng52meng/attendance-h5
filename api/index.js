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

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  await initDB();
  const url = req.url;
  const method = req.method;

  try {
    if (url === '/api/records' && method === 'GET') {
      const knock = await pool.query('SELECT * FROM knock_records ORDER BY id DESC');
      const late = await pool.query('SELECT * FROM late_records ORDER BY id DESC');
      res.json({ knock: knock.rows, late: late.rows });
      return;
    }

    if (url.startsWith('/api/knock/count') && method === 'GET') {
      const duty = new URL(req.url, 'http://localhost').searchParams.get('duty');
      const result = await pool.query(
        'SELECT COUNT(*) as count FROM knock_records WHERE duty = $1 AND deleted = FALSE',
        [duty]
      );
      res.json({ count: parseInt(result.rows[0].count) });
      return;
    }

    if (url === '/api/knock' && method === 'POST') {
      const { date, duty, open, contact, times } = req.body;
      await pool.query(
        'INSERT INTO knock_records (date, duty, open, contact, times) VALUES ($1,$2,$3,$4,$5)',
        [date, duty, open || '', contact || '', times || '']
      );
      res.json({ ok: true });
      return;
    }

    if (url === '/api/late' && method === 'POST') {
      const { date, shift, name, reason } = req.body;
      await pool.query(
        'INSERT INTO late_records (date, shift, name, reason) VALUES ($1,$2,$3,$4)',
        [date, shift || '', name, reason || '']
      );
      res.json({ ok: true });
      return;
    }

    if (url.match(/^\/api\/knock\/\d+$/) && method === 'PUT') {
      const id = url.split('/')[3];
      const { date, duty, open, contact, times } = req.body;
      await pool.query(
        'UPDATE knock_records SET date=$1,duty=$2,open=$3,contact=$4,times=$5 WHERE id=$6',
        [date, duty, open, contact, times, id]
      );
      res.json({ ok: true });
      return;
    }

    if (url.match(/^\/api\/late\/\d+$/) && method === 'PUT') {
      const id = url.split('/')[3];
      const { date, shift, name, reason } = req.body;
      await pool.query(
        'UPDATE late_records SET date=$1,shift=$2,name=$3,reason=$4 WHERE id=$5',
        [date, shift, name, reason, id]
      );
      res.json({ ok: true });
      return;
    }

    if (url.match(/^\/api\/knock\/\d+\/delete$/) && method === 'POST') {
      const id = url.split('/')[3];
      await pool.query('UPDATE knock_records SET deleted=TRUE WHERE id=$1', [id]);
      res.json({ ok: true });
      return;
    }

    if (url.match(/^\/api\/late\/\d+\/delete$/) && method === 'POST') {
      const id = url.split('/')[3];
      await pool.query('UPDATE late_records SET deleted=TRUE WHERE id=$1', [id]);
      res.json({ ok: true });
      return;
    }

    res.status(404).json({ error: 'Not found' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
