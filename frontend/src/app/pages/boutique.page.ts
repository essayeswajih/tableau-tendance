import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../shared/cart.service';
import type { Product } from '../shared/catalog-data';
import { ProductService } from '../shared/product.service';
import { SettingsService } from '../shared/settings.service';

@Component({
  imports: [RouterLink],
  selector: 'app-boutique-page',
  styleUrl: './boutique.page.scss',
  templateUrl: './boutique.page.html',
})
export class BoutiquePage implements OnInit {
  private readonly cart = inject(CartService);
  private readonly productService = inject(ProductService);
  protected readonly settingsService = inject(SettingsService);
  private readonly pageSize = 6;

  protected readonly selectedCategory = signal('Tous');
  protected readonly searchTerm = signal('');
  protected readonly sortMode = signal('selection');
  protected readonly products = this.productService.products;
  protected readonly categories = computed(() => [
    'Tous',
    ...new Set(this.products().map((product) => product.category)),
  ]);
  protected readonly currentPage = signal(1);
  protected readonly filteredProducts = computed(() => {
    const category = this.selectedCategory();
    const query = this.searchTerm().trim().toLowerCase();
    return this.products().filter((product) => {
      const matchesCategory = category === 'Tous' || product.category === category;
      const matchesQuery =
        !query ||
        [product.title, product.category, product.price, product.badge || '']
          .join(' ')
          .toLowerCase()
          .includes(query);
      return matchesCategory && matchesQuery;
    });
  });
  protected readonly sortedProducts = computed(() => {
    const products = [...this.filteredProducts()];
    switch (this.sortMode()) {
      case 'price-asc':
        return products.sort((a, b) => this.priceValue(a.price) - this.priceValue(b.price));
      case 'new':
        return products.sort((a, b) => Number(Boolean(b.badge)) - Number(Boolean(a.badge)));
      default:
        return products;
    }
  });
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.sortedProducts().length / this.pageSize)),
  );
  protected readonly pages = computed(() =>
    Array.from({ length: this.pageCount() }, (_, index) => index + 1),
  );
  protected readonly paginatedProducts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.sortedProducts().slice(start, start + this.pageSize);
  });
  protected readonly firstProductIndex = computed(() => (this.currentPage() - 1) * this.pageSize + 1);
  protected readonly lastProductIndex = computed(() =>
    Math.min(this.currentPage() * this.pageSize, this.filteredProducts().length),
  );

  ngOnInit(): void {
    this.settingsService.loadSettings();
    this.productService.loadProducts();
  }

  protected goToPage(page: number): void {
    if (page < 1 || page > this.pageCount()) {
      return;
    }

    this.currentPage.set(page);
  }

  protected addToCart(product: Product): void {
    if (!this.settingsService.settings().boutique.orders_enabled) {
      return;
    }
    this.cart.addProduct(product);
  }

  protected articlePath(product: Product): string[] {
    return ['/article', this.productService.productSlug(product)];
  }

  protected selectCategory(category: string): void {
    this.selectedCategory.set(category);
    this.currentPage.set(1);
  }

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  protected updateSort(event: Event): void {
    this.sortMode.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  private priceValue(price: string): number {
    return Number(price.match(/\d+/)?.[0] || 0);
  }
}
