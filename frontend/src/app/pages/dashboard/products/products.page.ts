import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Product } from '../../../shared/catalog-data';
import { MediaUpload } from '../dashboard.models';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-dashboard-products-page',
  styleUrl: './products.page.scss',
  templateUrl: './products.page.html',
})
export class DashboardProductsPage implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly fb = inject(FormBuilder);
  protected readonly products = signal<Product[]>([]);
  protected readonly uploads = signal<MediaUpload[]>([]);
  protected readonly productsError = signal('');
  protected readonly productsNotice = signal('');
  protected readonly editingProductId = signal<number | null>(null);
  protected readonly isSavingProduct = signal(false);
  protected readonly productSearchTerm = signal('');
  protected readonly productCategoryFilter = signal('all');
  protected readonly productStatusFilter = signal<'all' | 'active' | 'hidden'>('all');
  protected readonly productBadgeFilter = signal('all');
  protected readonly productCurrentPage = signal(1);
  protected readonly productPageSize = 10;
  protected readonly productForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    slug: [''],
    category: ['', [Validators.required]],
    price: ['', [Validators.required]],
    image: ['', [Validators.required]],
    badge: [''],
    is_active: [true],
  });
  protected readonly productCategories = computed(() => [
    'all',
    ...new Set(this.products().map((product) => product.category)),
  ]);
  protected readonly productBadges = computed(() => [
    'all',
    ...new Set(
      this.products()
        .map((product) => product.badge)
        .filter((badge): badge is string => Boolean(badge)),
    ),
  ]);
  protected readonly filteredProducts = computed(() => {
    const query = this.productSearchTerm().trim().toLowerCase();
    const category = this.productCategoryFilter();
    const status = this.productStatusFilter();
    const badge = this.productBadgeFilter();

    return this.products().filter((product) => {
      const matchesQuery =
        !query ||
        [product.title, product.slug || '', product.category, product.price, product.badge || '', product.image]
          .join(' ')
          .toLowerCase()
          .includes(query);
      const matchesCategory = category === 'all' || product.category === category;
      const matchesStatus =
        status === 'all' ||
        (status === 'active' && product.is_active) ||
        (status === 'hidden' && !product.is_active);
      const matchesBadge = badge === 'all' || product.badge === badge;
      return matchesQuery && matchesCategory && matchesStatus && matchesBadge;
    });
  });
  protected readonly productTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredProducts().length / this.productPageSize)),
  );
  protected readonly paginatedProducts = computed(() => {
    const page = Math.min(this.productCurrentPage(), this.productTotalPages());
    const start = (page - 1) * this.productPageSize;
    return this.filteredProducts().slice(start, start + this.productPageSize);
  });

  constructor(
    private readonly http: HttpClient,
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.loadProducts();
    this.loadUploads();
  }

  protected loadProducts(): void {
    this.productsError.set('');
    this.http.get<Product[]>('/api/products/admin').subscribe({
      next: (products) => this.products.set(products),
      error: () => this.productsError.set('Impossible de charger les produits.'),
    });
  }

  protected loadUploads(): void {
    this.http.get<MediaUpload[]>('/api/uploads').subscribe({
      next: (uploads) => this.uploads.set(uploads),
      error: () => this.uploads.set([]),
    });
  }

  protected startCreateProduct(): void {
    this.editingProductId.set(null);
    this.productsNotice.set('');
    this.productForm.reset({
      title: '',
      slug: '',
      category: '',
      price: '',
      image: '',
      badge: '',
      is_active: true,
    });
  }

  protected startEditProduct(product: Product): void {
    this.editingProductId.set(product.id ?? null);
    this.productsNotice.set(`Modification de ${product.title}. Vous pouvez changer le slug avant de sauvegarder.`);
    this.productForm.reset({
      title: product.title,
      slug: product.slug || this.slugFromTitle(product.title),
      category: product.category,
      price: product.price,
      image: product.image,
      badge: product.badge || '',
      is_active: product.is_active ?? true,
    });
  }

  protected useImageForProduct(upload: MediaUpload): void {
    if (upload.kind === 'image') {
      this.productForm.controls.image.setValue(upload.url);
    }
  }

  protected saveProduct(): void {
    if (this.productForm.invalid || this.isSavingProduct()) {
      this.productForm.markAllAsTouched();
      return;
    }

    this.isSavingProduct.set(true);
    this.productsError.set('');
    this.productsNotice.set('');
    const requestedSlug = this.normalizeSlug(this.productForm.getRawValue().slug || this.productForm.getRawValue().title);
    const payload = {
      ...this.productForm.getRawValue(),
      slug: requestedSlug,
      badge: this.productForm.getRawValue().badge || null,
    };
    const productId = this.editingProductId();
    const request = productId
      ? this.http.patch<Product>(`/api/products/${productId}`, payload)
      : this.http.post<Product>('/api/products', payload);

    request.subscribe({
      next: (savedProduct) => {
        this.isSavingProduct.set(false);
        this.products.update((products) => {
          const index = products.findIndex((product) => product.id === savedProduct.id);
          if (index === -1) {
            return [savedProduct, ...products];
          }
          return products.map((product) => (product.id === savedProduct.id ? savedProduct : product));
        });
        this.startCreateProduct();
        if (savedProduct.slug && savedProduct.slug !== requestedSlug) {
          this.productsNotice.set(`Le slug existe deja. Nouveau slug utilise : ${savedProduct.slug}`);
        } else {
          this.productsNotice.set(`Produit sauvegarde avec le slug : ${savedProduct.slug || requestedSlug}`);
        }
        this.loadProducts();
      },
      error: () => {
        this.isSavingProduct.set(false);
        this.productsError.set('Impossible de sauvegarder ce produit.');
      },
    });
  }

  protected deleteProduct(product: Product): void {
    if (!product.id) {
      return;
    }
    this.http.delete(`/api/products/${product.id}`).subscribe({
      next: () => this.loadProducts(),
      error: () => this.productsError.set('Impossible de supprimer ce produit.'),
    });
  }

  protected updateProductSearch(event: Event): void {
    this.productSearchTerm.set((event.target as HTMLInputElement).value);
    this.productCurrentPage.set(1);
  }

  protected updateProductCategoryFilter(event: Event): void {
    this.productCategoryFilter.set((event.target as HTMLSelectElement).value);
    this.productCurrentPage.set(1);
  }

  protected updateProductStatusFilter(event: Event): void {
    this.productStatusFilter.set(
      (event.target as HTMLSelectElement).value as 'all' | 'active' | 'hidden',
    );
    this.productCurrentPage.set(1);
  }

  protected updateProductBadgeFilter(event: Event): void {
    this.productBadgeFilter.set((event.target as HTMLSelectElement).value);
    this.productCurrentPage.set(1);
  }

  protected goToPreviousProductPage(): void {
    this.productCurrentPage.update((page) => Math.max(1, page - 1));
  }

  protected goToNextProductPage(): void {
    this.productCurrentPage.update((page) => Math.min(this.productTotalPages(), page + 1));
  }

  protected updateProductTitle(event: Event): void {
    const title = (event.target as HTMLInputElement).value;
    if (!this.editingProductId()) {
      this.productForm.controls.slug.setValue(this.slugFromTitle(title));
    }
  }

  protected updateProductSlug(event: Event): void {
    this.productForm.controls.slug.setValue(this.normalizeSlug((event.target as HTMLInputElement).value));
  }

  protected previewSlug(): string {
    return this.normalizeSlug(this.productForm.getRawValue().slug || this.productForm.getRawValue().title);
  }

  private slugFromTitle(title: string): string {
    return this.normalizeSlug(title);
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
