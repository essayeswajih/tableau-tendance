import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CartService } from '../shared/cart.service';
import type { Product } from '../shared/catalog-data';
import { ProductService } from '../shared/product.service';
import { SettingsService } from '../shared/settings.service';

@Component({
  imports: [RouterLink],
  selector: 'app-article-page',
  styleUrl: './article.page.scss',
  templateUrl: './article.page.html',
})
export class ArticlePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cart = inject(CartService);
  private readonly productService = inject(ProductService);
  protected readonly settingsService = inject(SettingsService);
  protected readonly selectedSlug = signal('');
  protected readonly quantity = signal(1);
  protected readonly products = this.productService.products;
  protected readonly product = computed(() =>
    this.productService.findBySlug(this.selectedSlug()) || this.products()[0],
  );
  protected readonly relatedProducts = computed(() => {
    const product = this.product();
    if (!product) {
      return [];
    }

    return this.products()
      .filter((item) => item.title !== product.title && item.category === product.category)
      .slice(0, 3);
  });
  protected readonly fallbackRelatedProducts = computed(() =>
    this.products()
      .filter((item) => item.title !== this.product()?.title)
      .slice(0, 3),
  );
  protected readonly displayedRelatedProducts = computed(() =>
    this.relatedProducts().length > 0 ? this.relatedProducts() : this.fallbackRelatedProducts(),
  );

  ngOnInit(): void {
    this.settingsService.loadSettings();
    this.productService.loadProducts();
    this.route.paramMap.subscribe((params) => {
      this.selectedSlug.set(params.get('slug') || '');
      this.quantity.set(1);
    });
  }

  protected articlePath(product: Product): string[] {
    return ['/article', this.productService.productSlug(product)];
  }

  protected decreaseQuantity(): void {
    this.quantity.update((value) => Math.max(1, value - 1));
  }

  protected increaseQuantity(): void {
    this.quantity.update((value) => value + 1);
  }

  protected addToCart(product: Product): void {
    if (!this.settingsService.settings().boutique.orders_enabled) {
      return;
    }

    for (let index = 0; index < this.quantity(); index += 1) {
      this.cart.addProduct(product);
    }
  }
}
