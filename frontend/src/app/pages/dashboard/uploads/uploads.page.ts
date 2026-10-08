import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { MediaUpload } from '../dashboard.models';

@Component({
  selector: 'app-dashboard-uploads-page',
  styleUrl: './uploads.page.scss',
  templateUrl: './uploads.page.html',
})
export class DashboardUploadsPage implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly uploads = signal<MediaUpload[]>([]);
  protected readonly uploadFile = signal<File | null>(null);
  protected readonly isUploading = signal(false);
  protected readonly uploadsError = signal('');

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.loadUploads();
  }

  protected loadUploads(): void {
    this.uploadsError.set('');
    this.http.get<MediaUpload[]>('/api/uploads').subscribe({
      next: (uploads) => this.uploads.set(uploads),
      error: () => this.uploadsError.set('Impossible de charger les medias.'),
    });
  }

  protected formatFileSize(size: number): string {
    if (size < 1024) {
      return `${size} B`;
    }
    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected selectUploadFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.uploadFile.set(input.files?.[0] || null);
  }

  protected uploadSelectedFile(): void {
    const file = this.uploadFile();
    if (!file || this.isUploading()) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    this.isUploading.set(true);
    this.uploadsError.set('');

    this.http.post<MediaUpload>('/api/uploads', formData).subscribe({
      next: (upload) => {
        this.uploads.update((uploads) => [upload, ...uploads]);
        this.uploadFile.set(null);
        this.isUploading.set(false);
      },
      error: () => {
        this.uploadsError.set('Impossible d uploader ce fichier.');
        this.isUploading.set(false);
      },
    });
  }

  protected deleteUpload(upload: MediaUpload): void {
    this.http.delete(`/api/uploads/${upload.filename}`).subscribe({
      next: () =>
        this.uploads.update((uploads) =>
          uploads.filter((item) => item.filename !== upload.filename),
        ),
      error: () => this.uploadsError.set('Impossible de supprimer ce fichier.'),
    });
  }

  protected renameUpload(upload: MediaUpload): void {
    const nextName = window.prompt('Nouveau nom du fichier', upload.filename)?.trim();
    if (!nextName || nextName === upload.filename) {
      return;
    }

    this.http
      .patch<MediaUpload>(`/api/uploads/${upload.filename}/rename`, {
        filename: nextName,
      })
      .subscribe({
        next: (renamedUpload) => {
          this.uploads.update((uploads) =>
            uploads.map((item) => (item.filename === upload.filename ? renamedUpload : item)),
          );
        },
        error: () => this.uploadsError.set('Impossible de renommer ce fichier.'),
      });
  }
}
