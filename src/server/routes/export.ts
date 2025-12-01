import { Hono } from 'hono';
import { db } from '../../db';
import { projects, permissions, groupPermissions, permissionGroups } from '../../db/schema';
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
      permissions: {
        columns: {
          id: true,
          key: true,
          description: true
        }
      },
      permissionGroups: {
        columns: {
          id: true,
          name: true
        },
        with: {
          groupPermissions: {
            columns: {
              permissionId: true,
              enabled: true
            }
          }
        }
      }
    }
  });
  
  const transformed = result.map(project => ({
    id: project.id,
    name: project.name,
    description: project.description,
    apiKey: project.apiKey,
    permissionGroups: project.permissionGroups.map(group => {
      // Map all project permissions to this group
      const permissions = project.permissions.map(perm => {
        const gp = group.groupPermissions.find(p => p.permissionId === perm.id);
        return {
          key: perm.key,
          description: perm.description,
          enabled: gp ? gp.enabled : false
        };
      });

      return {
        id: group.id,
        name: group.name,
        permissions
      };
    })
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
      permissions: {
        columns: {
          id: true,
          key: true,
          description: true
        }
      },
      permissionGroups: {
        columns: {
          id: true,
          name: true
        },
        with: {
          groupPermissions: {
            columns: {
              permissionId: true,
              enabled: true
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
    id: project.id,
    name: project.name,
    description: project.description,
    apiKey: project.apiKey,
    permissionGroups: project.permissionGroups.map(group => {
      const permissions = project.permissions.map(perm => {
        const gp = group.groupPermissions.find(p => p.permissionId === perm.id);
        return {
          key: perm.key,
          description: perm.description,
          enabled: gp ? gp.enabled : false
        };
      });

      return {
        id: group.id,
        name: group.name,
        permissions
      };
    })
  };

  return c.json(transformed);
});

// Get permissions for a specific group in a project
exportRoutes.get('/project/:apiKey/group/:groupName', async (c) => {
  const apiKey = c.req.param('apiKey');
  const groupName = c.req.param('groupName');

  const project = await db.query.projects.findFirst({
    where: eq(projects.apiKey, apiKey),
    columns: {
      id: true
    },
    with: {
      permissions: {
        columns: {
          id: true,
          key: true
        }
      },
      permissionGroups: {
        where: eq(permissionGroups.name, groupName),
        columns: {
          id: true,
          name: true
        },
        with: {
          groupPermissions: {
            columns: {
              permissionId: true,
              enabled: true
            }
          }
        }
      }
    }
  });

  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }

  const group = project.permissionGroups[0];

  if (!group) {
    return c.json({ error: 'Group not found' }, 404);
  }

  const result = project.permissions.reduce((acc, perm) => {
    const gp = group.groupPermissions.find(p => p.permissionId === perm.id);
    acc[perm.key] = gp ? gp.enabled : false;
    return acc;
  }, {} as Record<string, boolean>);

  return c.json(result);
});
