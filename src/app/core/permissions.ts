import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

export interface Permission {
  id: number;
  projectId: number;
  key: string;
  description: string;
}

export interface GroupPermission {
  groupId: number;
  permissionId: number;
  enabled: boolean;
}

export interface PermissionGroup {
  id: number;
  projectId: number;
  name: string;
  groupPermissions: GroupPermission[];
}

export interface Project {
  id: number;
  name: string;
  description: string;
  apiKey: string;
  permissions: Permission[];
  permissionGroups: PermissionGroup[];
}

@Injectable({
  providedIn: 'root'
})
export class PermissionsService {
  private http = inject(HttpClient);
  
  readonly projects = signal<Project[]>([]);

  loadProjects() {
    return this.http.get<Project[]>('/api/projects').pipe(
      tap(projects => this.projects.set(projects))
    );
  }

  addProject(name: string, description: string) {
    return this.http.post<Project>('/api/projects', { name, description }).pipe(
      tap(() => this.loadProjects().subscribe())
    );
  }

  deleteProject(id: number) {
    return this.http.delete(`/api/projects/${id}`).pipe(
      tap(() => this.loadProjects().subscribe())
    );
  }

  addPermissionGroup(projectId: number, name: string) {
    return this.http.post<PermissionGroup>(`/api/projects/${projectId}/groups`, { name }).pipe(
      tap(() => this.loadProjects().subscribe())
    );
  }

  addPermission(projectId: number, key: string, description: string) {
    return this.http.post<Permission>('/api/permissions', { projectId, key, description }).pipe(
      tap(() => this.loadProjects().subscribe())
    );
  }

  updatePermission(id: number, key: string, description: string) {
    return this.http.put<Permission>(`/api/permissions/${id}`, { key, description }).pipe(
      tap(() => this.loadProjects().subscribe())
    );
  }

  deletePermission(id: number) {
    return this.http.delete(`/api/permissions/${id}`).pipe(
      tap(() => this.loadProjects().subscribe())
    );
  }

  deletePermissionGroup(id: number) {
    return this.http.delete(`/api/groups/${id}`).pipe(
      tap(() => this.loadProjects().subscribe())
    );
  }

  updateGroupPermission(groupId: number, permissionId: number, enabled: boolean) {
    return this.http.post(`/api/groups/${groupId}/permissions`, { permissionId, enabled }).pipe(
      tap(() => this.loadProjects().subscribe())
    );
  }
}
