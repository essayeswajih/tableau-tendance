import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import type { Product } from './catalog-data';
import { SettingsService } from './settings.service';

export type CartItem = {
  title: string;
  category: string;
  image: string;
  unitPrice: number;
  quantity: number;
};

const CART_STORAGE_KEY = 'tableau-tendance-cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly settings = inject(SettingsService);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly itemsSignal = signal<CartItem[]>(this.readStoredItems());

  readonly items = this.itemsSignal.asReadonly();
  readonly itemCount = computed(() =>
    this.itemsSignal().reduce((total, item) => total + item.quantity, 0),
  );
  readonly subtotal = computed(() =>
    this.itemsSignal().reduce((total, item) => total + item.unitPrice * item.quantity, 0),
  );
  readonly deliveryFee = computed(() => {
    if (this.itemsSignal().length === 0) {
      return 0;
    }
    const subtotal = this.subtotal();
    const boutique = this.settings.settings().boutique;
    if (boutique.free_delivery_threshold > 0 && subtotal >= boutique.free_delivery_threshold) {
      return 0;
    }
    return boutique.delivery_fee;
  });
  readonly total = computed(() => this.subtotal() + this.deliveryFee());

  addProduct(product: Product): void {
    const unitPrice = this.parsePrice(product.price);

    this.updateItems((items) => {
      const existingItem = items.find((item) => item.title === product.title);

      if (existingItem) {
        return items.map((item) =>
          item.title === product.title ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [
        ...items,
        {
          title: product.title,
          category: product.category,
          image: product.image,
          unitPrice,
          quantity: 1,
        },
      ];
    });
  }

  decreaseQuantity(title: string): void {
    this.updateItems((items) =>
      items.map((item) =>
        item.title === title ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item,
      ),
    );
  }

  increaseQuantity(title: string): void {
    this.updateItems((items) =>
      items.map((item) =>
        item.title === title ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
  }

  removeItem(title: string): void {
    this.updateItems((items) => items.filter((item) => item.title !== title));
  }

  clear(): void {
    this.updateItems(() => []);
  }

  private updateItems(updater: (items: CartItem[]) => CartItem[]): void {
    const nextItems = updater(this.itemsSignal());
    this.itemsSignal.set(nextItems);
    this.storeItems(nextItems);
  }

  private readStoredItems(): CartItem[] {
    if (!this.isBrowser) {
      return [];
    }

    try {
      const rawItems = localStorage.getItem(CART_STORAGE_KEY);
      return rawItems ? (JSON.parse(rawItems) as CartItem[]) : [];
    } catch {
      return [];
    }
  }

  private storeItems(items: CartItem[]): void {
    if (!this.isBrowser) {
      return;
    }

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }

  private parsePrice(price: string): number {
    const value = Number.parseInt(price.replace(/\D/g, ''), 10);
    return Number.isNaN(value) ? 0 : value;
  }
}

