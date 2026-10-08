import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { GalleryImage } from '../../../shared/catalog-data';
import { MediaUpload } from '../dashboard.models';

type GalleryStatusFilter = 'all' | 'active' | 'hidden';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-dashboard-gallery-page',
  styleUrl: './gallery.page.scss',
  templateUrl: './gallery.page.html',
})
export class DashboardGalleryPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly categories = ['Interieurs', 'Abstrait', 'Nature', 'Collections'];
  protected readonly galleryImages = signal<GalleryImage[]>([]);
  protected readonly uploads = signal<MediaUpload[]>([]);
  protected readonly galleryError = signal('');
  protected readonly editingImageId = signal<number | null>(null);
  protected readonly isSavingImage = signal(false);
  protected readonly gallerySearchTerm = signal('');
  protected readonly galleryCategoryFilter = signal('all');
  protected readonly galleryStatusFilter = signal<GalleryStatusFilter>('all');
  protected readonly galleryCurrentPage = signal(1);
  protected readonly galleryPageSize = 10;
  protected readonly galleryForm = this.fb.nonNullable.group({
    src: ['', [Validators.required]],
    alt: ['', [Validators.required, Validators.minLength(2)]],
    category: ['Interieurs', [Validators.required]],
    caption: ['', [Validators.required, Validators.minLength(2)]],
    display_order: [0, [Validators.required, Validators.min(0)]],
    is_active: [true],
  });
  protected readonly galleryCategories = computed(() => [
    'all',
    ...new Set(this.galleryImages().map((image) => image.category)),
  ]);
  protected readonly filteredGalleryImages = computed(() => {
    const query = this.gallerySearchTerm().trim().toLowerCase();
    const category = this.galleryCategoryFilter();
    const status = this.galleryStatusFilter();

    return this.galleryImages().filter((image) => {
      const matchesQuery =
        !query ||
        [image.caption, image.alt, image.category, image.src]
          .join(' ')
          .toLowerCase()
          .includes(query);
      const matchesCategory = category === 'all' || image.category === category;
      const matchesStatus =
        status === 'all' ||
        (status === 'active' && image.is_active) ||
        (status === 'hidden' && !image.is_active);
      return matchesQuery && matchesCategory && matchesStatus;
    });
  });
  protected readonly galleryTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredGalleryImages().length / this.galleryPageSize)),
  );
  protected readonly paginatedGalleryImages = computed(() => {
    const page = Math.min(this.galleryCurrentPage(), this.galleryTotalPages());
    const start = (page - 1) * this.galleryPageSize;
    return this.filteredGalleryImages().slice(start, start + this.galleryPageSize);
  });

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.loadGalleryImages();
    this.loadUploads();
  }

  protected loadGalleryImages(): void {
    this.galleryError.set('');
    this.http.get<GalleryImage[]>('/api/gallery/admin').subscribe({
      next: (images) => this.galleryImages.set(images),
      error: () => this.galleryError.set('Impossible de charger la galerie.'),
    });
  }

  protected loadUploads(): void {
    this.http.get<MediaUpload[]>('/api/uploads').subscribe({
      next: (uploads) => this.uploads.set(uploads),
      error: () => this.uploads.set([]),
    });
  }

  protected startCreateImage(): void {
    this.editingImageId.set(null);
    this.galleryForm.reset({
      src: '',
      alt: '',
      category: 'Interieurs',
      caption: '',
      display_order: 0,
      is_active: true,
    });
  }

  protected startEditImage(image: GalleryImage): void {
    this.editingImageId.set(image.id ?? null);
    this.galleryForm.reset({
      src: image.src,
      alt: image.alt,
      category: image.category,
      caption: image.caption,
      display_order: image.display_order ?? 0,
      is_active: image.is_active ?? true,
    });
  }

  protected useImage(upload: MediaUpload): void {
    if (upload.kind === 'image') {
      this.galleryForm.controls.src.setValue(upload.url);
    }
  }

  protected saveImage(): void {
    if (this.galleryForm.invalid || this.isSavingImage()) {
      this.galleryForm.markAllAsTouched();
      return;
    }

    this.isSavingImage.set(true);
    this.galleryError.set('');
    const payload = this.galleryForm.getRawValue();
    const imageId = this.editingImageId();
    const request = imageId
      ? this.http.patch<GalleryImage>(`/api/gallery/${imageId}`, payload)
      : this.http.post<GalleryImage>('/api/gallery', payload);

    request.subscribe({
      next: () => {
        this.isSavingImage.set(false);
        this.startCreateImage();
        this.loadGalleryImages();
      },
      error: () => {
        this.isSavingImage.set(false);
        this.galleryError.set('Impossible de sauvegarder cette image.');
      },
    });
  }

  protected deleteImage(image: GalleryImage): void {
    if (!image.id) {
      return;
    }
    this.http.delete(`/api/gallery/${image.id}`).subscribe({
      next: () => this.loadGalleryImages(),
      error: () => this.galleryError.set('Impossible de supprimer cette image.'),
    });
  }

  protected updateGallerySearch(event: Event): void {
    this.gallerySearchTerm.set((event.target as HTMLInputElement).value);
    this.galleryCurrentPage.set(1);
  }

  protected updateGalleryCategoryFilter(event: Event): void {
    this.galleryCategoryFilter.set((event.target as HTMLSelectElement).value);
    this.galleryCurrentPage.set(1);
  }

  protected updateGalleryStatusFilter(event: Event): void {
    this.galleryStatusFilter.set((event.target as HTMLSelectElement).value as GalleryStatusFilter);
    this.galleryCurrentPage.set(1);
  }

  protected goToPreviousGalleryPage(): void {
    this.galleryCurrentPage.update((page) => Math.max(1, page - 1));
  }

  protected goToNextGalleryPage(): void {
    this.galleryCurrentPage.update((page) => Math.min(this.galleryTotalPages(), page + 1));
  }
}
