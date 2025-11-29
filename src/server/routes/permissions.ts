import { Hono } from 'hono';
import { db } from '../../db';
import { projects, permissions, permissionGroups, groupPermissions } from '../../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

export const permissionRoutes = new Hono();

// Get all projects with permissions and groups
permissionRoutes.get('/projects', async (c) => {
  const result = await db.query.projects.findMany({
    with: {
      permissions: true,
      permissionGroups: {
        with: {
          groupPermissions: true
        }
      }
    }
  });
  return c.json(result);
});

// Create a new project
permissionRoutes.post('/projects', async (c) => {
  const body = await c.req.json();
  const { name, description } = body;

  if (!name) {
    return c.json({ error: 'Name is required' }, 400);
  }

  const [newProject] = await db.insert(projects).values({
    name,
    description,
    apiKey: randomUUID()
  }).returning();

  return c.json(newProject);
});

// Create a new permission group
permissionRoutes.post('/projects/:projectId/groups', async (c) => {
  const projectId = Number(c.req.param('projectId'));
  const body = await c.req.json();
  const { name } = body;

  if (!name) {
    return c.json({ error: 'Name is required' }, 400);
  }

  const [newGroup] = await db.insert(permissionGroups).values({
    projectId,
    name
  }).returning();

  return c.json(newGroup);
});

// Create a new permission
permissionRoutes.post('/permissions', async (c) => {
  const body = await c.req.json();
  const { projectId, key, description } = body;

  if (!projectId || !key) {
    return c.json({ error: 'Project ID and Key are required' }, 400);
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

// Update group permission (toggle enabled)
permissionRoutes.post('/groups/:groupId/permissions', async (c) => {
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

// Delete a permission
permissionRoutes.delete('/permissions/:id', async (c) => {
  const id = Number(c.req.param('id'));

  // First delete related group permissions
  await db.delete(groupPermissions).where(eq(groupPermissions.permissionId, id));
  
  // Then delete the permission
  await db.delete(permissions).where(eq(permissions.id, id));

  return c.json({ success: true });
});

// Delete a permission group
permissionRoutes.delete('/groups/:id', async (c) => {
  const id = Number(c.req.param('id'));

  // First delete related group permissions
  await db.delete(groupPermissions).where(eq(groupPermissions.groupId, id));
  
  // Then delete the group
  await db.delete(permissionGroups).where(eq(permissionGroups.id, id));

  return c.json({ success: true });
});

// Delete a project
permissionRoutes.delete('/projects/:id', async (c) => {
  const id = Number(c.req.param('id'));

  // 1. Get all permission IDs for this project
  const projectPermissions = await db.select({ id: permissions.id })
    .from(permissions)
    .where(eq(permissions.projectId, id));
  const permissionIds = projectPermissions.map(p => p.id);

  // 2. Get all group IDs for this project
  const projectGroups = await db.select({ id: permissionGroups.id })
    .from(permissionGroups)
    .where(eq(permissionGroups.projectId, id));
  const groupIds = projectGroups.map(g => g.id);

  // 3. Delete groupPermissions
  if (groupIds.length > 0) {
     await db.delete(groupPermissions).where(inArray(groupPermissions.groupId, groupIds));
  }
  if (permissionIds.length > 0) {
      await db.delete(groupPermissions).where(inArray(groupPermissions.permissionId, permissionIds));
  }

  // 4. Delete permissions
  await db.delete(permissions).where(eq(permissions.projectId, id));

  // 5. Delete groups
  await db.delete(permissionGroups).where(eq(permissionGroups.projectId, id));

  // 6. Delete project
  await db.delete(projects).where(eq(projects.id, id));

  return c.json({ success: true });
});
