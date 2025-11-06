import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config, validateConfig } from './config';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import * as promptMiningService from './services/promptMiningService';

/**
 * Main application entry point.
 *
 * Initializes and starts the Express server with all middleware,
 * routes, and error handling configured.
 */

// Validate configuration before starting
try {
  validateConfig();
  console.log('✅ Configuration validated successfully');
} catch (error: any) {
  console.error('❌ Configuration validation failed:', error.message);
  console.error('\nPlease check your .env file and ensure all required variables are set.');
  process.exit(1);
}

// Initialize blockchain connection
try {
  promptMiningService.initialize();
  console.log('✅ Blockchain initialized successfully');
} catch (error: any) {
  console.error('❌ Blockchain initialization failed:', error.message);
  console.error('\nPlease check your RPC_URL and ensure blockchain is accessible.');
  process.exit(1);
}

// Create Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (config.env === 'development') {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Mount routes
app.use(routes);

// Error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const server = app.listen(config.server.port, () => {
  const host = config.env === 'production' ? '0.0.0.0' : 'localhost';
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🚀 Prompt Mining API Server');
  console.log('═══════════════════════════════════════════════════');
  console.log(`📍 Environment:    ${config.env}`);
  console.log(`🌐 Server:         http://${host}:${config.server.port}`);
  console.log(`⛓️  Chain ID:       ${config.blockchain.chainId}`);
  console.log(`🔑 PZERO Client:   ${config.pzero.clientId}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('\nAvailable endpoints:');
  console.log('  GET  /health                           - Health check');
  console.log('  POST /api/prompts/mint                 - Mint a prompt');
  console.log('  POST /api/prompts/migrate              - Migrate a prompt');
  console.log('  GET  /api/prompts/:hash                - Check prompt status');
  console.log('  GET  /api/activity-points/:address     - Get balance');
  console.log('  GET  /api/quota                        - Get PZERO quota');
  console.log('═══════════════════════════════════════════════════\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n📴 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n📴 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;
