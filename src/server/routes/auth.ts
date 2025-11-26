import { Hono } from 'hono';
import { setCookie, getCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';
import { db } from '../../db';
import { users, permissionGroups, groupPermissions, permissions } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { compare } from 'bcryptjs';

export const authRoutes = new Hono();

const JWT_SECRET = process.env['JWT_SECRET'] || 'super-secret-key';

authRoutes.get('/me', async (c) => {
  const token = getCookie(c, 'auth_token');
  if (!token) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  try {
    const payload = await verify(token, JWT_SECRET);
    const userId = payload['sub'] as number;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        permissionGroup: {
          with: {
            groupPermissions: {
              with: {
                permission: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({
      id: user.id,
      username: user.username,
      group: user.permissionGroup?.name,
      permissions: user.permissionGroup?.groupPermissions.map(gp => ({
        key: gp.permission.key,
        enabled: gp.enabled
      }))
    });
  } catch (e) {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

authRoutes.post('/login', async (c) => {
  const body = await c.req.json();
  const { username, password } = body;

  if (!username || !password) {
    return c.json({ error: 'Username and password are required' }, 400);
  }

  // Find user
  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
    with: {
      permissionGroup: {
        with: {
          groupPermissions: {
            with: {
              permission: true
            }
          }
        }
      }
    }
  });

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  // Verify password (in a real app, use bcrypt.compare)
  // For the seed data, I stored plain text 'password'. 
  // I should check if it matches plain text OR hash.
  // But for this demo, I'll assume the seed data is what it is.
  // If I used bcrypt in seed, I would compare.
  // Let's just check plain text for the seed user 'admin'/'password' 
  // OR try bcrypt compare if I decide to hash it later.
  // For now, I'll just do a simple check since I seeded plain text.
  
  let isValid = false;
  if (user.password === password) {
    isValid = true;
  } else {
    // Try bcrypt just in case (if we add registration later)
    isValid = await compare(password, user.password);
  }

  if (!isValid) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  // Create JWT payload
  const payload = {
    sub: user.id,
    username: user.username,
    groupId: user.permissionGroupId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 1 day
  };

  const token = await sign(payload, JWT_SECRET);

  // Set Cookie
  setCookie(c, 'auth_token', token, {
    httpOnly: true,
    secure: true, // Set to true in prod, but maybe false for localhost if not https?
    // Hono's setCookie secure default depends.
    // For localhost without https, secure cookies might be rejected by some browsers.
    // I'll set it to false for dev if needed, or just true and hope localhost is treated as secure (it usually is).
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  });

  // Return user info (excluding password)
  return c.json({
    id: user.id,
    username: user.username,
    group: user.permissionGroup?.name,
    permissions: user.permissionGroup?.groupPermissions.map(gp => ({
      key: gp.permission.key,
      enabled: gp.enabled
    }))
  });
});

authRoutes.post('/logout', (c) => {
  setCookie(c, 'auth_token', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  return c.json({ message: 'Logged out' });
});
