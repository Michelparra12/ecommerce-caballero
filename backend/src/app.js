import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';

import { env } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { productRouter } from './modules/products/product.routes.js';
import { categoryRouter } from './modules/categories/category.routes.js';
import { orderRouter } from './modules/orders/order.routes.js';
import { userRouter } from './modules/users/user.routes.js';
import { paymentRouter } from './modules/payments/payment.routes.js';
import { addressRouter } from './modules/addresses/address.routes.js';
import { feedRouter } from './modules/feed/feed.routes.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL }));
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp());

  // Rate limit general de la API pública para mitigar scraping/abuso.
  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.use('/api/productos', productRouter);
  app.use('/api/categorias', categoryRouter);
  app.use('/api/ordenes', orderRouter);
  app.use('/api/usuarios', userRouter);
  app.use('/api/pagos', paymentRouter);
  app.use('/api/direcciones', addressRouter);
  app.use('/feed', feedRouter);

  app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
  app.use(errorHandler);

  return app;
}
