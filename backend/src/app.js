import cors from 'cors';
import express from 'express';
import escalaRoutes from './routes/escalaRoutes.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use('/api/escalas', escalaRoutes);

  return app;
}
