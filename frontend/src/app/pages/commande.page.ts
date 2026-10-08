import { HttpClient } from '@angular/common/http';
import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Service } from '../shared/catalog-data';
import { CollectionService } from '../shared/collection.service';
import { SettingsService } from '../shared/settings.service';

interface OrderDate {
  label: string;
  value: string;
  isoDate: string;
  disabled: boolean;
}

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-commande-page',
  styleUrl: './commande.page.scss',
  templateUrl: './commande.page.html',
})
export class CommandePage implements OnInit {
  private readonly fb = inject(FormBuilder);
  protected readonly settingsService = inject(SettingsService);
  private readonly collectionService = inject(CollectionService);
  private readonly apiUrl = '/api';

  protected readonly collections = this.collectionService.collections;
  protected readonly dates = computed(() => this.createAvailableDates());
  protected readonly times = computed(() => this.createAvailableTimes());

  protected readonly selectedCollection = signal<Service | null>(null);
  protected readonly selectedDate = signal<OrderDate | null>(null);
  protected readonly selectedTime = signal('');
  protected readonly currentStep = signal(1);
  protected readonly isSubmitting = signal(false);
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');
  protected readonly steps = ['Tableau', 'Livraison', 'Moment', 'Informations', 'Confirmation'];
  protected readonly form = this.fb.nonNullable.group({
    customer_name: ['', [Validators.required, Validators.minLength(2)]],
    customer_phone: ['', [Validators.required, Validators.minLength(6)]],
    customer_email: ['', [Validators.email]],
    notes: [''],
  });
  protected readonly summary = computed(() => ({
    collection: this.selectedCollection()?.title || 'Reference a choisir',
    date: this.selectedDate()?.value || '-',
    time: this.selectedTime(),
    availability: this.selectedCollection()?.duration || '-',
    price: this.selectedCollection()?.price || '-',
  }));

  constructor(private readonly http: HttpClient) {
    effect(() => {
      const availableCollections = this.collections();
      if (!this.selectedCollection() && availableCollections.length > 0) {
        this.selectedCollection.set(availableCollections[0]);
      }
    });
    effect(() => {
      const availableDates = this.dates();
      const firstOpenDate = availableDates.find((date) => !date.disabled) || null;
      if (
        (!this.selectedDate() || this.selectedDate()?.disabled) &&
        firstOpenDate
      ) {
        this.selectedDate.set(firstOpenDate);
      }
      const availableTimes = this.times();
      if (!this.selectedTime() && availableTimes.length > 0) {
        this.selectedTime.set(availableTimes[0]);
      }
    });
  }

  ngOnInit(): void {
    this.settingsService.loadSettings();
    this.collectionService.loadCollections();
  }

  selectCollection(collection: Service): void {
    this.selectedCollection.set(collection);
  }

  selectDate(date: OrderDate): void {
    if (!date.disabled) {
      this.selectedDate.set(date);
      this.selectedTime.set(this.times()[0] || '');
    }
  }

  selectTime(time: string): void {
    this.selectedTime.set(time);
  }

  goToStep(step: number): void {
    this.currentStep.set(Math.min(Math.max(step, 1), this.steps.length));
  }

  nextStep(): void {
    if (this.currentStep() === 4 && this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.goToStep(this.currentStep() + 1);
  }

  goToNextStep(): void {
    this.nextStep();
  }

  previousStep(): void {
    this.goToStep(this.currentStep() - 1);
  }

  submitOrder(): void {
    if (
      this.form.invalid ||
      this.isSubmitting() ||
      !this.settingsService.settings().reservation.reservations_enabled ||
      !this.selectedDate() ||
      !this.selectedTime()
    ) {
      this.form.markAllAsTouched();
      this.currentStep.set(4);
      return;
    }

    this.isSubmitting.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    const formValue = this.form.getRawValue();
    const orderTime = `${this.selectedDate()?.isoDate}T${this.selectedTime()}:00`;
    const notes = [
      formValue.notes.trim(),
      formValue.customer_email ? `Email: ${formValue.customer_email}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    this.http
      .post(`${this.apiUrl}/reservations`, {
        customer_name: formValue.customer_name,
        customer_phone: formValue.customer_phone,
        service: this.selectedCollection()?.title || 'Reference non precise',
        reservation_time: orderTime,
        notes: notes || null,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.successMessage.set(this.settingsService.settings().reservation.confirmation_message);
          this.form.reset();
          this.currentStep.set(5);
        },
        error: () => {
          this.isSubmitting.set(false);
          this.errorMessage.set('Impossible d envoyer la demande pour le moment.');
        },
      });
  }

  private createAvailableDates(): OrderDate[] {
    const formatter = new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
    });
    const weekdayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' });

    return Array.from({ length: 5 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() + index);
      const isoDate = date.toISOString().slice(0, 10);
      const weekday = weekdayFormatter.format(date);
      const configuredDay = this.settingsService
        .settings()
        .opening_hours.find((hour) => hour.day.toLowerCase() === weekday.toLowerCase());
      return {
        label: index === 0 ? "Aujourd'hui" : index === 1 ? 'Demain' : weekday,
        value: formatter.format(date),
        isoDate,
        disabled: !configuredDay?.is_open,
      };
    });
  }

  private createAvailableTimes(): string[] {
    const selectedDate = this.selectedDate() || this.dates()[0];
    if (!selectedDate) {
      return [];
    }
    const date = new Date(`${selectedDate.isoDate}T12:00:00`);
    const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(date).toLowerCase();
    const hour = this.settingsService
      .settings()
      .opening_hours.find((item) => item.day.toLowerCase() === weekday);
    if (!hour?.is_open) {
      return [];
    }

    const duration = this.settingsService.settings().reservation.slot_duration_minutes;
    const [openHour, openMinute] = hour.opens_at.split(':').map(Number);
    const [closeHour, closeMinute] = hour.closes_at.split(':').map(Number);
    const start = openHour * 60 + openMinute;
    const end = closeHour * 60 + closeMinute;
    const times: string[] = [];
    for (let minute = start; minute < end; minute += duration) {
      const hh = Math.floor(minute / 60).toString().padStart(2, '0');
      const mm = (minute % 60).toString().padStart(2, '0');
      times.push(`${hh}:${mm}`);
    }
    return times;
  }
}
