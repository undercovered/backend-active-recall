require('dotenv').config();

const express = require('express');
const cors = require('cors');
const {
  pool,
  connectDatabase,
  disconnectDatabase,
} = require('./src/infrastructure/container');
const { sendSuccess } = require('./src/interfaces/http/httpResponse');
const asyncHandler = require('./src/interfaces/http/middlewares/asyncHandler');
const {
  notFoundHandler,
  errorHandler,
} = require('./src/interfaces/http/middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Utility routes ---
app.get('/api/health', (req, res) =>
  sendSuccess(res, {
    data: { status: 'ok', service: 'active-recall-backend' },
    msg: '',
  }),
);

app.get(
  '/api/db/ping',
  asyncHandler(async (req, res) => {
    const result = await pool.query('SELECT NOW() AS now');
    return sendSuccess(res, { data: { now: result.rows[0].now }, msg: '' });
  }),
);

// --- Feature routes ---
app.use('/api/subjects', require('./src/interfaces/http/routes/subject.routes'));

// --- 404 + centralized error handling (must be last) ---
app.use(notFoundHandler);
app.use(errorHandler);

// --- Startup ---
const server = app.listen(PORT, async () => {
  console.log(`Active Recall backend escuchando en http://localhost:${PORT}`);
  try {
    await connectDatabase();
  } catch (err) {
    console.error(
      '[db] No se pudo conectar a PostgreSQL al arrancar:',
      err.message,
    );
    console.error('[db] El servidor sigue activo; revisa tu configuración .env.');
  }
});

// --- Graceful shutdown ---
async function shutdown(signal) {
  console.log(`\n[app] ${signal} recibido. Cerrando servidor...`);
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
