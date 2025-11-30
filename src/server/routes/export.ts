import { Hono } from 'hono';
import { db } from '../../db';
import { projects, groupPermissions } from '../../db/schema';
import { eq } from 'drizzle-orm';

export const exportRoutes = new Hono();

// Get all projects with groups and their permissions
exportRoutes.get('/all', async (c) => {
  const result = await db.query.projects.findMany({
    columns: {
      id: true,
      name: true,
      description: true,
      apiKey: true
    },
    with: {
      permissionGroups: {
        columns: {
          id: true,
          name: true
        },
        with: {
          groupPermissions: {
            where: eq(groupPermissions.enabled, true),
            columns: {
              enabled: true
            },
            with: {
              permission: {
                columns: {
                  key: true,
                  description: true
                }
              }
            }
          }
        }
      }
    }
  });
  
  // Transform the result to be cleaner if needed, or return as is.
  // The structure will be:
  // [
  //   {
  //     ...project,
  //     permissionGroups: [
  //       {
  //         ...group,
  //         groupPermissions: [
  //           { enabled: true, permission: { key: '...', description: '...' } }
  //         ]
  //       }
  //     ]
  //   }
  // ]
  
  // Let's flatten the permissions array for easier consumption
  const transformed = result.map(project => ({
    ...project,
    permissionGroups: project.permissionGroups.map(group => ({
      ...group,
      permissions: group.groupPermissions.map(gp => gp.permission)
    }))
  }));

  return c.json(transformed);
});

// Get single project by API Key
exportRoutes.get('/project/:apiKey', async (c) => {
  const apiKey = c.req.param('apiKey');

  const project = await db.query.projects.findFirst({
    where: eq(projects.apiKey, apiKey),
    columns: {
      id: true,
      name: true,
      description: true,
      apiKey: true
    },
    with: {
      permissionGroups: {
        columns: {
          id: true,
          name: true
        },
        with: {
          groupPermissions: {
            where: eq(groupPermissions.enabled, true),
            columns: {
              enabled: true
            },
            with: {
              permission: {
                columns: {
                  key: true,
                  description: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }

  const transformed = {
    ...project,
    permissionGroups: project.permissionGroups.map(group => ({
      ...group,
      permissions: group.groupPermissions.map(gp => gp.permission)
    }))
  };

  return c.json(transformed);
});
