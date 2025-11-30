import { AngularAppEngine } from '@angular/ssr';
import { isMainModule } from '@angular/ssr/node';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { join } from 'node:path';
import { authRoutes } from './server/routes/auth';
import { permissionRoutes } from './server/routes/permissions';
import { projectRoutes } from './server/routes/projects';
import { groupRoutes } from './server/routes/groups';
import { exportRoutes } from './server/routes/export';
import { getCookie } from 'hono/cookie';
import { verify } from 'hono/jwt';

type Variables = {
  user: any;
};

const app = new Hono<{ Variables: Variables }>();
const angularApp = new AngularAppEngine();

const browserDistFolder = join(import.meta.dirname, '../browser');

const JWT_SECRET = process.env['JWT_SECRET'] || 'super-secret-key';

// Middleware to check auth (optional, or applied to specific routes)
app.use('/api/*', async (c, next) => {
  if (c.req.path.startsWith('/api/auth')) {
    return next();
  }
  
  const token = getCookie(c, 'auth_token');
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = await verify(token, JWT_SECRET);
    c.set('user', payload);
    await next();
  } catch (e) {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

// API Routes
app.route('/api/auth', authRoutes);
app.route('/api', projectRoutes);
app.route('/api', groupRoutes);
app.route('/api', permissionRoutes);
app.route('/api/export', exportRoutes);

// Serve static files
app.get('*', serveStatic({
  root: browserDistFolder,
}));

// Angular SSR Catch-all
app.all('*', async (c) => {
  const response = await angularApp.handle(c.req.raw);
  if (response) {
    return response;
  }
  return c.text('Not found', 404);
});

if (isMainModule(import.meta.url)) {
  const port = Number(process.env['PORT']) || 4000;
  console.log(`Hono server listening on http://localhost:${port}`);
  serve({
    fetch: app.fetch,
    port,
  });
}

export default app;
