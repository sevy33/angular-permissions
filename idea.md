# Idea
I want to create a permissions application for a user to view, add, and update permissions. The layout should work something like this:
- Project/Application
  - list of all permissions
    - permissions should be feature.permission
  - Permission Groups
    - all permissions they have access to

## Example
- Operations Site
  - menu.notification
  - edit.emails

- Basic
  - menu.notification   true
  - edit.emails         false
- Admin
  - menu.notification   true
  - edit.emails         true


# Technology
- A very modern Angular 21 SSR application
  - Should use Hono as the backend
- Postgres database
  - connection localhost, port: 54856, user: postgres, password: Supersecretpass1!
- Drizzle ORM
- I need some type of Authentication, it can be contained within the app/database for now
  - Each user should have a corrisponding permission group
  - You pick which ever is easiest, session-based auth or JWT's
- Angular Material 3, expressive if you can do it.

## Additional Info
- Angular Github: https://github.com/angular/angular
- Hono Github: https://github.com/honojs/hono
- Drizzle Github: https://github.com/drizzle-team/drizzle-orm
