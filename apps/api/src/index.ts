import app from './app.js';
import { env } from './config/env.js';

const port = parseInt(env.API_PORT);
const host = env.API_HOST;

const server = app.listen(port, () => {
  console.info(`
  🚀 HUMS API Server is running!

  Environment: ${env.NODE_ENV}
  URL: http://${host}:${port}
  Health: http://${host}:${port}/health
  `);
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.info(`\n${signal} signal received. Closing HTTP server...`);
  server.close(() => {
    console.info('HTTP server closed.');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;
