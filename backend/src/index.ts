import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import mongoose from 'mongoose';
import { initSocketServer } from './websocket/socketServer';
import assignmentRoutes from './routes/assignments';

// Import worker to start processing
import './workers/generationWorker';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/assignments', assignmentRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize WebSocket
initSocketServer(httpServer);

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is missing!");
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => {
    console.log('[DB] Connected to MongoDB');
    httpServer.listen(PORT, () => {
      console.log(`[Server] Running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('[DB] MongoDB connection error:', error.message);
    process.exit(1);
  });

export default app;
