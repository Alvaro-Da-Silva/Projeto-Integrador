import { Router } from 'express';
import { getAuthenticatedUser } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

export default function createDomainAuthRoutes() {
  const router = Router();
  router.get('/me',authenticate,getAuthenticatedUser);
  return router;
}
