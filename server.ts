import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiRouter, handleGithubCallback } from './server/api';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Top-level OAuth callback route (for direct OAuth provider redirects)
  app.get(['/auth/github/callback', '/auth/github/callback/'], (req, res) => {
    return handleGithubCallback(req, res);
  });

  // API Routes MUST be mounted BEFORE Vite middleware
  app.use('/api', apiRouter);

  // Vite development or production static build serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CraftFlow Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
