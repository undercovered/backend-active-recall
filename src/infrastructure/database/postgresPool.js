const { Pool } = require('pg');

/**
 * PostgreSQL connection system (infrastructure layer).
 *
 * This is the ONLY place that knows about the `pg` driver and connection
 * details. Repositories receive the pool via dependency injection, so the rest
 * of the app never imports `pg` directly. Swapping databases means replacing
 * this module (and the adapters) without touching the domain.
 */

const config = {
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'active_recall',
  // Pool tuning
  max: Number(process.env.PGPOOL_MAX) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
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
