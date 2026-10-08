import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import type { SiteSettings } from '../pages/dashboard/dashboard.models';

const DEFAULT_SETTINGS: SiteSettings = {
  salon_info: {
    salon_name: 'Tableau Tendance',
    phone: '+216 00 000 000',
    whatsapp: '+216 00 000 000',
    address: 'Tunis, Tunisie',
    email: 'contact@tableautendance.tn',
    instagram: 'https://instagram.com/tableautendance',
    facebook: 'https://facebook.com/tableautendance',
  },
  opening_hours: [
    { day: 'Lundi', is_open: true, opens_at: '09:00', closes_at: '18:00' },
    { day: 'Mardi', is_open: true, opens_at: '09:00', closes_at: '18:00' },
    { day: 'Mercredi', is_open: true, opens_at: '09:00', closes_at: '18:00' },
    { day: 'Jeudi', is_open: true, opens_at: '09:00', closes_at: '18:00' },
    { day: 'Vendredi', is_open: true, opens_at: '09:00', closes_at: '18:00' },
    { day: 'Samedi', is_open: true, opens_at: '09:00', closes_at: '18:00' },
    { day: 'Dimanche', is_open: false, opens_at: '09:00', closes_at: '18:00' },
  ],
  reservation: {
    reservations_enabled: true,
    slot_duration_minutes: 30,
    max_reservations_per_slot: 1,
    min_advance_hours: 2,
    confirmation_message:
      'Votre commande a ete envoyee. Nous vous contacterons pour confirmer la livraison.',
  },
  boutique: {
    orders_enabled: true,
    delivery_fee: 7,
    free_delivery_threshold: 120,
    default_order_status: 'nouvelle',
    currency: 'DT',
    payment_note: 'Paiement a la livraison.',
  },
  dashboard: {
    default_dashboard_tab: 'overview',
    items_per_page: 10,
    show_stats_cards: true,
  },
  branding: {
    logo_url: '/uploads/tableau-tendance-logo.png',
    primary_color: '#c89b4b',
    hero_image_url: '/uploads/tableau-hero.png',
    short_description: 'Tableaux decoratifs modernes avec livraison partout en Tunisie.',
  },
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly settingsSignal = signal<SiteSettings>(DEFAULT_SETTINGS);
  private readonly hasLoaded = signal(false);

  readonly settings = this.settingsSignal.asReadonly();
  readonly currency = computed(() => this.settings().boutique.currency || 'DT');
  readonly todayHours = computed(() => this.hoursForDate(new Date()));
  readonly todayHoursLabel = computed(() => this.hoursLabel(this.todayHours()));
  readonly isOpenToday = computed(() => Boolean(this.todayHours()?.is_open));
  readonly phoneHref = computed(() => `tel:${this.compactPhone(this.settings().salon_info.phone)}`);
  readonly whatsappHref = computed(
    () => `https://wa.me/${this.compactPhone(this.settings().salon_info.whatsapp).replace('+', '')}`,
  );

  loadSettings(): void {
    if (!isPlatformBrowser(this.platformId) || this.hasLoaded()) {
      return;
    }

    this.http.get<SiteSettings>('/api/settings').subscribe({
      next: (settings) => {
        this.settingsSignal.set(settings);
        this.applyBranding(settings);
        this.hasLoaded.set(true);
      },
      error: () => this.hasLoaded.set(true),
    });
  }

  formatMoney(value: number): string {
    return `${value} ${this.currency()}`;
  }

  hoursLabel(hour: { is_open: boolean; opens_at: string; closes_at: string } | undefined): string {
    if (!hour || !hour.is_open) {
      return 'Ferme';
    }
    return `${hour.opens_at} - ${hour.closes_at}`;
  }

  private hoursForDate(date: Date) {
    const day = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(date).toLowerCase();
    return this.settings().opening_hours.find((hour) => hour.day.toLowerCase() === day);
  }

  private compactPhone(phone: string): string {
    return phone.replace(/[^\d+]/g, '');
  }

  private applyBranding(settings: SiteSettings): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.style.setProperty('--primary', settings.branding.primary_color);
  }
}

