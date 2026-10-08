import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { gallery, type GalleryImage } from './catalog-data';

@Injectable({ providedIn: 'root' })
export class GalleryService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly imagesSignal = signal<GalleryImage[]>(gallery);

  readonly images = this.imagesSignal.asReadonly();

  constructor(private readonly http: HttpClient) {}

  loadGallery(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.http.get<GalleryImage[]>('/api/gallery').subscribe({
      next: (images) => this.imagesSignal.set(images.length > 0 ? images : gallery),
      error: () => this.imagesSignal.set(gallery),
    });
  }
}
