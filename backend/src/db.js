'use strict';
const { Pool } = require('pg');

// اگر DATABASE_URL تنظیم نشده باشد، pg از متغیرهای PGHOST/PGUSER/... استفاده می‌کند.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.on('error', (err) => console.error('Unexpected PostgreSQL error:', err.message));

module.exports = pool;
