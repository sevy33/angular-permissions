import { Hono } from 'hono';
import { db } from '../../db';
import { projects, permissions, permissionGroups, groupPermissions } from '../../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

export const projectRoutes = new Hono();

// Get all projects with permissions and groups
projectRoutes.get('/projects', async (c) => {
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
projectRoutes.post('/projects', async (c) => {
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

// Delete a project
projectRoutes.delete('/projects/:id', async (c) => {
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
