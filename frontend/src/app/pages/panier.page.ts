import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartService } from '../shared/cart.service';
import { SettingsService } from '../shared/settings.service';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-panier-page',
  styleUrl: './panier.page.scss',
  templateUrl: './panier.page.html',
})
export class PanierPage {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly cart = inject(CartService);
  protected readonly settingsService = inject(SettingsService);
  protected readonly isCheckoutModalOpen = signal(false);
  protected readonly isSubmittingOrder = signal(false);
  protected readonly orderError = signal('');
  protected readonly orderSuccess = signal('');
  protected readonly items = this.cart.items;
  protected readonly subtotal = this.cart.subtotal;
  protected readonly deliveryFee = this.cart.deliveryFee;
  protected readonly total = this.cart.total;
  protected readonly itemCount = this.cart.itemCount;
  protected readonly checkoutForm = this.fb.nonNullable.group({
    nom: ['', [Validators.required, Validators.minLength(2)]],
    prenom: ['', [Validators.required, Validators.minLength(2)]],
    adresse: ['', [Validators.required, Validators.minLength(5)]],
    telephone: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    this.settingsService.loadSettings();
  }

  protected decreaseQuantity(title: string): void {
    this.cart.decreaseQuantity(title);
  }

  protected increaseQuantity(title: string): void {
    this.cart.increaseQuantity(title);
  }

  protected removeItem(title: string): void {
    this.cart.removeItem(title);
  }

  protected openCheckoutModal(): void {
    this.orderError.set('');
    this.orderSuccess.set('');
    this.isCheckoutModalOpen.set(true);
  }

  protected closeCheckoutModal(): void {
    this.isCheckoutModalOpen.set(false);
  }

  protected submitOrder(): void {
    if (
      this.checkoutForm.invalid ||
      this.isSubmittingOrder() ||
      this.items().length === 0 ||
      !this.settingsService.settings().boutique.orders_enabled
    ) {
      this.checkoutForm.markAllAsTouched();
      return;
    }

    const formValue = this.checkoutForm.getRawValue();
    const payload = {
      customer_name: `${formValue.prenom} ${formValue.nom}`.trim(),
      customer_phone: formValue.telephone,
      delivery_address: formValue.adresse,
      items: this.items(),
      subtotal: this.subtotal(),
      delivery_fee: this.deliveryFee(),
      total: this.total(),
      notes: null,
    };

    this.isSubmittingOrder.set(true);
    this.orderError.set('');

    this.http.post('/api/orders', payload).subscribe({
      next: () => {
        this.cart.clear();
        this.checkoutForm.reset();
        this.isSubmittingOrder.set(false);
        this.orderSuccess.set('Commande envoyee avec succes. Nous vous contacterons pour confirmer.');
        window.setTimeout(() => this.closeCheckoutModal(), 1200);
      },
      error: () => {
        this.isSubmittingOrder.set(false);
        this.orderError.set('Impossible de finaliser la commande. Verifiez vos informations.');
      },
    });
  }
}
