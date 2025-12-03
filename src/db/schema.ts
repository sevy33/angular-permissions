import { pgTable, serial, text, boolean, primaryKey, integer, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  apiKey: text('api_key').notNull().unique(),
});

export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id).notNull(),
  key: text('key').notNull(), // e.g. feature.permission
  description: text('description'),
}, (t) => ({
  uniqueKeyPerProject: unique().on(t.projectId, t.key),
}));

export const permissionGroups = pgTable('permission_groups', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id).notNull(),
  name: text('name').notNull(),
}, (t) => ({
  uniqueNamePerProject: unique().on(t.projectId, t.name),
}));

export const groupPermissions = pgTable('group_permissions', {
  groupId: integer('group_id').references(() => permissionGroups.id).notNull(),
  permissionId: integer('permission_id').references(() => permissions.id).notNull(),
  enabled: boolean('enabled').default(false).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.groupId, t.permissionId] }),
}));

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').unique().notNull(),
  password: text('password').notNull(),
  permissionGroupId: integer('permission_group_id').references(() => permissionGroups.id),
});

// Relations
export const projectsRelations = relations(projects, ({ many }) => ({
  permissions: many(permissions),
  permissionGroups: many(permissionGroups),
}));

export const permissionsRelations = relations(permissions, ({ one, many }) => ({
  project: one(projects, {
    fields: [permissions.projectId],
    references: [projects.id],
  }),
  groupPermissions: many(groupPermissions),
}));

export const permissionGroupsRelations = relations(permissionGroups, ({ one, many }) => ({
  project: one(projects, {
    fields: [permissionGroups.projectId],
    references: [projects.id],
  }),
  groupPermissions: many(groupPermissions),
  users: many(users),
}));

export const groupPermissionsRelations = relations(groupPermissions, ({ one }) => ({
  group: one(permissionGroups, {
    fields: [groupPermissions.groupId],
    references: [permissionGroups.id],
  }),
  permission: one(permissions, {
    fields: [groupPermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  permissionGroup: one(permissionGroups, {
    fields: [users.permissionGroupId],
    references: [permissionGroups.id],
  }),
}));
