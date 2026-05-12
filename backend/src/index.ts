import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';

import authRouter from './routes/auth';
import employeesRouter from './routes/employees';
import recruitingRouter from './routes/recruiting';
import departmentsRouter from './routes/departments';
import absencesRouter from './routes/absences';
import payrollRouter from './routes/payroll';
import performanceRouter from './routes/performance';
import surveysRouter from './routes/surveys';
import whistleblowingRouter from './routes/whistleblowing';
import onboardingRouter from './routes/onboarding';
import notificationsRouter from './routes/notifications';
import workflowsRouter from './routes/workflows';

const app: Application = express();
app.set('etag', false);
const PORT = process.env.PORT ?? 3001;

// ─── Middleware ────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Health Check ──────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'hr-app-backend',
    version: '1.0.0',
  });
});

// ─── API Routes ────────────────────────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/recruiting', recruitingRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/absences', absencesRouter);
app.use('/api/payroll', payrollRouter);
app.use('/api/performance', performanceRouter);
app.use('/api/surveys', surveysRouter);
app.use('/api/whistleblowing', whistleblowingRouter);
app.use('/api/onboarding', onboardingRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/workflows', workflowsRouter);

// ─── 404 Handler ──────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'Die angeforderte Route existiert nicht.',
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error]', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Ein interner Fehler ist aufgetreten.',
  });
});

// ─── Server starten ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 HR-App Backend läuft auf http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`   Health:      http://localhost:${PORT}/health\n`);
});

export default app;
