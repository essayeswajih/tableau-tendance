import { DatePipe, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Reservation, ReservationStatus } from '../dashboard.models';
import { reservationStatusLabel, reservationStatusOptions } from '../dashboard-options';

@Component({
  imports: [DatePipe],
  selector: 'app-dashboard-reservations-page',
  styleUrl: './reservations.page.scss',
  templateUrl: './reservations.page.html',
})
export class DashboardReservationsPage implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly reservations = signal<Reservation[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly reservationsError = signal('');
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<'all' | ReservationStatus>('all');
  protected readonly serviceFilter = signal('all');
  protected readonly currentPage = signal(1);
  protected readonly pageSize = 10;
  protected readonly statusOptions = reservationStatusOptions;
  protected readonly uniqueServices = computed(() =>
    [...new Set(this.reservations().map((reservation) => reservation.service))].sort(),
  );
  protected readonly filteredReservations = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    const service = this.serviceFilter();

    return this.reservations().filter((reservation) => {
      const matchesQuery =
        !query ||
        [
          reservation.customer_name,
          reservation.customer_phone,
          reservation.service,
          reservation.notes || '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(query);
      const matchesStatus = status === 'all' || reservation.status === status;
      const matchesService = service === 'all' || reservation.service === service;
      return matchesQuery && matchesStatus && matchesService;
    });
  });
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredReservations().length / this.pageSize)),
  );
  protected readonly paginatedReservations = computed(() => {
    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * this.pageSize;
    return this.filteredReservations().slice(start, start + this.pageSize);
  });

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.loadReservations();
  }

  protected loadReservations(): void {
    this.isLoading.set(true);
    this.reservationsError.set('');

    this.http.get<Reservation[]>('/api/reservations').subscribe({
      next: (reservations) => {
        this.reservations.set(reservations);
        this.isLoading.set(false);
      },
      error: () => {
        this.reservationsError.set('Impossible de charger les reservations.');
        this.isLoading.set(false);
      },
    });
  }

  protected statusLabel(status: ReservationStatus): string {
    return reservationStatusLabel(status);
  }

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  protected updateStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as 'all' | ReservationStatus);
    this.currentPage.set(1);
  }

  protected updateServiceFilter(event: Event): void {
    this.serviceFilter.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  protected goToPreviousPage(): void {
    this.currentPage.update((page) => Math.max(1, page - 1));
  }

  protected goToNextPage(): void {
    this.currentPage.update((page) => Math.min(this.totalPages(), page + 1));
  }

  protected updateReservationStatus(reservation: Reservation, event: Event): void {
    const status = (event.target as HTMLSelectElement).value as ReservationStatus;
    this.http.patch<Reservation>(`/api/reservations/${reservation.id}/status`, { status }).subscribe({
      next: (updatedReservation) => {
        this.reservations.update((reservations) =>
          reservations.map((item) =>
            item.id === updatedReservation.id ? updatedReservation : item,
          ),
        );
      },
      error: () => this.reservationsError.set('Impossible de modifier le statut.'),
    });
  }
}
