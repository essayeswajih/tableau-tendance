import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SettingsService } from '../../../shared/settings.service';
import { ClientProfile } from '../dashboard.models';

@Component({
  imports: [DatePipe, ReactiveFormsModule],
  selector: 'app-dashboard-clients-page',
  styleUrl: './clients.page.scss',
  templateUrl: './clients.page.html',
})
export class DashboardClientsPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly settingsService = inject(SettingsService);
  protected readonly clients = signal<ClientProfile[]>([]);
  protected readonly clientsError = signal('');
  protected readonly clientsSuccess = signal('');
  protected readonly searchTerm = signal('');
  protected readonly selectedClientIds = signal<string[]>([]);
  protected readonly currentPage = signal(1);
  protected readonly pageSize = 10;
  protected readonly mergeForm = this.fb.nonNullable.group({
    display_name: [''],
    notes: [''],
  });
  protected readonly editMergeForm = this.fb.nonNullable.group({
    display_name: ['', [Validators.required]],
    notes: [''],
  });
  protected readonly editingMergeId = signal<number | null>(null);
  protected readonly filteredClients = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    return this.clients().filter((client) => {
      if (!query) {
        return true;
      }
      return [
        client.display_name,
        client.phones.join(' '),
        client.raw_phones.join(' '),
        client.addresses.join(' '),
        client.services.join(' '),
        client.products.join(' '),
        client.notes || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  });
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredClients().length / this.pageSize)),
  );
  protected readonly paginatedClients = computed(() => {
    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * this.pageSize;
    return this.filteredClients().slice(start, start + this.pageSize);
  });
  protected readonly selectedClients = computed(() => {
    const selectedIds = new Set(this.selectedClientIds());
    return this.clients().filter((client) => selectedIds.has(client.id));
  });
  protected readonly selectedPhones = computed(() =>
    [...new Set(this.selectedClients().flatMap((client) => client.phones))],
  );

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.settingsService.loadSettings();
    this.loadClients();
  }

  protected loadClients(): void {
    this.clientsError.set('');
    this.http.get<ClientProfile[]>('/api/clients').subscribe({
      next: (clients) => this.clients.set(clients),
      error: () => this.clientsError.set('Impossible de charger les clients.'),
    });
  }

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  protected toggleClientSelection(client: ClientProfile): void {
    this.selectedClientIds.update((ids) =>
      ids.includes(client.id) ? ids.filter((id) => id !== client.id) : [...ids, client.id],
    );
  }

  protected isClientSelected(client: ClientProfile): boolean {
    return this.selectedClientIds().includes(client.id);
  }

  protected mergeSelectedClients(): void {
    if (this.selectedPhones().length < 2) {
      this.clientsError.set('Selectionnez au moins deux numeros differents.');
      return;
    }

    const payload = {
      phones: this.selectedPhones(),
      display_name: this.mergeForm.getRawValue().display_name || null,
      notes: this.mergeForm.getRawValue().notes || null,
    };

    this.http.post<ClientProfile[]>('/api/clients/merge', payload).subscribe({
      next: (clients) => {
        this.clients.set(clients);
        this.selectedClientIds.set([]);
        this.mergeForm.reset({ display_name: '', notes: '' });
        this.clientsSuccess.set('Clients fusionnes avec succes.');
        this.clientsError.set('');
      },
      error: () => this.clientsError.set('Impossible de fusionner ces clients.'),
    });
  }

  protected startEditMerge(client: ClientProfile): void {
    if (!client.merge_id) {
      return;
    }
    this.editingMergeId.set(client.merge_id);
    this.editMergeForm.reset({
      display_name: client.display_name,
      notes: client.notes || '',
    });
  }

  protected saveMergeDetails(): void {
    const mergeId = this.editingMergeId();
    if (!mergeId || this.editMergeForm.invalid) {
      this.editMergeForm.markAllAsTouched();
      return;
    }
    this.http
      .patch<ClientProfile[]>(`/api/clients/merges/${mergeId}`, this.editMergeForm.getRawValue())
      .subscribe({
        next: (clients) => {
          this.clients.set(clients);
          this.editingMergeId.set(null);
          this.clientsSuccess.set('Client mis a jour.');
          this.clientsError.set('');
        },
        error: () => this.clientsError.set('Impossible de mettre a jour ce client.'),
      });
  }

  protected splitMergedClient(client: ClientProfile): void {
    if (!client.merge_id) {
      return;
    }
    this.http.delete<ClientProfile[]>(`/api/clients/merges/${client.merge_id}`).subscribe({
      next: (clients) => {
        this.clients.set(clients);
        this.clientsSuccess.set('Fusion annulee.');
        this.clientsError.set('');
      },
      error: () => this.clientsError.set('Impossible d annuler cette fusion.'),
    });
  }

  protected goToPreviousPage(): void {
    this.currentPage.update((page) => Math.max(1, page - 1));
  }

  protected goToNextPage(): void {
    this.currentPage.update((page) => Math.min(this.totalPages(), page + 1));
  }
}
