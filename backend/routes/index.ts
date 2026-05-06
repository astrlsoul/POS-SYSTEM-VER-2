import { Router } from 'express';
import authRoutes from './auth';
import menuRoutes from './menu';
import ordersRoutes from './orders';

export const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/menu', menuRoutes);
apiRouter.use('/orders', ordersRoutes);

// Health check
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
