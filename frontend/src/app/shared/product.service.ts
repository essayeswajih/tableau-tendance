import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { products as fallbackProducts, type Product } from './catalog-data';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly productsSignal = signal<Product[]>(fallbackProducts);

  readonly products = this.productsSignal.asReadonly();

  constructor(private readonly http: HttpClient) {}

  loadProducts(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.http.get<Product[]>('/api/products').subscribe({
      next: (products) => this.productsSignal.set(products.length > 0 ? products : fallbackProducts),
      error: () => this.productsSignal.set(fallbackProducts),
    });
  }

  productSlug(product: Product): string {
    return this.normalizeSlug(product.slug || product.title);
  }

  findBySlug(slug: string): Product | undefined {
    const normalizedSlug = this.normalizeSlug(slug);
    return this.productsSignal().find((product) => this.productSlug(product) === normalizedSlug);
  }

  private normalizeSlug(value: string): string {
    const slug = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return slug.startsWith('tableau-') ? slug : `tableau-${slug || 'article'}`;
  }
}
