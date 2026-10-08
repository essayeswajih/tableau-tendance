import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { ContactMessage, MessageStatus } from '../dashboard.models';

const messageStatusOptions: { value: MessageStatus; label: string }[] = [
  { value: 'nouveau', label: 'Nouveau' },
  { value: 'lu', label: 'Lu' },
  { value: 'repondu', label: 'Repondu' },
  { value: 'archive', label: 'Archive' },
];

@Component({
  imports: [DatePipe],
  selector: 'app-dashboard-messages-page',
  styleUrl: './messages.page.scss',
  templateUrl: './messages.page.html',
})
export class DashboardMessagesPage implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly messages = signal<ContactMessage[]>([]);
  protected readonly messagesError = signal('');
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<'all' | MessageStatus>('all');
  protected readonly currentPage = signal(1);
  protected readonly pageSize = 10;
  protected readonly statusOptions = messageStatusOptions;
  protected readonly filteredMessages = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();

    return this.messages().filter((message) => {
      const matchesQuery =
        !query ||
        [
          message.customer_name,
          message.customer_phone,
          message.customer_email || '',
          message.subject,
          message.message,
          this.statusLabel(message.status),
        ]
          .join(' ')
          .toLowerCase()
          .includes(query);
      const matchesStatus = status === 'all' || message.status === status;
      return matchesQuery && matchesStatus;
    });
  });
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredMessages().length / this.pageSize)),
  );
  protected readonly paginatedMessages = computed(() => {
    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * this.pageSize;
    return this.filteredMessages().slice(start, start + this.pageSize);
  });

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.loadMessages();
  }

  protected loadMessages(): void {
    this.messagesError.set('');
    this.http.get<ContactMessage[]>('/api/messages').subscribe({
      next: (messages) => this.messages.set(messages),
      error: () => this.messagesError.set('Impossible de charger les messages.'),
    });
  }

  protected statusLabel(status: MessageStatus): string {
    return this.statusOptions.find((option) => option.value === status)?.label || status;
  }

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  protected updateStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as 'all' | MessageStatus);
    this.currentPage.set(1);
  }

  protected goToPreviousPage(): void {
    this.currentPage.update((page) => Math.max(1, page - 1));
  }

  protected goToNextPage(): void {
    this.currentPage.update((page) => Math.min(this.totalPages(), page + 1));
  }

  protected updateMessageStatus(message: ContactMessage, event: Event): void {
    const status = (event.target as HTMLSelectElement).value as MessageStatus;
    this.http.patch<ContactMessage>(`/api/messages/${message.id}/status`, { status }).subscribe({
      next: (updatedMessage) => {
        this.messages.update((messages) =>
          messages.map((item) => (item.id === updatedMessage.id ? updatedMessage : item)),
        );
      },
      error: () => this.messagesError.set('Impossible de modifier le statut du message.'),
    });
  }

  protected archiveMessage(message: ContactMessage): void {
    this.http.delete(`/api/messages/${message.id}`).subscribe({
      next: () => {
        this.messages.update((messages) =>
          messages.map((item) =>
            item.id === message.id ? { ...item, status: 'archive' as MessageStatus } : item,
          ),
        );
      },
      error: () => this.messagesError.set('Impossible d archiver ce message.'),
    });
  }
}
