import { Component, inject, signal, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';

interface UploadItem {
  key: string;
  description: string;
  group?: string;
}

@Component({
  selector: 'app-bulk-upload',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './bulk-upload.html',
  styles: [`
    .bulk-upload-container {
      padding: 20px;
      max-width: 800px;
    }
    .actions {
      margin-bottom: 20px;
    }
    .upload-area {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
      padding: 20px;
      border: 2px dashed #ccc;
      border-radius: 4px;
    }
    .preview-table {
      margin-top: 20px;
      max-height: 400px;
      overflow: auto;
    }
    table {
      width: 100%;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BulkUploadComponent {
  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<BulkUploadComponent>);
  
  constructor(@Inject(MAT_DIALOG_DATA) public data: { projectId: number }) {}

  selectedFile = signal<File | null>(null);
  previewData = signal<UploadItem[]>([]);
  displayedColumns: string[] = ['key', 'description', 'group'];
  isUploading = signal(false);

  async downloadTemplate() {
    const data = [
      { 'Permission Key': 'feature.read', 'Permission Description': 'Read access to feature', 'Group Name': 'User' },
      { 'Permission Key': 'feature.write', 'Permission Description': 'Write access to feature', 'Group Name': 'Admin' }
    ];
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'permissions_template.xlsx');
  }

  onFileChange(event: any) {
    const target: DataTransfer = <DataTransfer>(event.target);
    if (target.files.length !== 1) throw new Error('Cannot use multiple files');
    
    this.selectedFile.set(target.files[0]);
    const reader: FileReader = new FileReader();
    
    reader.onload = async (e: any) => {
      const bstr: string = e.target.result;
      const XLSX = await import('xlsx');
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname: string = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      const items = data.map((row: any) => ({
        key: row['Permission Key'],
        description: row['Permission Description'],
        group: row['Group Name']
      })).filter((item: any) => item.key); // Filter out empty rows

      this.previewData.set(items);
    };
    
    const file = this.selectedFile();
    if (file) {
      reader.readAsBinaryString(file);
    }
  }

  upload() {
    if (!this.data.projectId || !this.previewData().length) return;

    this.isUploading.set(true);
    this.http.post(`/api/projects/${this.data.projectId}/bulk-import`, { items: this.previewData() })
      .subscribe({
        next: (res: any) => {
          this.snackBar.open(`Imported: ${res.permissionsCreated} permissions, ${res.groupsCreated} groups`, 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.isUploading.set(false);
          this.snackBar.open('Upload failed: ' + (err.error?.error || err.message), 'Close', { duration: 5000 });
        }
      });
  }

  cancel() {
    this.dialogRef.close();
  }
}
