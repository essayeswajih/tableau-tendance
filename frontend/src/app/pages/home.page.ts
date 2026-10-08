import { isPlatformBrowser } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, PLATFORM_ID, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { register } from 'swiper/element/bundle';
import { CartService } from '../shared/cart.service';
import type { Product } from '../shared/catalog-data';
import { CollectionService } from '../shared/collection.service';
import { ProductService } from '../shared/product.service';
import { SettingsService } from '../shared/settings.service';

@Component({
  imports: [RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-home-page',
  styleUrl: './home.page.scss',
  templateUrl: './home.page.html',
})
export class HomePage implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cart = inject(CartService);
  private readonly productService = inject(ProductService);
  private readonly collectionService = inject(CollectionService);
  protected readonly settingsService = inject(SettingsService);

  protected readonly services = computed(() => this.collectionService.collections().slice(0, 6));
  protected readonly products = computed(() => this.productService.products().slice(0, 4));
  protected readonly heroSlides = [
    {
      image: '/uploads/tableau-hero.png',
      alt: 'Salon premium avec tableau decoratif',
    },
    {
      image: '/uploads/tableau-paysage.png',
      alt: 'Tableau paysage moderne dans un interieur lumineux',
    },
    {
      image: '/uploads/tableau-pack-4.png',
      alt: 'Pack de tableaux decoratifs coordonnes',
    },
  ];

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      register();
    }

    this.settingsService.loadSettings();
    this.collectionService.loadCollections();
    this.productService.loadProducts();
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
}
