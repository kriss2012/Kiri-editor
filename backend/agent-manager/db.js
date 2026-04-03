const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://kiri:kiri_secret@localhost:5432/kiri_editor'
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
