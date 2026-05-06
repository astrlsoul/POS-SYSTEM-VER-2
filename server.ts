import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';

// Import backend routes, socket setup and db
import { initDb } from './backend/db';
import { initSocket } from './backend/socket';
import { apiRouter } from './backend/routes';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Init DB
  try {
    initDb();
  } catch (err) {
    console.error('Database init failed:', err);
  }

  const httpServer = createServer(app);

  
  // Initialize Socket.io
  initSocket(httpServer);

  // Middleware
  app.use(cors());
  app.use(express.json());

  // API routing
  app.use('/api', apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
