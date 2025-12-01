import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login';
import { PermissionsComponent } from './features/permissions/permissions';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'project/:projectId', component: PermissionsComponent },
  { path: '', component: PermissionsComponent },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];
