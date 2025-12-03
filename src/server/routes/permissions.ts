import { Hono } from 'hono';
import { db } from '../../db';
import { permissions, groupPermissions } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

export const permissionRoutes = new Hono();

// Create a new permission
permissionRoutes.post('/permissions', async (c) => {
  const body = await c.req.json();
  const { projectId, key, description } = body;

  if (!projectId || !key) {
    return c.json({ error: 'Project ID and Key are required' }, 400);
  }

  // Check for duplicate
  const existing = await db.select()
    .from(permissions)
    .where(and(
      eq(permissions.projectId, projectId),
      eq(permissions.key, key)
    ))
    .limit(1);

  if (existing.length > 0) {
    return c.json({ error: 'Permission key already exists in this project' }, 409);
  }

  const [newPermission] = await db.insert(permissions).values({
    projectId,
    key,
    description
  }).returning();

  return c.json(newPermission);
});

// Update a permission
permissionRoutes.put('/permissions/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  const { key, description } = body;

  const [updatedPermission] = await db.update(permissions)
    .set({ key, description })
    .where(eq(permissions.id, id))
    .returning();

  return c.json(updatedPermission);
});

// Delete a permission
permissionRoutes.delete('/permissions/:id', async (c) => {
  const id = Number(c.req.param('id'));

  // First delete related group permissions
  await db.delete(groupPermissions).where(eq(groupPermissions.permissionId, id));
  
  // Then delete the permission
  await db.delete(permissions).where(eq(permissions.id, id));

  return c.json({ success: true });
});
