import { DatePipe, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Order, OrderStatus } from '../dashboard.models';
import { orderStatusLabel, orderStatusOptions } from '../dashboard-options';

@Component({
  imports: [DatePipe],
  selector: 'app-dashboard-orders-page',
  styleUrl: './orders.page.scss',
  templateUrl: './orders.page.html',
})
export class DashboardOrdersPage implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly orders = signal<Order[]>([]);
  protected readonly ordersError = signal('');
  protected readonly orderSearchTerm = signal('');
  protected readonly orderStatusFilter = signal<'all' | OrderStatus>('all');
  protected readonly orderCurrentPage = signal(1);
  protected readonly orderPageSize = 10;
  protected readonly orderStatusOptions = orderStatusOptions;
  protected readonly filteredOrders = computed(() => {
    const query = this.orderSearchTerm().trim().toLowerCase();
    const status = this.orderStatusFilter();

    return this.orders().filter((order) => {
      const productText = order.items
        .map((item) => [item.title, item.category, item.quantity, item.unitPrice].join(' '))
        .join(' ');
      const matchesQuery =
        !query ||
        [
          order.customer_name,
          order.customer_phone,
          order.delivery_address,
          order.total,
          this.orderStatusLabel(order.status),
          productText,
        ]
          .join(' ')
          .toLowerCase()
          .includes(query);
      const matchesStatus = status === 'all' || order.status === status;
      return matchesQuery && matchesStatus;
    });
  });
  protected readonly orderTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredOrders().length / this.orderPageSize)),
  );
  protected readonly paginatedOrders = computed(() => {
    const page = Math.min(this.orderCurrentPage(), this.orderTotalPages());
    const start = (page - 1) * this.orderPageSize;
    return this.filteredOrders().slice(start, start + this.orderPageSize);
  });

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.loadOrders();
  }

  protected loadOrders(): void {
    this.ordersError.set('');
    this.http.get<Order[]>('/api/orders').subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.orderCurrentPage.set(Math.min(this.orderCurrentPage(), this.orderTotalPages()));
      },
      error: () => this.ordersError.set('Impossible de charger les commandes.'),
    });
  }

  protected orderStatusLabel(status: OrderStatus): string {
    return orderStatusLabel(status);
  }

  protected orderItemsLabel(order: Order): string {
    return order.items.map((item) => `${item.quantity} x ${item.title}`).join(', ');
  }

  protected updateOrderSearch(event: Event): void {
    this.orderSearchTerm.set((event.target as HTMLInputElement).value);
    this.orderCurrentPage.set(1);
  }

  protected updateOrderStatusFilter(event: Event): void {
    this.orderStatusFilter.set((event.target as HTMLSelectElement).value as 'all' | OrderStatus);
    this.orderCurrentPage.set(1);
  }

  protected goToPreviousOrderPage(): void {
    this.orderCurrentPage.update((page) => Math.max(1, page - 1));
  }

  protected goToNextOrderPage(): void {
    this.orderCurrentPage.update((page) => Math.min(this.orderTotalPages(), page + 1));
  }

  protected updateOrderStatus(order: Order, event: Event): void {
    const status = (event.target as HTMLSelectElement).value as OrderStatus;
    this.http.patch<Order>(`/api/orders/${order.id}/status`, { status }).subscribe({
      next: (updatedOrder) => {
        this.orders.update((orders) =>
          orders.map((item) => (item.id === updatedOrder.id ? updatedOrder : item)),
        );
      },
      error: () => this.ordersError.set('Impossible de modifier le statut de la commande.'),
    });
  }
}
