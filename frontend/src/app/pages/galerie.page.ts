import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import type { GalleryImage } from '../shared/catalog-data';
import { GalleryService } from '../shared/gallery.service';

type GalleryCategory = 'Tous' | 'Interieurs' | 'Abstrait' | 'Nature' | 'Collections';

@Component({
  selector: 'app-galerie-page',
  styleUrl: './galerie.page.scss',
  templateUrl: './galerie.page.html',
})
export class GaleriePage implements OnInit {
  private readonly galleryService = inject(GalleryService);
  protected readonly categories: GalleryCategory[] = ['Tous', 'Interieurs', 'Abstrait', 'Nature', 'Collections'];
  protected readonly selectedCategory = signal<GalleryCategory>('Tous');
  protected readonly gallery = this.galleryService.images;
  protected readonly selectedImage = signal<GalleryImage | null>(null);

  protected readonly filteredGallery = computed(() => {
    const category = this.selectedCategory();
    return category === 'Tous'
      ? this.gallery()
      : this.gallery().filter((image) => image.category === category);
  });

  constructor() {
    effect(() => {
      if (!this.selectedImage() && this.filteredGallery().length > 0) {
        this.selectedImage.set(this.filteredGallery()[0]);
      }
    });
  }

  ngOnInit(): void {
    this.galleryService.loadGallery();
  }

  protected selectCategory(category: GalleryCategory): void {
    this.selectedCategory.set(category);
    this.selectedImage.set(this.filteredGallery()[0] || null);
  }

  protected selectImage(image: GalleryImage): void {
    this.selectedImage.set(image);
  }
}
