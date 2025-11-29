import { db } from './index';
import { projects, permissions, permissionGroups, groupPermissions, users } from './schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

async function seed() {
  console.log('Seeding database...');

  // 1. Create Project
  const [project] = await db.insert(projects).values({
    name: 'Operations Site',
    description: 'Main operations dashboard',
    apiKey: randomUUID(),
  }).returning();

  console.log('Created Project:', project.name);

  // 2. Create Permissions
  const [permNotification] = await db.insert(permissions).values({
    projectId: project.id,
    key: 'menu.notification',
    description: 'Access to notifications menu',
  }).returning();

  const [permEmails] = await db.insert(permissions).values({
    projectId: project.id,
    key: 'edit.emails',
    description: 'Ability to edit emails',
  }).returning();

  console.log('Created Permissions');

  // 3. Create Groups
  const [groupBasic] = await db.insert(permissionGroups).values({
    projectId: project.id,
    name: 'Basic',
  }).returning();

  const [groupAdmin] = await db.insert(permissionGroups).values({
    projectId: project.id,
    name: 'Admin',
  }).returning();

  console.log('Created Groups');

  // 4. Assign Permissions to Groups
  // Basic: menu.notification=true, edit.emails=false
  await db.insert(groupPermissions).values([
    { groupId: groupBasic.id, permissionId: permNotification.id, enabled: true },
    { groupId: groupBasic.id, permissionId: permEmails.id, enabled: false },
  ]);

  // Admin: menu.notification=true, edit.emails=true
  await db.insert(groupPermissions).values([
    { groupId: groupAdmin.id, permissionId: permNotification.id, enabled: true },
    { groupId: groupAdmin.id, permissionId: permEmails.id, enabled: true },
  ]);

  console.log('Assigned Permissions');

  // 5. Create Users (Optional but good for testing)
  await db.insert(users).values([
    { username: 'admin', password: 'password', permissionGroupId: groupAdmin.id },
    { username: 'user', password: 'password', permissionGroupId: groupBasic.id },
  ]);

  console.log('Created Users');
  console.log('Seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
