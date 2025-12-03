import { Hono } from 'hono';
import { db } from '../../db';
import { permissionGroups, groupPermissions } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

export const groupRoutes = new Hono();

// Create a new permission group
groupRoutes.post('/projects/:projectId/groups', async (c) => {
  const projectId = Number(c.req.param('projectId'));
  const body = await c.req.json();
  const { name } = body;

  if (!name) {
    return c.json({ error: 'Name is required' }, 400);
  }

  // Check for duplicate
  const existing = await db.select()
    .from(permissionGroups)
    .where(and(
      eq(permissionGroups.projectId, projectId),
      eq(permissionGroups.name, name)
    ))
    .limit(1);

  if (existing.length > 0) {
    return c.json({ error: 'Group name already exists in this project' }, 409);
  }

  const [newGroup] = await db.insert(permissionGroups).values({
    projectId,
    name
  }).returning();

  return c.json(newGroup);
});

// Update group permission (toggle enabled)
groupRoutes.post('/groups/:groupId/permissions', async (c) => {
  const groupId = Number(c.req.param('groupId'));
  const body = await c.req.json();
  const { permissionId, enabled } = body;

  // Upsert
  await db.insert(groupPermissions)
    .values({ groupId, permissionId, enabled })
    .onConflictDoUpdate({
      target: [groupPermissions.groupId, groupPermissions.permissionId],
      set: { enabled }
    });

  return c.json({ success: true });
});

// Delete a permission group
groupRoutes.delete('/groups/:id', async (c) => {
  const id = Number(c.req.param('id'));

  // First delete related group permissions
  await db.delete(groupPermissions).where(eq(groupPermissions.groupId, id));
  
  // Then delete the group
  await db.delete(permissionGroups).where(eq(permissionGroups.id, id));

  return c.json({ success: true });
});
