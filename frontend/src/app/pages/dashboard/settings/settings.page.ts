import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { orderStatusOptions } from '../dashboard-options';
import { SiteSettings } from '../dashboard.models';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-dashboard-settings-page',
  styleUrl: './settings.page.scss',
  templateUrl: './settings.page.html',
})
export class DashboardSettingsPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly orderStatusOptions = orderStatusOptions;
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly settingsError = signal('');
  protected readonly settingsSuccess = signal('');
  protected readonly settingsForm = this.fb.nonNullable.group({
    salon_info: this.fb.nonNullable.group({
      salon_name: ['', [Validators.required]],
      phone: [''],
      whatsapp: [''],
      address: [''],
      email: ['', [Validators.email]],
      instagram: [''],
      facebook: [''],
    }),
    opening_hours: this.fb.array([
      this.createOpeningHourGroup('Lundi'),
      this.createOpeningHourGroup('Mardi'),
      this.createOpeningHourGroup('Mercredi'),
      this.createOpeningHourGroup('Jeudi'),
      this.createOpeningHourGroup('Vendredi'),
      this.createOpeningHourGroup('Samedi'),
      this.createOpeningHourGroup('Dimanche', false),
    ]),
    commande: this.fb.nonNullable.group({
      commandes_enabled: [true],
      slot_duration_minutes: [30, [Validators.required, Validators.min(5), Validators.max(240)]],
      max_commandes_per_slot: [1, [Validators.required, Validators.min(1), Validators.max(50)]],
      min_advance_hours: [2, [Validators.required, Validators.min(0), Validators.max(720)]],
      confirmation_message: [''],
    }),
    boutique: this.fb.nonNullable.group({
      orders_enabled: [true],
      delivery_fee: [7, [Validators.required, Validators.min(0)]],
      free_delivery_threshold: [150, [Validators.required, Validators.min(0)]],
      default_order_status: ['nouvelle', [Validators.required]],
      currency: ['DT', [Validators.required]],
      payment_note: [''],
    }),
    dashboard: this.fb.nonNullable.group({
      default_dashboard_tab: ['commandes', [Validators.required]],
      items_per_page: [10, [Validators.required, Validators.min(5), Validators.max(100)]],
      show_stats_cards: [true],
    }),
    branding: this.fb.nonNullable.group({
      logo_url: ['/uploads/tableau-tendance-logo.png'],
      primary_color: ['#8f2d3d', [Validators.required, Validators.pattern(/^#[0-9a-fA-F]{6}$/)]],
      hero_image_url: ['/uploads/tableau-hero.png'],
      short_description: [''],
    }),
  });

  constructor(private readonly http: HttpClient) {}

  protected get openingHours(): FormArray {
    return this.settingsForm.controls.opening_hours;
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.loadSettings();
  }

  protected loadSettings(): void {
    this.isLoading.set(true);
    this.settingsError.set('');
    this.http.get<SiteSettings>('/api/settings').subscribe({
      next: (settings) => {
        this.patchSettings(settings);
        this.isLoading.set(false);
      },
      error: () => {
        this.settingsError.set('Impossible de charger les parametres.');
        this.isLoading.set(false);
      },
    });
  }

  protected saveSettings(): void {
    if (this.settingsForm.invalid || this.isSaving()) {
      this.settingsForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.settingsError.set('');
    this.settingsSuccess.set('');
    this.http.put<SiteSettings>('/api/settings', this.settingsForm.getRawValue()).subscribe({
      next: (settings) => {
        this.patchSettings(settings);
        this.settingsSuccess.set('Parametres sauvegardes.');
        this.isSaving.set(false);
      },
      error: () => {
        this.settingsError.set('Impossible de sauvegarder les parametres.');
        this.isSaving.set(false);
      },
    });
  }

  private createOpeningHourGroup(day: string, isOpen = true) {
    return this.fb.nonNullable.group({
      day: [day, [Validators.required]],
      is_open: [isOpen],
      opens_at: ['09:00', [Validators.required]],
      closes_at: ['18:00', [Validators.required]],
    });
  }

  private patchSettings(settings: SiteSettings): void {
    this.openingHours.clear();
    for (const hour of settings.opening_hours) {
      this.openingHours.push(
        this.fb.nonNullable.group({
          day: [hour.day, [Validators.required]],
          is_open: [hour.is_open],
          opens_at: [hour.opens_at, [Validators.required]],
          closes_at: [hour.closes_at, [Validators.required]],
        }),
      );
    }
    this.settingsForm.patchValue(settings);
  }
}

