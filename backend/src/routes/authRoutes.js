import { Router } from 'express';
import { loginUser, getAuthenticatedUser } from '../controllers/authController.js';
import { authenticate, createLoginRateLimit } from '../middleware/auth.js';

export default function createAuthRoutes() {
  const router = Router();
  router.post('/login',createLoginRateLimit(),loginUser);
  router.get('/me',authenticate,getAuthenticatedUser);
  return router;
}
