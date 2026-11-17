import cors from 'cors';
import express from 'express';
import escalaRoutes from './routes/escalaRoutes.js';
import escalaWriteRoutes from './routes/escalaWriteRoutes.js';
import createDomainAuthRoutes from './routes/authRoutes.js';
import { betterAuthHandler } from './routes/betterAuthRoutes.js';
import { getAuth } from './config/auth.js';
import { trustedOrigins } from './config/authSettings.js';
import { HttpError } from './services/workflowValidation.js';
import availabilityRoutes from './routes/availabilityRoutes.js';
import usuarioRoutes from './routes/usuarioRoutes.js';
import cotistaRoutes from './routes/cotistaRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { workflowErrors } from './middleware/workflowErrors.js';

export function createApp({authProvider = getAuth,origins = trustedOrigins()} = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.locals.authProvider = authProvider;
  app.locals.trustedOrigins = [...origins];
  app.use(cors({origin(origin,callback) {
    if (!origin || origins.includes(origin)) return callback(null,true);
    callback(new HttpError(403,'Origem não autorizada.'));
  },credentials:true,methods:['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders:['Content-Type','Authorization']}));
  app.all('/api/auth/*splat',betterAuthHandler);
  app.use(express.json());
  app.use('/api/escalas', escalaRoutes);
  app.use('/api',createDomainAuthRoutes());
  app.use('/api/disponibilidades', availabilityRoutes);
  app.use('/api/escalas', escalaWriteRoutes);
  app.use('/api/usuarios', usuarioRoutes);
  app.use('/api/cotistas', cotistaRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use(workflowErrors);

  return app;
}
