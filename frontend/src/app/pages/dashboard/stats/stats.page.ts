import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { ClientProfile, ContactMessage, Order, OrderStatus, Reservation, ReservationStatus } from '../dashboard.models';

interface StatusSlice {
  label: string;
  value: number;
  percent: number;
  className: string;
}

interface TrendDay {
  label: string;
  reservations: number;
  orders: number;
  revenue: number;
  max: number;
}

interface RankedItem {
  label: string;
  value: number;
  percent: number;
}

interface ActivityItem {
  label: string;
  detail: string;
  date: string;
  kind: 'reservation' | 'order' | 'message';
}

@Component({
  selector: 'app-dashboard-stats-page',
  styleUrl: './stats.page.scss',
  templateUrl: './stats.page.html',
})
export class DashboardStatsPage implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly reservations = signal<Reservation[]>([]);
  protected readonly orders = signal<Order[]>([]);
  protected readonly messages = signal<ContactMessage[]>([]);
  protected readonly clients = signal<ClientProfile[]>([]);
  protected readonly overviewError = signal('');

  protected readonly pendingReservationsCount = computed(
    () => this.reservations().filter((reservation) => reservation.status === 'en_attente').length,
  );
  protected readonly pendingOrdersCount = computed(
    () => this.orders().filter((order) => order.status === 'nouvelle').length,
  );
  protected readonly unreadMessagesCount = computed(
    () => this.messages().filter((message) => message.status === 'nouveau').length,
  );
  protected readonly deliveredOrdersCount = computed(
    () => this.orders().filter((order) => order.status === 'livree').length,
  );
  protected readonly totalRevenue = computed(() =>
    this.orders()
      .filter((order) => order.status !== 'annulee')
      .reduce((sum, order) => sum + Number(order.total || 0), 0),
  );
  protected readonly averageOrderValue = computed(() => {
    const billableOrders = this.orders().filter((order) => order.status !== 'annulee');
    return billableOrders.length ? this.totalRevenue() / billableOrders.length : 0;
  });
  protected readonly reservationStatusSlices = computed(() =>
    this.buildStatusSlices(this.reservations(), {
      en_attente: 'En attente',
      confirme: 'Confirmees',
      annulee: 'Annulees',
      autre_horaire: 'Autre horaire',
    }),
  );
  protected readonly orderStatusSlices = computed(() =>
    this.buildStatusSlices(this.orders(), {
      nouvelle: 'Nouvelles',
      confirmee: 'Confirmees',
      en_preparation: 'Preparation',
      livree: 'Livrees',
      annulee: 'Annulees',
    }),
  );
  protected readonly weeklyTrend = computed(() => {
    const days = this.lastDays(7);
    return days.map((day) => {
      const reservations = this.reservations().filter((reservation) =>
        this.isSameDay(reservation.reservation_time, day.date),
      ).length;
      const dayOrders = this.orders().filter((order) => this.isSameDay(order.created_at, day.date));
      const orders = dayOrders.length;
      const revenue = dayOrders
        .filter((order) => order.status !== 'annulee')
        .reduce((sum, order) => sum + Number(order.total || 0), 0);

      return {
        label: day.label,
        reservations,
        orders,
        revenue,
        max: Math.max(reservations, orders, 1),
      };
    });
  });
  protected readonly topServices = computed(() =>
    this.rankValues(this.reservations().map((reservation) => reservation.service), 5),
  );
  protected readonly topProducts = computed(() =>
    this.rankValues(
      this.orders().flatMap((order) => order.items.flatMap((item) => Array(item.quantity).fill(item.title))),
      5,
    ),
  );
  protected readonly recentActivity = computed<ActivityItem[]>(() => {
    const reservations = this.reservations().map((reservation) => ({
      label: reservation.customer_name,
      detail: `Reservation ${reservation.service} - ${this.formatStatus(reservation.status)}`,
      date: reservation.created_at || reservation.reservation_time,
      kind: 'reservation' as const,
    }));
    const orders = this.orders().map((order) => ({
      label: order.customer_name,
      detail: `Commande ${this.formatCurrency(order.total)} - ${this.formatStatus(order.status)}`,
      date: order.created_at,
      kind: 'order' as const,
    }));
    const messages = this.messages().map((message) => ({
      label: message.customer_name,
      detail: `${message.subject} - ${this.formatStatus(message.status)}`,
      date: message.created_at,
      kind: 'message' as const,
    }));

    return [...reservations, ...orders, ...messages]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  });

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.http.get<Reservation[]>('/api/reservations').subscribe({
      next: (reservations) => this.reservations.set(reservations),
      error: () => this.setLoadError('reservations'),
    });
    this.http.get<Order[]>('/api/orders').subscribe({
      next: (orders) => this.orders.set(orders),
      error: () => this.setLoadError('commandes'),
    });
    this.http.get<ContactMessage[]>('/api/messages').subscribe({
      next: (messages) => this.messages.set(messages),
      error: () => this.setLoadError('messages'),
    });
    this.http.get<ClientProfile[]>('/api/clients').subscribe({
      next: (clients) => this.clients.set(clients),
      error: () => this.setLoadError('clients'),
    });
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-FR', {
      currency: 'TND',
      maximumFractionDigits: 0,
      style: 'currency',
    }).format(value || 0);
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
    }).format(new Date(value));
  }

  protected barHeight(value: number, max: number): number {
    return Math.max(8, Math.round((value / Math.max(max, 1)) * 100));
  }

  private buildStatusSlices<T extends { status: ReservationStatus | OrderStatus }>(
    items: T[],
    labels: Record<string, string>,
  ): StatusSlice[] {
    const total = Math.max(items.length, 1);

    return Object.entries(labels).map(([status, label]) => {
      const value = items.filter((item) => item.status === status).length;
      return {
        label,
        value,
        percent: Math.round((value / total) * 100),
        className: status.replace('_', '-'),
      };
    });
  }

  private rankValues(values: string[], limit: number): RankedItem[] {
    const counts = values.reduce<Record<string, number>>((acc, value) => {
      const label = value || 'Non precise';
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
    const max = Math.max(...Object.values(counts), 1);

    return Object.entries(counts)
      .sort(([, left], [, right]) => right - left)
      .slice(0, limit)
      .map(([label, value]) => ({
        label,
        value,
        percent: Math.round((value / max) * 100),
      }));
  }

  private lastDays(count: number): { date: Date; label: string }[] {
    return Array.from({ length: count }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (count - index - 1));
      return {
        date,
        label: new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date),
      };
    });
  }

  private isSameDay(value: string, day: Date): boolean {
    const date = new Date(value);
    return (
      date.getFullYear() === day.getFullYear() &&
      date.getMonth() === day.getMonth() &&
      date.getDate() === day.getDate()
    );
  }

  private formatStatus(status: string): string {
    return status.replace(/_/g, ' ');
  }

  private setLoadError(resource: string): void {
    this.overviewError.set(`Impossible de charger les ${resource}.`);
  }
}
