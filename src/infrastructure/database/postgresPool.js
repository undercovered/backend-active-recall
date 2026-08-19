const { Pool } = require('pg');

/**
 * PostgreSQL connection system (infrastructure layer).
 *
 * This is the ONLY place that knows about the `pg` driver and connection
 * details. Repositories receive the pool via dependency injection, so the rest
 * of the app never imports `pg` directly. Swapping databases means replacing
 * this module (and the adapters) without touching the domain.
 */

function useSsl() {
  const mode = String(process.env.PGSSLMODE || '').toLowerCase();
  return (
    mode === 'require' ||
    mode === 'verify-full' ||
    process.env.PGSSL === 'true' ||
    process.env.PGSSL === '1'
  );
}

const config = {
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'active_recall',
  ssl: useSsl()
    ? { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== 'false' }
    : undefined,
  max: Number(process.env.PGPOOL_MAX) || 10,
  idleTimeoutMillis: Number(process.env.PGIDLE_TIMEOUT_MS) || 30000,
  connectionTimeoutMillis: Number(process.env.PGCONNECTION_TIMEOUT_MS) || 5000,
};

const pool = new Pool(config);

// Prevent the process from crashing on unexpected errors of idle clients.
pool.on('error', (err) => {
  console.error('[db] Error inesperado en un cliente inactivo:', err.message);
});

/**
 * Verifies connectivity by acquiring a client and running a trivial query.
 * Throws if the database is unreachable.
 */
async function connectDatabase() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log(
      `[db] Conectado a PostgreSQL → ${config.database}@${config.host}:${config.port}`,
    );
  } finally {
    client.release();
  }
}

/**
 * Gracefully closes the pool. Call this on process shutdown.
 */
async function disconnectDatabase() {
  await pool.end();
  console.log('[db] Pool de PostgreSQL cerrado.');
}

module.exports = { pool, connectDatabase, disconnectDatabase };
