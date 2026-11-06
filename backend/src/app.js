import cors from 'cors';
import express from 'express';
import escalaRoutes from './routes/escalaRoutes.js';
import escalaWriteRoutes from './routes/escalaWriteRoutes.js';
import createAuthRoutes from './routes/authRoutes.js';
import availabilityRoutes from './routes/availabilityRoutes.js';
import usuarioRoutes from './routes/usuarioRoutes.js';
import cotistaRoutes from './routes/cotistaRoutes.js';
import { workflowErrors } from './middleware/workflowErrors.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use('/api/escalas', escalaRoutes);
  app.use('/api/auth', createAuthRoutes());
  app.use('/api/disponibilidades', availabilityRoutes);
  // O GET existente continua publico; apenas os endpoints de escrita exigem admin.
  app.use('/api/escalas', escalaWriteRoutes);
  app.use('/api/usuarios', usuarioRoutes);
  app.use('/api/cotistas', cotistaRoutes);
  app.use(workflowErrors);

  return app;
}
