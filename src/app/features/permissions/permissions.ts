import { Component, inject, signal, computed, afterNextRender, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PermissionsService, Project, Permission } from '../../core/permissions';
import { AuthService } from '../../core/auth';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BulkUploadComponent } from '../bulk-upload/bulk-upload';

@Component({
  selector: 'app-permissions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatSidenavModule,
    MatListModule,
    MatTabsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatTableModule,
    MatCardModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './permissions.html',
  styleUrl: './permissions.scss'
})
export class PermissionsComponent {
  private permissionsService = inject(PermissionsService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  protected projects = this.permissionsService.projects;

  // Route param input
  projectId = input<string>();

  protected selectedProjectId = computed(() => {
    const id = this.projectId();
    return id ? Number(id) : null;
  });
  
  protected selectedProject = computed(() => 
    this.projects().find(p => p.id === this.selectedProjectId())
  );

  // State for adding new project
  protected showAddProject = signal(false);
  protected newProjectName = signal('');
  protected newProjectDesc = signal('');

  // Simple state for adding new permission
  protected newPermissionKey = signal('');
  protected newPermissionDesc = signal('');

  // State for adding new group
  protected newGroupName = signal('');

  // State for editing
  protected editingPermissionId = signal<number | null>(null);
  protected editPermissionKey = signal('');
  protected editPermissionDesc = signal('');

  constructor() {
    afterNextRender(() => {
      this.permissionsService.loadProjects().subscribe();
      // Ensure user is authenticated
      this.authService.me().subscribe({
        error: () => this.router.navigate(['/login'])
      });
    });
  }

  selectProject(id: number) {
    this.router.navigate(['/project', id]);
    // Reset other states
    this.newPermissionKey.set('');
    this.newPermissionDesc.set('');
    this.newGroupName.set('');
    this.cancelEdit();
  }

  logout() {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }

  addProject() {
    if (!this.newProjectName()) return;
    
    this.permissionsService.addProject(this.newProjectName(), this.newProjectDesc())
      .subscribe(() => {
        this.newProjectName.set('');
        this.newProjectDesc.set('');
        this.showAddProject.set(false);
      });
  }

  deleteProject(id: number) {
    if (confirm('Are you sure you want to delete this project? This will delete all associated permissions and groups.')) {
      this.permissionsService.deleteProject(id).subscribe(() => {
        if (this.selectedProjectId() === id) {
          this.router.navigate(['/']);
        }
      });
    }
  }

  openBulkUploadDialog(projectId: number) {
    const dialogRef = this.dialog.open(BulkUploadComponent, {
      width: '800px',
      data: { projectId }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.permissionsService.loadProjects().subscribe();
      }
    });
  }

  addPermission(projectId: number) {
    if (!this.newPermissionKey()) return;
    
    this.permissionsService.addPermission(projectId, this.newPermissionKey(), this.newPermissionDesc())
      .subscribe({
        next: () => {
          this.newPermissionKey.set('');
          this.newPermissionDesc.set('');
        },
        error: (err) => {
          this.snackBar.open(err.error?.error || 'Failed to add permission', 'Close', { duration: 3000 });
        }
      });
  }

  addGroup(projectId: number) {
    if (!this.newGroupName()) return;

    this.permissionsService.addPermissionGroup(projectId, this.newGroupName())
      .subscribe({
        next: () => {
          this.newGroupName.set('');
        },
        error: (err) => {
          this.snackBar.open(err.error?.error || 'Failed to add group', 'Close', { duration: 3000 });
        }
      });
  }

  deleteGroup(groupId: number) {
    if (confirm('Are you sure you want to delete this group?')) {
      this.permissionsService.deletePermissionGroup(groupId).subscribe();
    }
  }

  deletePermission(permissionId: number) {
    if (confirm('Are you sure you want to delete this permission?')) {
      this.permissionsService.deletePermission(permissionId).subscribe();
    }
  }

  startEdit(perm: Permission) {
    this.editingPermissionId.set(perm.id);
    this.editPermissionKey.set(perm.key);
    this.editPermissionDesc.set(perm.description);
  }

  cancelEdit() {
    this.editingPermissionId.set(null);
    this.editPermissionKey.set('');
    this.editPermissionDesc.set('');
  }

  saveEdit(id: number) {
    this.permissionsService.updatePermission(id, this.editPermissionKey(), this.editPermissionDesc())
      .subscribe(() => {
        this.cancelEdit();
      });
  }

  toggleGroupPermission(groupId: number, permissionId: number, event: any) {
    this.permissionsService.updateGroupPermission(groupId, permissionId, event.checked).subscribe();
  }

  isPermissionEnabled(group: any, permissionId: number): boolean {
    return group.groupPermissions.find((gp: any) => gp.permissionId === permissionId)?.enabled ?? false;
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.snackBar.open('Copied to clipboard!', 'Close', {
        duration: 2000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
    });
  }

  async exportToExcel() {
    const projects = this.projects();
    const data: any[] = [];

    projects.forEach(project => {
      // If project has no permissions, add a row with just project info
      if (!project.permissions || project.permissions.length === 0) {
        data.push({
          'Project Name': project.name,
          'Project Description': project.description,
          'Permission Key': '',
          'Permission Description': '',
          'Group Name': '',
          'Enabled': ''
        });
        return;
      }

      project.permissions.forEach(perm => {
        // Check if this permission is assigned to any group
        let assignedToGroup = false;

        if (project.permissionGroups && project.permissionGroups.length > 0) {
          project.permissionGroups.forEach(group => {
            const groupPerm = group.groupPermissions.find(gp => gp.permissionId === perm.id);
            if (groupPerm) {
              assignedToGroup = true;
              data.push({
                'Project Name': project.name,
                'Project Description': project.description,
                'Permission Key': perm.key,
                'Permission Description': perm.description,
                'Group Name': group.name,
                'Enabled': groupPerm.enabled ? 'Yes' : 'No'
              });
            }
          });
        }

        // If permission is not assigned to any group, add it with empty group info
        if (!assignedToGroup) {
          data.push({
            'Project Name': project.name,
            'Project Description': project.description,
            'Permission Key': perm.key,
            'Permission Description': perm.description,
            'Group Name': '',
            'Enabled': ''
          });
        }
      });
    });

    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Permissions');
    XLSX.writeFile(wb, 'permissions_export.xlsx');
  }
}
