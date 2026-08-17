require('dotenv').config();

const { createApp } = require('./src/createApp');
const {
  connectDatabase,
  disconnectDatabase,
} = require('./src/infrastructure/container');

const app = createApp();
const PORT = process.env.PORT || 3000;

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

async function shutdown(signal) {
  console.log(`\n[app] ${signal} recibido. Cerrando servidor...`);
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
